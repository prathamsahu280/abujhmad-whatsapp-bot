const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const bodyParser = require('body-parser');
const cors = require('cors');
const https = require('https');
const fs = require('fs');

// Initialize Express
const app = express();

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
        // Format number
        let formattedNumber = number;
        if (!number.includes('@c.us')) {
            formattedNumber = `${number}@c.us`;
        }
        
        // Get contact info
        const contact = await client.getNumberId(formattedNumber);
        return contact !== null;
    } catch (error) {
        console.error('Error checking number:', error);
        return false;
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

// POST endpoint to receive number and OTP
app.post('/send-otp', async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;

        // Validate request body
        if (!phoneNumber || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and OTP are required'
            });
        }

        // Check if number exists on WhatsApp
        const exists = await isWhatsAppUser(phoneNumber);
        if (!exists) {
            return res.status(400).json({
                success: false,
                message: 'This number is not registered on WhatsApp'
            });
        }

        // Format phone number
        let formattedNumber = phoneNumber;
        if (!phoneNumber.includes('@c.us')) {
            formattedNumber = `${phoneNumber}@c.us`;
        }

        // Message template
        const message = `Your OTP is: ${otp}\nPlease do not share this OTP with anyone.`;

        // Send message
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

// New route to send marathon information message
// New route to send marathon message
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

        // Validate request body
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        // Check if number exists on WhatsApp
        const exists = await isWhatsAppUser(phoneNumber);
        if (!exists) {
            return res.status(400).json({
                success: false,
                message: 'This number is not registered on WhatsApp'
            });
        }

        // Format phone number
        let formattedNumber = phoneNumber;
        if (!phoneNumber.includes('@c.us')) {
            formattedNumber = `${phoneNumber}@c.us`;
        }

        // Format race category in Hindi
        const raceCategoryHindi = {
            '5KM': '5 किलोमीटर',
            '10KM': '10 किलोमीटर',
            '21KM': '21 किलोमीटर'
        }[raceCategory] || raceCategory;

        // Marathon message with participant details
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
🌐 वेबसाइट: https://www.runabujhmad.in/  
📧 ईमेल: support@runabujhmad.in  

आइए साथ मिलकर इस मैराथन को यादगार बनाएं! 🌟  
किसी भी जानकारी के लिए हमारी वेबसाइट पर जाएं या हमें ईमेल करें।  
"आओ मिलकर उठाए ये कदम, अबूझमाड को जोड़े हमारे संग"! 🏃‍♂🌟  
#अबूझमाड़मैराथन #RunAbhujhmad #साथचलेंगे #बेहतरकलकेलिए`;

        // Send message
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
https.createServer(options, app).listen(PORT,"0.0.0.0", () => {
    console.log(`HTTPS Server running on port ${PORT}`);
});