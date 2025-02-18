const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const bodyParser = require('body-parser');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Initialize Express
const app = express();

// Initialize Supabase
const supabaseUrl = 'https://oounmycsyfuqvzagiadh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vdW5teWNzeWZ1cXZ6YWdpYWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NjAzMTUsImV4cCI6MjA0ODAzNjMxNX0.cqxVFYCn7youkcsCvvIMVo4hD_HzUlgPoEEJCfckz-c';
const supabase = createClient(supabaseUrl, supabaseKey);

// Add body parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors({
    origin: '*', // Be more specific in production
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add logging middleware to debug request body
app.use((req, res, next) => {
    console.log('Request body:', req.body);
    next();
});

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Generate QR code for WhatsApp Web authentication
client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
    console.log('QR RECEIVED', qr);
});

client.on('ready', () => {
    console.log('Client is ready!');
});

// Initialize WhatsApp client
client.initialize();

// Function to check if number exists on WhatsApp
async function isWhatsAppUser(number) {
    try {
        let formattedNumber = number;
        if (!number.includes('@c.us')) {
            formattedNumber = `${number}@c.us`;
        }
        const contact = await client.getNumberId(formattedNumber);
        return contact !== null;
    } catch (error) {
        console.error('Error checking number:', error);
        return false;
    }
}

// Function to fetch all unique mobile numbers from registrations
async function fetchAllUniqueNumbers() {
    try {
        const { data, error } = await supabase
            .from('registrations')
            .select('mobile')
            .not('mobile', 'is', null);

        if (error) throw error;

        // Extract unique mobile numbers
        const uniqueNumbers = [...new Set(data.map(row => row.mobile))];
        console.log(`Found ${uniqueNumbers.length} unique mobile numbers`);
        return uniqueNumbers;
    } catch (error) {
        console.error('Error fetching numbers from Supabase:', error);
        return [];
    }
}

// Function to fetch pending numbers from Supabase
async function fetchPendingNumbers() {
    try {
        // First, get all numbers that have DONE status
        const { data: doneNumbers, error: doneError } = await supabase
            .from('registrations')
            .select('mobile')
            .eq('payment_status', 'DONE');

        if (doneError) throw doneError;

        // Create array of numbers with DONE status
        const doneNumbersArray = doneNumbers.map(row => row.mobile);

        // Now get all PENDING numbers that aren't in the DONE array and aren't from Narayanpur
        const { data: pendingNumbers, error: pendingError } = await supabase
            .from('registrations')
            .select('mobile')
            .eq('payment_status', 'PENDING')
            .neq('city', 'Narayanpur')
            .not('mobile', 'in', `(${doneNumbersArray.join(',')})`);

        if (pendingError) throw pendingError;

        // Extract unique mobile numbers
        const uniqueNumbers = [...new Set(pendingNumbers.map(row => row.mobile))];
        console.log(`Found ${uniqueNumbers.length} unique pending numbers`);
        return uniqueNumbers;
    } catch (error) {
        console.error('Error fetching numbers from Supabase:', error);
        return [];
    }
}

// Endpoint to check if number exists on WhatsApp
app.post('/check-number', async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        const exists = await isWhatsAppUser(phoneNumber);

        res.status(200).json({
            success: true,
            phoneNumber,
            isWhatsAppUser: exists
        });

    } catch (error) {
        console.error('Error checking number:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check number',
            error: error.message
        });
    }
});

// POST endpoint to send OTP
app.post('/send-otp', async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;

        if (!phoneNumber || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and OTP are required'
            });
        }

        const exists = await isWhatsAppUser(phoneNumber);
        if (!exists) {
            return res.status(400).json({
                success: false,
                message: 'This number is not registered on WhatsApp'
            });
        }

        let formattedNumber = phoneNumber;
        if (!phoneNumber.includes('@c.us')) {
            formattedNumber = `${phoneNumber}@c.us`;
        }

        const message = `Your OTP is: ${otp}\nPlease do not share this OTP with anyone.`;

        const response = await client.sendMessage(formattedNumber, message);

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            messageId: response.id
        });

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP',
            error: error.message
        });
    }
});

