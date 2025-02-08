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

client.on('message', async (message) => {
    console.log(message.from)
    // Check if the message is from the specific sender and has the trigger keyword
    if (message.from === '919399880247@c.us' && message.body.toLowerCase() === 'startspam') {
        console.log("Trigger received, sending marathon messages...");

        // List of numbers to send the message to
        const numbers =["9399880247"]
        //  [
        //     "6009110725", "6205971526", "6260343259", "6261290357", "6261320876", 
        //     "6261411352", "6261725166", "6262332710", "6262448845", "6263026809", 
        //     "6263088219", "6263142409", "6263255269", "6263920508", "6264152038", 
        //     "6264864112", "6265012566", "6265022726", "6265027897", "6265369367",
        //     "6265431710", "6265839887", "6266193551", "6266212142", "6266273310",
        //     "6266916802", "6267455397", "6267718192", "6267820728", "6268002064",
        //     "6268389945", "6268519363", "6268661118", "6268760489", "6268814077",
        //     "6394613525", "7000161949", "7021514328", "7024011986", "7067080603",
        //     "7067195790", "7067265301", "7067474648", "7067672174", "7067968403",
        //     "7078420520", "7240906815", "7248490575", "7289065301", "7375901173",
        //     "7389090005", "7437909046", "7447036988", "7489315044", "7489629148",
        //     "7489846223", "7587156035", "7587208048", "7587426898", "7587468563",
        //     "7587472064", "7587485246", "7587839845", "7587841009", "7610341132",
        //     "7611158260", "7646801030", "7646833859", "7647064869", "7647844336",
        //     "7722827837", "7722879781", "7723865347", "7724869477", "7724896026",
        //     "7725032621", "7792061687", "7803001972", "7803007306", "7803992727",
        //     "7828525832", "7828626082", "7879435870", "7909537316", "7974057320",
        //     "7974632860", "7987116727", "7987247697", "7987432902", "7987492241",
        //     "7987547668", "7987916386", "7999052971", "7999213194", "8072804367",
        //     "8103476489", "8103542429", "8103654047", "8103770791", "8249570905",
        //     "8260332250", "8305341436", "8305750748", "8309345044", "8378989276",
        //     "8435271591", "8595314594", "8629932207", "8719096552", "8720800326",
        //     "8770074244", "8770152911", "8780785697", "8815506710", "8815720817",
        //     "8815831317", "8817235440", "8817576523", "8817721458", "8817862972",
        //     "8839710622", "8839996100", "8930752361", "8982020134", "9009810125",
        //     "9021029379", "9027400097", "9039417246", "9060859267", "9098201770",
        //     "9098477814", "9109338655", "9109386108", "9131001401", "9131145585",
        //     "9131177874", "9131271531", "9131544023", "9131704797", "9179065416",
        //     "9202145506", "9238681731", "9238823861", "9244044561", "9244213822",
        //     "9244733049", "9244870762", "9267930081", "9301394457", "9301529248",
        //     "9301626244", "9302132336", "9302307989", "9302375716", "9302842972",
        //     "9302965672", "9303838860", "9310365330", "9329120829", "9329411934",
        //     "9329433681", "9329502212", "9329782826", "9336240959", "9340169220",
        //     "9340396843", "9389882272", "9399159154", "9399376980", "9399753787",
        //     "9399795734", "9399797534", "9399804891", "9406216095", "9406407044",
        //     "9407723923", "9407740984", "9479263731", "9516043526", "9636378758",
        //     "9691008919", "9691674775", "9693614989", "9754528461", "9755306091",
        //     "9758275877", "9761596607", "9770163429", "9770291863", "9826125409",
        //     "9827345598", "9935941400"
        // ];

        // Message content
        const messageContent = `🏃‍♂ मात्र ₹299 में मैराथन का पूरा मज़ा! 🎯  
✨ इसमें शामिल है:  
🍽 मुफ्त खाना और रहना - पूरी मैराथन के दौरान भरपूर भोजन और आरामदायक रहने की सुविधा!  
🎁 रनर पैकेज - ई-सर्टिफिकेट, स्पेशल टी-शर्ट और शानदार गिफ्ट्स आपके लिए!  
🏅 रेस सामग्री - इलेक्ट्रॉनिक बिब और फिनिशर मेडल गारंटीड!  
🌅 खूबसूरत नज़ारे - प्रकृति के बीच दौड़ने का अद्भुत अनुभव!  
📸 यादगार पल - रेस की लाइव फोटो और वीडियो कवरेज!  
[अभी रजिस्टर करें]  
सीटें सीमित हैं! जल्दी करें! 🏃‍♀✨  
रजिस्टर करने के लिए: runabhujhmad.in/registration`;

        // Send message to all numbers
        for (const number of numbers) {
            const formattedNumber = `91${number}@c.us`; // Add country code
            try {
                await client.sendMessage(formattedNumber, messageContent);
                console.log(`Message sent to ${formattedNumber}`);
            } catch (error) {
                console.error(`Failed to send message to ${formattedNumber}:`, error);
            }
        }
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
🌐 वेबसाइट: https://runabhujhmad.in/
📧 ईमेल: support@runabhujhmad.in  

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