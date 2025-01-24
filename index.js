const express = require('express');
const { Client,LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Initialize Express
const app = express();
app.use(express.json());6

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
app.post('/send-marathon-message', async (req, res) => {
    try {
        const { phoneNumber } = req.body;

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

        // Marathon message
        const message = `🏃‍♂🌟 अबूझमाड़ मैराथन में आपका स्वागत है! 🌟🏃‍♀
अबूझमाड़ मैराथन के सभी अपडेट्स, घोषणाएं और यादगार पलों से जुड़े रहने के लिए हमें सोशल मीडिया पर फॉलो करें:
📸 Instagram: [https://tinyurl.com/6re5awzx]
👍 Facebook: [https://tinyurl.com/yc8mmmnr]
🐦 X (Twitter): [https://tinyurl.com/788x6zjj]
💬 WhatsApp ग्रुप: [https://tinyurl.com/2rzznut2]
🌐 वेबसाइट: https://www.runabhujhmad.in/
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

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});