// Variables for message handling
let customMessage = '';
let waitingForMessage = false;
let waitingForForwardMessage = false;
const authorizedNumbers = ['919399880247@c.us', '919926685773@c.us'];

client.on('message', async (message) => {
    // Check if message is from authorized numbers
    if (authorizedNumbers.includes(message.from)) {
        const command = message.body.toLowerCase();

        if (command === 'startpendingspam') {
            waitingForMessage = true;
            waitingForForwardMessage = false;
            await client.sendMessage(message.from, 'Please send the message you want to broadcast to pending registrations.');
        } 
        else if (command === 'sendmessage') {
            waitingForForwardMessage = true;
            waitingForMessage = false;
            await client.sendMessage(message.from, 'Please send the message you want to forward to all registered users.');
        }
        else if (waitingForForwardMessage) {
            try {
                // Store media if present
                let mediaToSend = null;
                if (message.hasMedia) {
                    mediaToSend = await message.downloadMedia();
                }

                // Fetch all unique mobile numbers
                const numbers = await fetchAllUniqueNumbers();
                
                // Notify sender about starting the broadcast
                await client.sendMessage(
                    message.from,
                    `Starting to forward your message to ${numbers.length} unique registered users. This will take some time.`
                );

                let successCount = 0;
                let failureCount = 0;
                let failedNumbers = [];

                // Send to all numbers with 2-second delay
                for (const number of numbers) {
                    // Format the number
                    const formattedNumber = number.startsWith('91') ? 
                        `${number}@c.us` : `91${number}@c.us`;
                    
                    try {
                        if (mediaToSend) {
                            // Send media with caption
                            await client.sendMessage(formattedNumber, mediaToSend, {
                                caption: message.body || '',
                            });
                        } else {
                            // Send text-only message
                            await client.sendMessage(formattedNumber, message.body);
                        }
                        console.log(`Message forwarded to ${formattedNumber}`);
                        successCount++;
                    } catch (error) {
                        console.error(`Failed to forward message to ${formattedNumber}:`, error);
                        failureCount++;
                        failedNumbers.push(formattedNumber);
                    }

                    // Send progress update every 30 messages
                    if ((successCount + failureCount) % 30 === 0) {
                        await client.sendMessage(
                            message.from,
                            `Progress Update:\nSuccessful: ${successCount}\nFailed: ${failureCount}\nRemaining: ${numbers.length - (successCount + failureCount)}\n${failedNumbers.length > 0 ? `Failed numbers: ${failedNumbers.slice(-5).join(', ')}${failedNumbers.length > 5 ? ` and ${failedNumbers.length - 5} more` : ''}` : ''}`
                        );
                    }

                    // Wait for 2 seconds to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                // Send final status
                await client.sendMessage(
                    message.from,
                    `Broadcast Complete!\nTotal Numbers: ${numbers.length}\nSuccessful: ${successCount}\nFailed: ${failureCount}\n${failedNumbers.length > 0 ? `Failed numbers: ${failedNumbers.join(', ')}` : ''}`
                );
                
                waitingForForwardMessage = false;
            } catch (error) {
                console.error('Error in bulk forwarding:', error);
                await client.sendMessage(
                    message.from, 
                    'An error occurred during message forwarding. Please try again.'
                );
            }
        }
        else if (waitingForMessage) {
            // Handle startpendingspam message
            customMessage = message.body;
            waitingForMessage = false;
            console.log("Starting to send custom message to pending registrations...");

            // Fetch numbers from Supabase
            const numbers = await fetchPendingNumbers();
            console.log(`Found ${numbers.length} pending registrations`);

            // Send initial status
            await client.sendMessage(message.from, `Starting to send messages to ${numbers.length} numbers...`);

            let successCount = 0;
            let failureCount = 0;

            // Send message to all numbers
            for (const number of numbers) {
                const formattedNumber = `91${number}@c.us`;
                try {
                    await client.sendMessage(formattedNumber, customMessage);
                    console.log(`Message sent to ${formattedNumber}`);
                    successCount++;
                    // Add delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error(`Failed to send message to ${formattedNumber}:`, error);
                    failureCount++;
                }

                // Send progress update every 20 messages
                if ((successCount + failureCount) % 20 === 0) {
                    await client.sendMessage(message.from, 
                        `Progress Update:\nSuccessful: ${successCount}\nFailed: ${failureCount}\nRemaining: ${numbers.length - (successCount + failureCount)}`
                    );
                }
            }

            // Send final status
            await client.sendMessage(message.from, 
                `Broadcast Complete!\nTotal Numbers: ${numbers.length}\nSuccessful: ${successCount}\nFailed: ${failureCount}`
            );

            // Reset custom message
            customMessage = '';
        }
    }
});

// Route to send marathon message
app.post('/send-marathon-message', async (req, res) => {
    try {
        const { 
            phoneNumber, 
            raceCategory, 
            tShirtSize, 
            identificationNumber,
            firstName,
            lastName
        } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        const exists = await isWhatsAppUser(phoneNumber);
        if (!exists) {
            return res.status(400).json({
                success: false,
                message: 'This number is not registered on WhatsApp'
            });
        }

        let formattedNumber = phoneNumber;
        if (!phoneNumber.includes('@c.us')) {
            formattedNumber = `${phoneNumber}@c.us`;
        }

        const raceCategoryHindi = {
            '5KM': '5 किलोमीटर',
            '10KM': '10 किलोमीटर',
            '21KM': '21 किलोमीटर'
        }[raceCategory] || raceCategory;

        const message = `🏃‍♂🌟 आप अबूझमाड़ पीस हाफ मैराथन में सफलतापूर्वक पंजीकृत हो गए हैं! 🌟🏃‍♀  
तैयार हो जाइए, 02 मार्च को दौड़ने के लिए!  

आपके विवरण:  
👤 नाम: ${firstName} ${lastName}
🏃 रेस श्रेणी: ${raceCategoryHindi}
👕 टी-शर्ट साइज: ${tShirtSize}
🔢 पंजीकरण संख्या: ${identificationNumber}

अबूझमाड़ मैराथन के सभी अपडेट्स, घोषणाएं और यादगार पलों से जुड़े रहने के लिए हमें सोशल मीडिया पर फॉलो करें:  
📸 Instagram: [https://tinyurl.com/6re5awzx]  
👍 Facebook: [https://tinyurl.com/yc8mmmnr]  
🐦 X (Twitter): [https://tinyurl.com/788x6zjj]  
💬 WhatsApp ग्रुप: [https://tinyurl.com/2rzznut2]  
🌐 वेबसाइट: https://runabhujhmad.in/
📧 ईमेल: support@runabhujhmad.in  

आइए साथ मिलकर इस मैराथन को यादगार बनाएं! 🌟  
किसी भी जानकारी के लिए हमारी वेबसाइट पर जाएं या हमें ईमेल करें।  
"आओ मिलकर उठाए ये कदम, अबूझमाड को जोड़े हमारे संग"! 🏃‍♂🌟  
#अबूझमाड़मैराथन #RunAbhujhmad #साथचलेंगे #बेहतरकलकेलिए`;

        const response = await client.sendMessage(formattedNumber, message);

        res.status(200).json({
            success: true,
            message: 'Marathon information sent successfully',
            messageId: response.id
        });

    } catch (error) {
        console.error('Error sending marathon message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send marathon message',
            error: error.message
        });
    }
});

// SSL Certificate Options
const options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt')
};

// Start HTTPS server
const PORT = process.env.PORT || 3001;
https.createServer(options, app).listen(PORT, "0.0.0.0", () => {
    console.log(`HTTPS Server running on port ${PORT}`);
});