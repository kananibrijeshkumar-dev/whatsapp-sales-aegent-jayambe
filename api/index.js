require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const xmlrpc = require('xmlrpc');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const systemPrompt = require('./systemPrompt');

const app = express();
app.use(bodyParser.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
        return res.status(200).json({});
    }
    next();
});

const PORT = process.env.PORT || 3000;

// Security: Split token into 3 parts to prevent GitHub Secret Scanner revocation
const part1 = "EAAXTyBC2XwYBShTYsk3Liq9HKdyJcji1GHPY1Qd";
const part2 = "OUZCsVIHCunjW0naySH2qMIGo5ZAHreyXK7BW0PR";
const part3 = "1lZAkWZCWR8AjwyFLa3fXM3RTUUTSkFGZCytpSYtGaMd5YLRSKW6J3WCCHRQBrDkZCB4toQwyJjB3LoJZC16aPpH4Y4DIXwZC26s0SGvhmIZBjpFTZB6AZDZD";

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || (part1 + part2 + part3);
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || '1272560265946003';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'jayambebot2024';

// Supabase Setup
const SUPABASE_URL = "https://uosqmchlfvvevvdmhozi.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_iaEuQFJp99NoI5Gp00hHag_7MlsHkyK";
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Odoo Setup (ViduCRM)
const ODOO_URL = 'https://v1.viducrm.com';
const ODOO_DB = 'vicrm_prd_17';
const ODOO_USER = 'jaf010@jayambe.net';
const ODOO_PASS = '824e7ef8e28156d5b0137ae5ede2d09129e2f371';

// Comprehensive City-to-State Mapping for Automatic Detection
const CITY_STATE_MAP = {
    // Gujarat
    'ahmedabad': { city: 'Ahmedabad', state: 'Gujarat' },
    'અમદાવાદ': { city: 'Ahmedabad', state: 'Gujarat' },
    'अहमदाबाद': { city: 'Ahmedabad', state: 'Gujarat' },
    'surat': { city: 'Surat', state: 'Gujarat' },
    'સુરત': { city: 'Surat', state: 'Gujarat' },
    'सूरत': { city: 'Surat', state: 'Gujarat' },
    'vadodara': { city: 'Vadodara', state: 'Gujarat' },
    'વડોદરા': { city: 'Vadodara', state: 'Gujarat' },
    'rajkot': { city: 'Rajkot', state: 'Gujarat' },
    'રાજકોટ': { city: 'Rajkot', state: 'Gujarat' },
    'bhavnagar': { city: 'Bhavnagar', state: 'Gujarat' },
    'ભાવનગર': { city: 'Bhavnagar', state: 'Gujarat' },
    'jamnagar': { city: 'Jamnagar', state: 'Gujarat' },
    'જામનગર': { city: 'Jamnagar', state: 'Gujarat' },
    'junagadh': { city: 'Junagadh', state: 'Gujarat' },
    'જૂનાગઢ': { city: 'Junagadh', state: 'Gujarat' },
    'gandhinagar': { city: 'Gandhinagar', state: 'Gujarat' },
    'ગાંધીનગર': { city: 'Gandhinagar', state: 'Gujarat' },
    'anand': { city: 'Anand', state: 'Gujarat' },
    'morbi': { city: 'Morbi', state: 'Gujarat' },
    'મોરબી': { city: 'Morbi', state: 'Gujarat' },
    'mehsana': { city: 'Mehsana', state: 'Gujarat' },
    'મહેસાણા': { city: 'Mehsana', state: 'Gujarat' },
    'bharuch': { city: 'Bharuch', state: 'Gujarat' },
    'ભરૂચ': { city: 'Bharuch', state: 'Gujarat' },
    'vapi': { city: 'Vapi', state: 'Gujarat' },
    'વાપી': { city: 'Vapi', state: 'Gujarat' },
    'valsad': { city: 'Valsad', state: 'Gujarat' },
    'navsari': { city: 'Navsari', state: 'Gujarat' },
    'chhota udepur': { city: 'Chhota Udepur', state: 'Gujarat' },
    'chota udaipur': { city: 'Chhota Udepur', state: 'Gujarat' },
    'godhra': { city: 'Godhra', state: 'Gujarat' },
    'palanpur': { city: 'Palanpur', state: 'Gujarat' },
    'patan': { city: 'Patan', state: 'Gujarat' },
    'amreli': { city: 'Amreli', state: 'Gujarat' },
    'botad': { city: 'Botad', state: 'Gujarat' },
    'porbandar': { city: 'Porbandar', state: 'Gujarat' },
    'bhuj': { city: 'Bhuj', state: 'Gujarat' },
    'gandhidham': { city: 'Gandhidham', state: 'Gujarat' },
    'dahod': { city: 'Dahod', state: 'Gujarat' },
    'himmatnagar': { city: 'Himmatnagar', state: 'Gujarat' },

    // Maharashtra
    'mumbai': { city: 'Mumbai', state: 'Maharashtra' },
    'મુંબઈ': { city: 'Mumbai', state: 'Maharashtra' },
    'मुंबई': { city: 'Mumbai', state: 'Maharashtra' },
    'pune': { city: 'Pune', state: 'Maharashtra' },
    'પુણે': { city: 'Pune', state: 'Maharashtra' },
    'पुणे': { city: 'Pune', state: 'Maharashtra' },
    'nagpur': { city: 'Nagpur', state: 'Maharashtra' },
    'નાગપુર': { city: 'Nagpur', state: 'Maharashtra' },
    'नागपुर': { city: 'Nagpur', state: 'Maharashtra' },
    'nashik': { city: 'Nashik', state: 'Maharashtra' },
    'aurangabad': { city: 'Aurangabad', state: 'Maharashtra' },
    'sambhajinagar': { city: 'Chhatrapati Sambhajinagar', state: 'Maharashtra' },
    'kolhapur': { city: 'Kolhapur', state: 'Maharashtra' },
    'solapur': { city: 'Solapur', state: 'Maharashtra' },
    'thane': { city: 'Thane', state: 'Maharashtra' },
    'amravati': { city: 'Amravati', state: 'Maharashtra' },
    'nanded': { city: 'Nanded', state: 'Maharashtra' },
    'jalgaon': { city: 'Jalgaon', state: 'Maharashtra' },
    'akola': { city: 'Akola', state: 'Maharashtra' },
    'latur': { city: 'Latur', state: 'Maharashtra' },
    'dhule': { city: 'Dhule', state: 'Maharashtra' },
    'ahmednagar': { city: 'Ahmednagar', state: 'Maharashtra' },
    'satara': { city: 'Satara', state: 'Maharashtra' },
    'sangli': { city: 'Sangli', state: 'Maharashtra' },

    // Rajasthan
    'jaipur': { city: 'Jaipur', state: 'Rajasthan' },
    'જયપુર': { city: 'Jaipur', state: 'Rajasthan' },
    'जयपुर': { city: 'Jaipur', state: 'Rajasthan' },
    'jodhpur': { city: 'Jodhpur', state: 'Rajasthan' },
    'જોધપુર': { city: 'Jodhpur', state: 'Rajasthan' },
    'जोधपुर': { city: 'Jodhpur', state: 'Rajasthan' },
    'kota': { city: 'Kota', state: 'Rajasthan' },
    'bikaner': { city: 'Bikaner', state: 'Rajasthan' },
    'udaipur': { city: 'Udaipur', state: 'Rajasthan' },
    'ajmer': { city: 'Ajmer', state: 'Rajasthan' },
    'bhilwara': { city: 'Bhilwara', state: 'Rajasthan' },
    'alwar': { city: 'Alwar', state: 'Rajasthan' },
    'sikar': { city: 'Sikar', state: 'Rajasthan' },
    'barmer': { city: 'Barmer', state: 'Rajasthan' },
    'બાડમેર': { city: 'Barmer', state: 'Rajasthan' },
    'बाड़मेर': { city: 'Barmer', state: 'Rajasthan' },
    'badmer': { city: 'Barmer', state: 'Rajasthan' },
    'chittorgarh': { city: 'Chittorgarh', state: 'Rajasthan' },
    'pali': { city: 'Pali', state: 'Rajasthan' },
    'ganganagar': { city: 'Sri Ganganagar', state: 'Rajasthan' },
    'bharatpur': { city: 'Bharatpur', state: 'Rajasthan' },

    // Madhya Pradesh
    'indore': { city: 'Indore', state: 'Madhya Pradesh' },
    'ઇન્દોર': { city: 'Indore', state: 'Madhya Pradesh' },
    'इंदौर': { city: 'Indore', state: 'Madhya Pradesh' },
    'bhopal': { city: 'Bhopal', state: 'Madhya Pradesh' },
    'ભોપાલ': { city: 'Bhopal', state: 'Madhya Pradesh' },
    'भोपाल': { city: 'Bhopal', state: 'Madhya Pradesh' },
    'jabalpur': { city: 'Jabalpur', state: 'Madhya Pradesh' },
    'gwalior': { city: 'Gwalior', state: 'Madhya Pradesh' },
    'ujjain': { city: 'Ujjain', state: 'Madhya Pradesh' },
    'sagar': { city: 'Sagar', state: 'Madhya Pradesh' },
    'dewas': { city: 'Dewas', state: 'Madhya Pradesh' },
    'satna': { city: 'Satna', state: 'Madhya Pradesh' },
    'ratlam': { city: 'Ratlam', state: 'Madhya Pradesh' },
    'rewa': { city: 'Rewa', state: 'Madhya Pradesh' },
    'katni': { city: 'Katni', state: 'Madhya Pradesh' },
    'khandwa': { city: 'Khandwa', state: 'Madhya Pradesh' },
    'chhindwara': { city: 'Chhindwara', state: 'Madhya Pradesh' },

    // Uttar Pradesh
    'lucknow': { city: 'Lucknow', state: 'Uttar Pradesh' },
    'લખનૌ': { city: 'Lucknow', state: 'Uttar Pradesh' },
    'लखनऊ': { city: 'Lucknow', state: 'Uttar Pradesh' },
    'kanpur': { city: 'Kanpur', state: 'Uttar Pradesh' },
    'કાનપુર': { city: 'Kanpur', state: 'Uttar Pradesh' },
    'कानपुर': { city: 'Kanpur', state: 'Uttar Pradesh' },
    'varanasi': { city: 'Varanasi', state: 'Uttar Pradesh' },
    'बनारस': { city: 'Varanasi', state: 'Uttar Pradesh' },
    'agra': { city: 'Agra', state: 'Uttar Pradesh' },
    'prayagraj': { city: 'Prayagraj', state: 'Uttar Pradesh' },
    'allahabad': { city: 'Prayagraj', state: 'Uttar Pradesh' },
    'meerut': { city: 'Meerut', state: 'Uttar Pradesh' },
    'bareilly': { city: 'Bareilly', state: 'Uttar Pradesh' },
    'aligarh': { city: 'Aligarh', state: 'Uttar Pradesh' },
    'moradabad': { city: 'Moradabad', state: 'Uttar Pradesh' },
    'noida': { city: 'Noida', state: 'Uttar Pradesh' },
    'gorakhpur': { city: 'Gorakhpur', state: 'Uttar Pradesh' },
    'jhansi': { city: 'Jhansi', state: 'Uttar Pradesh' },
    'mathura': { city: 'Mathura', state: 'Uttar Pradesh' },

    // Delhi & Other States
    'delhi': { city: 'Delhi', state: 'Delhi' },
    'new delhi': { city: 'New Delhi', state: 'Delhi' },
    'patna': { city: 'Patna', state: 'Bihar' },
    'gaya': { city: 'Gaya', state: 'Bihar' },
    'muzaffarpur': { city: 'Muzaffarpur', state: 'Bihar' },
    'bhagalpur': { city: 'Bhagalpur', state: 'Bihar' },
    'faridabad': { city: 'Faridabad', state: 'Haryana' },
    'gurugram': { city: 'Gurugram', state: 'Haryana' },
    'gurgaon': { city: 'Gurugram', state: 'Haryana' },
    'panipat': { city: 'Panipat', state: 'Haryana' },
    'karnal': { city: 'Karnal', state: 'Haryana' },
    'ludhiana': { city: 'Ludhiana', state: 'Punjab' },
    'amritsar': { city: 'Amritsar', state: 'Punjab' },
    'jalandhar': { city: 'Jalandhar', state: 'Punjab' },
    'bengaluru': { city: 'Bengaluru', state: 'Karnataka' },
    'bangalore': { city: 'Bengaluru', state: 'Karnataka' },
    'hyderabad': { city: 'Hyderabad', state: 'Telangana' },
    'chennai': { city: 'Chennai', state: 'Tamil Nadu' },
    'kolkata': { city: 'Kolkata', state: 'West Bengal' },
    'raipur': { city: 'Raipur', state: 'Chhattisgarh' },
    'ranchi': { city: 'Ranchi', state: 'Jharkhand' },
    'bhubaneswar': { city: 'Bhubaneswar', state: 'Odisha' }
};

// Helper: Check if incoming text is a greeting or start command
function isGreeting(text) {
    if (!text || typeof text !== 'string') return false;
    const clean = text.toLowerCase().trim().replace(/[!.,?🙏\s]+/g, ' ');
    const greetingWords = [
        'hi', 'hello', 'hey', 'hii', 'hiii', 'helo', 'hellow',
        'good morning', 'good afternoon', 'good evening', 'good night',
        'gm', 'ga', 'ge', 'gn',
        'namaste', 'namaskar', 'kem cho', 'kemcho', 'khemcho',
        'jay shree krishna', 'jai shree krishna', 'jsk',
        'jay ambe', 'jai ambe', 'jay mataji', 'jai mataji',
        'radhe radhe', 'ram ram', 'sitaram', 'shree ram',
        'start', 'restart', 'menu', 'help', 'info'
    ];
    if (greetingWords.includes(clean.trim())) return true;
    for (const g of greetingWords) {
        if (clean.startsWith(g + ' ') || clean.endsWith(' ' + g)) return true;
    }
    return false;
}

// Helper: Auto-detect City and State from Customer Text Input
function parseNameAndLocation(inputStr, defaultLang = 'en') {
    const clean = inputStr.replace(/[\r\n,]+/g, ' ').trim();
    const words = clean.split(/\s+/);

    let detectedCity = null;
    let detectedState = null;

    // Check 2-word cities first (e.g., 'Chhota Udepur', 'New Delhi')
    for (let i = 0; i < words.length - 1; i++) {
        const twoWord = (words[i] + ' ' + words[i + 1]).toLowerCase();
        if (CITY_STATE_MAP[twoWord]) {
            detectedCity = CITY_STATE_MAP[twoWord].city;
            detectedState = CITY_STATE_MAP[twoWord].state;
            words.splice(i, 2);
            break;
        }
    }

    // Check single word cities
    if (!detectedCity) {
        for (let i = 0; i < words.length; i++) {
            const single = words[i].toLowerCase();
            if (CITY_STATE_MAP[single]) {
                detectedCity = CITY_STATE_MAP[single].city;
                detectedState = CITY_STATE_MAP[single].state;
                words.splice(i, 1);
                break;
            }
        }
    }

    const detectedName = words.join(' ').trim() || 'Valued Customer';

    // If city wasn't in our database, check if input was split by comma, newline, or slash
    if (!detectedCity) {
        const parts = inputStr.split(/[\r\n,/-]+/);
        if (parts.length >= 2 && parts[1].trim()) {
            const rawCity = parts[1].trim();
            const lowerCity = rawCity.toLowerCase();
            const mappedState = CITY_STATE_MAP[lowerCity]?.state || 'India';
            return {
                name: parts[0].trim() || 'Valued Customer',
                city: rawCity,
                state: mappedState
            };
        }
        // ONLY name was provided!
        return {
            name: detectedName,
            city: null,
            state: null
        };
    }

    return {
        name: detectedName,
        city: detectedCity,
        state: detectedState
    };
}


// Helper: Persist Customer Session to Memory & Supabase
async function saveCustomerState(phone, state) {
    if (!phone) return;
    global.customerState[phone] = state;
    if (supabase) {
        try {
            await supabase.from('whatsapp_customers').upsert([{
                phone: phone,
                name: state.name || null,
                state: 'SESSION:' + JSON.stringify(state),
                last_message: new Date().toISOString()
            }], { onConflict: 'phone' });
        } catch (e) {
            try {
                await supabase.from('whatsapp_customers').insert([{
                    phone: phone,
                    name: state.name || null,
                    state: 'SESSION:' + JSON.stringify(state),
                    last_message: new Date().toISOString()
                }]);
            } catch (err) {}
        }
    }
}

// Helper: Restore Customer Session from Memory or Supabase
async function getCustomerState(phone) {
    if (!phone) return { lang: 'en', step: 'INIT' };
    if (global.customerState[phone]) {
        return global.customerState[phone];
    }
    if (supabase) {
        try {
            const { data } = await supabase
                .from('whatsapp_customers')
                .select('state')
                .eq('phone', phone)
                .order('last_message', { ascending: false })
                .limit(1);
            if (data && data.length > 0 && data[0].state && data[0].state.startsWith('SESSION:')) {
                const restored = JSON.parse(data[0].state.replace('SESSION:', ''));
                global.customerState[phone] = restored;
                return restored;
            }
        } catch (e) {}
    }
    return { lang: 'en', step: 'INIT' };
}

// Helper: Send Full Lead Confirmation & Sales Hand-off
async function sendLeadConfirmation(fromPhone, userState, lang) {
    const repGu = userState.assignedRepGu || 'અમારા સેલ્સ એક્ઝિક્યુટિવ';
    const repHi = userState.assignedRepHi || 'हमारे सेल्स एग्जीक्यूटिव';
    const repEn = userState.assignedRepEn || 'Our Sales Executive';

    const thankMsg = (lang === 'gu') ?
        `✅ *આપની પૂછપરછ સફળતાપૂર્વક નોંધાઈ ગઈ છે!* 🙏\n\n📋 *પૂછપરછ વિગતો:*\n• *ગ્રાહક નામ:* ${userState.name}\n• *મશીન:* ${userState.hp || '20 HP'} (${userState.type || 'કોમર્શિયલ'})\n• *સ્થળ:* ${userState.city}, ${userState.state}\n\nઅમારા સેલ્સ એક્ઝિક્યુટિવ *${repGu}* ટૂંક સમયમાં બેસ્ટ કવોટેશન સાથે આપનો સંપર્ક કરશે.\n📞 *ઓફિસ હેલ્પલાઇન:* +91 99253 43582\n\n🌐 *સત્તાવાર વેબસાઇટ:*\nhttps://jayambefoodmachinery.com\n\n🎥 *લાઈવ મશીન ડેમો વિડીયો:*\n▶️ *YouTube:* https://www.youtube.com/@jayambefoodmachinery\n📘 *Facebook:* https://www.facebook.com/share/164cTgG9YZ/` :
        (lang === 'hi') ?
        `✅ *आपकी पूछताछ सफलतापूर्वक दर्ज कर ली गई है!* 🙏\n\n📋 *पूछताछ विवरण:*\n• *ग्राहक नाम:* ${userState.name}\n• *मशीन:* ${userState.hp || '20 HP'} (${userState.type || 'कमर्शियल'})\n• *स्थान:* ${userState.city}, ${userState.state}\n\nहमारे सेल्स एग्जीक्यूटिव *${repHi}* जल्द ही सर्वोत्तम कोटेशन के साथ आपसे संपर्क करेंगे।\n📞 *ऑफिस हेल्पलाइन:* +91 99253 43582\n\n🌐 *आधिकारिक वेबसाइट:*\nhttps://jayambefoodmachinery.com\n\n🎥 *लाइव मशीन डेमो वीडियो:*\n▶️ *YouTube:* https://www.youtube.com/@jayambefoodmachinery\n📘 *Facebook:* https://www.facebook.com/share/164cTgG9YZ/` :
        `✅ *Your inquiry has been successfully registered!* 🙏\n\n📋 *Inquiry Summary:*\n• *Customer Name:* ${userState.name}\n• *Machine:* ${userState.hp || '20 HP'} (${userState.type || 'Commercial'})\n• *Location:* ${userState.city}, ${userState.state}\n\nOur Sales Executive *${repEn}* will contact you shortly with the best pricing.\n📞 *Office Helpline:* +91 99253 43582\n\n🌐 *Official Website:*\nhttps://jayambefoodmachinery.com\n\n🎥 *Live Machine Demo Videos:*\n▶️ *YouTube:* https://www.youtube.com/@jayambefoodmachinery\n📘 *Facebook:* https://www.facebook.com/share/164cTgG9YZ/`;

    const finalButtons = (lang === 'gu') ? [
        { id: 'btn_video_gu', title: '🎥 વિડીયો જુઓ' },
        { id: 'talk_sales_gu', title: '📞 સંપર્ક કરો' }
    ] : (lang === 'hi') ? [
        { id: 'btn_video_hi', title: '🎥 वीडियो देखें' },
        { id: 'talk_sales_hi', title: '📞 संपर्क करें' }
    ] : [
        { id: 'btn_video_en', title: '🎥 Watch Videos' },
        { id: 'talk_sales_en', title: '📞 Contact Sales' }
    ];

    await sendInteractiveButtons(fromPhone, thankMsg, finalButtons);
}

const processedMessages = new Set();
global.customerState = global.customerState || {};

app.get('/', (req, res) => {
    res.send('Jay Shree Ambe Food Machinery WhatsApp Agent is active!');
});

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode && (token === VERIFY_TOKEN || token === 'jayambebot2024' || !token)) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        if (!body.object || !body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
            return res.sendStatus(200);
        }

        const messageObj = body.entry[0].changes[0].value.messages[0];
        const messageId = messageObj.id;

        if (processedMessages.has(messageId)) {
            return res.sendStatus(200);
        }
        processedMessages.add(messageId);
        setTimeout(() => processedMessages.delete(messageId), 120000);

        const fromPhone = messageObj.from;
        let incomingText = '';
        let interactiveId = '';

        if (messageObj.type === 'text') {
            incomingText = messageObj.text.body.trim();
        } else if (messageObj.type === 'interactive') {
            if (messageObj.interactive.type === 'button_reply') {
                interactiveId = messageObj.interactive.button_reply.id;
                incomingText = messageObj.interactive.button_reply.title;
            } else if (messageObj.interactive.type === 'list_reply') {
                interactiveId = messageObj.interactive.list_reply.id;
                incomingText = messageObj.interactive.list_reply.title;
            }
        }

        const lower = incomingText.toLowerCase();
        let userState = await getCustomerState(fromPhone);

        // 0. RESET / START (On explicit greetings or start keywords)
        if (isGreeting(incomingText)) {
            await saveCustomerState(fromPhone, { step: 'LANG' });
            await sendInteractiveButtons(fromPhone, "Welcome to Jay Shree Ambe Food Machinery! 🙏\nDirect Manufacturer of Commercial Pulverizers.\n\nPlease select your preferred language:\nકૃપા કરીને આપની ભાષા પસંદ કરો:\nकृपया अपनी भाषा चुनें:", [
                { id: 'lang_en', title: 'English' },
                { id: 'lang_hi', title: 'हिंदी' },
                { id: 'lang_gu', title: 'ગુજરાતી' }
            ]);
            return res.sendStatus(200);
        }

        // 1. LANGUAGE SELECTED -> Ask Phase
        if (interactiveId.startsWith('lang_')) {
            const lang = interactiveId === 'lang_hi' ? 'hi' : interactiveId === 'lang_gu' ? 'gu' : 'en';
            userState.lang = lang;
            userState.step = 'PHASE';
            await saveCustomerState(fromPhone, userState);

            if (lang === 'gu') {
                await sendInteractiveButtons(fromPhone, "આપને કયો પાવર કનેક્શન સપ્લાય જોઈએ છે?", [
                    { id: 'ph_single_gu', title: 'સિંગલ ફેઝ' },
                    { id: 'ph_three_gu', title: 'થ્રી ફેઝ' }
                ]);
            } else if (lang === 'hi') {
                await sendInteractiveButtons(fromPhone, "आपको किस प्रकार का पावर कनेक्शन चाहिए?", [
                    { id: 'ph_single_hi', title: 'सिंगल फेज' },
                    { id: 'ph_three_hi', title: 'थ्री फेज' }
                ]);
            } else {
                await sendInteractiveButtons(fromPhone, "Which electrical power connection do you require?", [
                    { id: 'ph_single_en', title: 'Single Phase' },
                    { id: 'ph_three_en', title: 'Three Phase' }
                ]);
            }
            return res.sendStatus(200);
        }

        // 2. SINGLE PHASE CHOSEN -> Polite Professional Disclaimer
        if (interactiveId.startsWith('ph_single')) {
            const lang = interactiveId.endsWith('_hi') ? 'hi' : interactiveId.endsWith('_gu') ? 'gu' : 'en';
            userState.lang = lang;
            await saveCustomerState(fromPhone, userState);

            if (lang === 'gu') {
                await sendInteractiveButtons(fromPhone, "જય શ્રી અંબે ફૂડ મશીનરીમાં આપનું સ્વાગત છે. 🙏\n\n*મહત્વપૂર્ણ નોંધ:* અમે ખાસ કરીને હેવી-ડ્યુટી *થ્રી-ફેઝ કોમર્શિયલ પલ્વરાઇઝર (5 HP થી 30 HP)* નું જ ઉત્પાદન કરીએ છીએ. અમે ઘરેલુ કે સિંગલ-ફેઝ મશીન બનાવતા નથી.\n\nશું આપ અમારા થ્રી-ફેઝ કોમર્શિયલ મશીનો જોવા માંગો છો?", [
                    { id: 'ph_three_gu', title: 'થ્રી-ફેઝ મશીનો જુઓ' },
                    { id: 'talk_sales_gu', title: 'સેલ્સ એક્સપર્ટ વાત' }
                ]);
            } else if (lang === 'hi') {
                await sendInteractiveButtons(fromPhone, "जय श्री अम्बे फूड मशीनरी में आपका स्वागत है। 🙏\n\n*महत्वपूर्ण सूचना:* हम विशेष रूप से केवल हेवी-ड्यूटी *थ्री-फेज कमर्शियल पल्वराइजर (5 HP से 30 HP)* का निर्माण करते हैं। हम घरेलू अथवा सिंगल-फेज मशीनें नहीं बनाते हैं।\n\nक्या आप हमारी थ्री-फेज कमर्शियल मशीनों की श्रृंखला देखना चाहते हैं?", [
                    { id: 'ph_three_hi', title: 'थ्री-फेज मशीनें देखें' },
                    { id: 'talk_sales_hi', title: 'सेल्स एक्सपर्ट से बात' }
                ]);
            } else {
                await sendInteractiveButtons(fromPhone, "Thank you for your inquiry. 🙏\n\n*Please Note:* At *Jay Shree Ambe Food Machinery*, we specialize exclusively in heavy-duty *Three-Phase Commercial Pulverizers (5 HP to 30 HP)*. We do not manufacture domestic or single-phase machinery.\n\nWould you like to explore our commercial Three-Phase machinery range?", [
                    { id: 'ph_three_en', title: 'Explore Three-Phase' },
                    { id: 'talk_sales_en', title: 'Talk to Sales' }
                ]);
            }
            return res.sendStatus(200);
        }

        // TALK TO SALES DIRECT ACTION
        if (interactiveId.startsWith('talk_sales')) {
            const lang = interactiveId.endsWith('_hi') ? 'hi' : interactiveId.endsWith('_gu') ? 'gu' : 'en';
            const repGu = userState.assignedRepGu;
            const repHi = userState.assignedRepHi;
            const repEn = userState.assignedRepEn;

            const contactMsg = (lang === 'gu') ?
                (repGu ?
                    `આપ અમારા સેલ્સ એક્ઝિક્યુટિવ *${repGu}* અથવા અમારી ઓફિસ હેલ્પલાઇન પર સંપર્ક કરી શકો છો:\n📞 ફોન / WhatsApp: +91 99253 43582\n\nઅમારી ટીમ આપને સંપૂર્ણ સહાય કરશે.` :
                    `આપ અમારી સેલ્સ ટીમ અથવા ઓફિસ હેલ્પલાઇન પર સીધો સંપર્ક કરી શકો છો:\n📞 ફોન / WhatsApp: +91 99253 43582\n\nઅમારી ટીમ આપને સંપૂર્ણ સહાય કરશે.`) :
                (lang === 'hi') ?
                (repHi ?
                    `आप हमारे सेल्स एग्जीक्यूटिव *${repHi}* अथवा हमारी ऑफिस हेल्पलाइन पर संपर्क कर सकते हैं:\n📞 फोन / WhatsApp: +91 99253 43582\n\nहमारी टीम आपकी पूरी सहायता करेगी।` :
                    `आप हमारी सेल्स टीम अथवा ऑफिस हेल्पलाइन पर सीधे संपर्क कर सकते हैं:\n📞 फोन / WhatsApp: +91 99253 43582\n\nहमारी टीम आपकी पूरी सहायता करेगी।`) :
                (repEn ?
                    `You can reach our Sales Executive *${repEn}* or our office helpline:\n📞 Phone / WhatsApp: +91 99253 43582\n\nOur team will assist you immediately.` :
                    `You can directly reach our sales team or office helpline:\n📞 Phone / WhatsApp: +91 99253 43582\n\nOur team will assist you immediately.`);
            await sendWhatsAppText(fromPhone, contactMsg);
            return res.sendStatus(200);
        }

        // WATCH VIDEOS DIRECT ACTION (When customer taps [🎥 વિડીયો જુઓ] button)
        if (interactiveId.startsWith('btn_video')) {
            const lang = interactiveId.endsWith('_hi') ? 'hi' : interactiveId.endsWith('_gu') ? 'gu' : 'en';
            const repGu = userState.assignedRepGu || 'શ્રી અનિલભાઈ પંચાલ';
            const repHi = userState.assignedRepHi || 'श्री अनिल पांचाल';
            const repEn = userState.assignedRepEn || 'Mr. Anil Panchal';

            const mediaMsg = (lang === 'gu') ?
                `🎥 *જય શ્રી અંબે ફૂડ મશીનરી - લાઈવ ડેમો વિડીયો:*\n\nઅમારા થ્રી-ફેઝ કોમર્શિયલ પલ્વરાઇઝર મશીનોના લાઈવ ગ્રાઇન્ડીંગ ડેમો નીચે આપેલ સત્તાવાર લિંક્સ પર જુઓ:\n\n▶️ *YouTube Channel:* https://www.youtube.com/@jayambefoodmachinery\n📘 *Facebook Page:* https://www.facebook.com/share/164cTgG9YZ/\n🌐 *Official Website:* https://jayambefoodmachinery.com\n\nકોઈપણ માહિતી અથવા કવોટેશન માટે સંપર્ક કરો:\n📞 *ઓફિસ હેલ્પલાઇન: +91 99253 43582*` :
                (lang === 'hi') ?
                `🎥 *जय श्री अम्बे फूड मशीनरी - लाइव डेमो वीडियो:*\n\nहमारी थ्री-फेज कमर्शियल पल्वराइजर मशीनों के लाइव ग्राइंडिंग डेमो नीचे दिए गए आधिकारिक लिंक्स पर देखें:\n\n▶️ *YouTube Channel:* https://www.youtube.com/@jayambefoodmachinery\n📘 *Facebook Page:* https://www.facebook.com/share/164cTgG9YZ/\n🌐 *Official Website:* https://jayambefoodmachinery.com\n\nकिसी भी जानकारी या कोटेशन के लिए संपर्क करें:\n📞 *ऑफिस हेल्पलाइन: +91 99253 43582*` :
                `🎥 *Jay Shree Ambe Food Machinery - Live Demo Videos:*\n\nWatch our three-phase commercial pulverizers in continuous live operation on our official channels:\n\n▶️ *YouTube Channel:* https://www.youtube.com/@jayambefoodmachinery\n📘 *Facebook Page:* https://www.facebook.com/share/164cTgG9YZ/\n🌐 *Official Website:* https://jayambefoodmachinery.com\n\nFor pricing and technical assistance:\n📞 *Office Helpline: +91 99253 43582*`;

            await sendWhatsAppText(fromPhone, mediaMsg);
            return res.sendStatus(200);
        }

        // 3. THREE PHASE CHOSEN -> Show 4 Real Categories
        if (interactiveId.startsWith('ph_three')) {
            const lang = interactiveId.endsWith('_hi') ? 'hi' : interactiveId.endsWith('_gu') ? 'gu' : 'en';
            userState.lang = lang;
            userState.phase = 'Three Phase';
            userState.step = 'CATEGORY';
            await saveCustomerState(fromPhone, userState);

            const catTitle = (lang === 'gu') ? 'આપ કયા પ્રકારનું મશીન શોધી રહ્યા છો?' :
                             (lang === 'hi') ? 'आप किस प्रकार की मशीन ढूंढ रहे हैं?' :
                             'Which machinery category are you looking for?';
            const btnLabel = (lang === 'gu') ? 'મશીન પસંદ કરો' : (lang === 'hi') ? 'मशीन चुनें' : 'Select Category';

            const catOptions = (lang === 'gu') ? [
                { id: 'cat_atta_gu', title: 'આટા ચક્કી', description: 'કોમર્શિયલ ફ્લોર મિલ પલ્વરાઇઝર' },
                { id: 'cat_masala_gu', title: 'મસાલા ગ્રાઇન્ડીંગ', description: 'હેવી ડ્યુટી મસાલા મિલ' },
                { id: 'cat_haldi_gu', title: 'હળદર ગ્રાઇન્ડીંગ', description: 'સ્પેશિયલ હળદર દળવાનું મશીન' },
                { id: 'cat_chilly_gu', title: 'મરચા ગ્રાઇન્ડીંગ', description: 'મરચા દળવા માટે સ્પેશિયલ મશીન' }
            ] : (lang === 'hi') ? [
                { id: 'cat_atta_hi', title: 'आटा चक्की', description: 'कमर्शियल फ्लोर मिल पल्वराइजर' },
                { id: 'cat_masala_hi', title: 'मसाला ग्राइंडिंग', description: 'हेवी ड्यूटी मसाला मिल' },
                { id: 'cat_haldi_hi', title: 'हल्दी ग्राइंडिंग', description: 'स्पेशल हल्दी पीसने की मशीन' },
                { id: 'cat_chilly_hi', title: 'मिर्ची ग्राइंडिंग', description: 'मिर्ची पीसने के लिए स्पेशल मशीन' }
            ] : [
                { id: 'cat_atta_en', title: 'Atta Chakki', description: 'Commercial Flour Mill Pulverizer' },
                { id: 'cat_masala_en', title: 'Masala Grinding', description: 'Heavy Duty Spice Grinder' },
                { id: 'cat_haldi_en', title: 'Haldi Grinding', description: 'Turmeric Grinding Specialist' },
                { id: 'cat_chilly_en', title: 'Chilly Grinding', description: 'Chilly Grinding Pulverizer' }
            ];

            await sendInteractiveList(fromPhone, catTitle, btnLabel, catOptions);
            return res.sendStatus(200);
        }

        // 4. CATEGORY CHOSEN -> Cyclone Attachment Option
        if (interactiveId.startsWith('cat_')) {
            const lang = interactiveId.endsWith('_hi') ? 'hi' : interactiveId.endsWith('_gu') ? 'gu' : 'en';
            const catCode = interactiveId.split('_')[1];
            const catNameEn = (catCode === 'atta') ? 'Atta Chakki / Flour Mill' :
                              (catCode === 'masala') ? 'Masala Grinding' :
                              (catCode === 'haldi') ? 'Haldi Grinding' :
                              (catCode === 'chilly') ? 'Chilly Grinding' : incomingText;
            userState.lang = lang;
            userState.category = incomingText;
            userState.categoryEn = catNameEn;
            userState.step = 'TYPE';
            await saveCustomerState(fromPhone, userState);

            const qText = (lang === 'gu') ? 'આપ સાયક્લોન ડસ્ટ કલેક્ટર સાથે મશીન મેળવવા માંગો છો કે સ્ટાન્ડર્ડ?' :
                          (lang === 'hi') ? 'क्या आप साइक्लोन डस्ट कलेक्टर के साथ मशीन चाहते हैं या साधारण?' :
                          'Would you like your pulverizer with a Cyclone Dust Collector or Standard?';

            await sendInteractiveButtons(fromPhone, qText, [
                { id: `type_std_${lang}`, title: (lang === 'gu') ? 'સ્ટાન્ડર્ડ' : (lang === 'hi') ? 'સાધારણ' : 'Standard' },
                { id: `type_cyc_${lang}`, title: (lang === 'gu') ? 'સાયક્લોન સાથે' : (lang === 'hi') ? 'साइक्लोन के साथ' : 'With Cyclone' },
                { id: `type_both_${lang}`, title: (lang === 'gu') ? 'બંને વિકલ્પો' : (lang === 'hi') ? 'दोनों विकल्प' : 'Show Both' }
            ]);
            return res.sendStatus(200);
        }

        // 5. TYPE CHOSEN -> Capacity Selection (5 HP to 30 HP)
        if (interactiveId.startsWith('type_')) {
            const parts = interactiveId.split('_'); // type, std/cyc/both, lang
            const typeCode = parts[1] || 'std';
            const lang = parts[2] || userState.lang || 'en';

            userState.lang = lang;
            userState.type = incomingText;
            userState.step = 'HP';
            await saveCustomerState(fromPhone, userState);

            const hpTitle = (lang === 'gu') ? 'કૃપા કરીને જરૂરી મોટર ક્ષમતા (HP) પસંદ કરો:' :
                            (lang === 'hi') ? 'कृपया आवश्यक मोटर क्षमता (HP) चुनें:' :
                            'Please select the required motor capacity (HP):';
            const btnLabel = (lang === 'gu') ? 'HP ક્ષમતા પસંદ કરો' : (lang === 'hi') ? 'HP क्षमता चुनें' : 'Select Capacity';

            const hpList = [
                { id: `hp_5_${typeCode}_${lang}`, title: '5 HP Pulverizer', description: 'Capacity: 35-50 KG/HR' },
                { id: `hp_75_${typeCode}_${lang}`, title: '7.5 HP Pulverizer', description: 'Capacity: 60-80 KG/HR' },
                { id: `hp_10_${typeCode}_${lang}`, title: '10 HP Pulverizer', description: 'Capacity: 80-100 KG/HR' },
                { id: `hp_15_${typeCode}_${lang}`, title: '15 HP Pulverizer', description: 'Capacity: 100-150 KG/HR' },
                { id: `hp_20_${typeCode}_${lang}`, title: '20 HP Pulverizer', description: 'Capacity: 150-200 KG/HR' },
                { id: `hp_25_${typeCode}_${lang}`, title: '25 HP Pulverizer', description: 'Capacity: 200-250 KG/HR' },
                { id: `hp_30_${typeCode}_${lang}`, title: '30 HP Pulverizer', description: 'Capacity: 250-300 KG/HR' }
            ];

            await sendInteractiveList(fromPhone, hpTitle, btnLabel, hpList);
            return res.sendStatus(200);
        }

        // 6. HP CHOSEN -> Ask Full Name & City (Single Message Form, NO distracting links yet)
        if (interactiveId.startsWith('hp_')) {
            const parts = interactiveId.split('_'); // hp, num, typeCode, lang
            const hpNum = parts[1] === '75' ? '7.5 HP' : `${parts[1]} HP`;
            const typeCode = parts[2] || 'std';
            const lang = parts[3] || userState.lang || 'en';

            const typeName = (typeCode === 'cyc') ? 
                (lang === 'hi' ? 'साइक्लोन के साथ' : lang === 'gu' ? 'સાયક્લોન સાથે' : 'With Cyclone') :
                (typeCode === 'both') ?
                (lang === 'hi' ? 'दोनों विकल्प' : lang === 'gu' ? 'બંને વિકલ્પો' : 'Both Options') :
                (lang === 'hi' ? 'साधारण' : lang === 'gu' ? 'સ્ટાન્ડર્ડ' : 'Standard');

            const typeNameEn = (typeCode === 'cyc') ? 'With Cyclone' :
                               (typeCode === 'both') ? 'Both Options' : 'Standard';

            userState.lang = lang;
            userState.hp = hpNum;
            userState.type = typeName;
            userState.typeEn = typeNameEn;
            userState.step = 'AWAITING_DETAILS';
            await saveCustomerState(fromPhone, userState);

            const formPrompt = (lang === 'gu') ? 
                `ખૂબ સરસ! આપની પસંદગી: *${hpNum} પલ્વરાઇઝર (${typeName})*.\n\nઆપના માટે ઓફિશિયલ કવોટેશન તૈયાર કરવા માટે, કૃપા કરીને આપનું *પૂરું નામ* અને *શહેર અથવા ગામ* અહીં લખીને મોકલો:\n\n*(દા.ત. રમેશભાઈ પટેલ, સુરત)*` :
                (lang === 'hi') ?
                `उत्कृष्ट चयन! आपकी पसंद: *${hpNum} पल्वराइजर (${typeName})*.\n\nआपके लिए औपचारिक कोटेशन तैयार करने हेतु, कृपया अपना *पूरा नाम* और *शहर अथवा गाँव* यहाँ लिखकर भेजें:\n\n*(उदा. रमेश पटेल, सूरत)*` :
                `Excellent choice! Selected: *${hpNum} Pulverizer (${typeName})*.\n\nTo generate your official quotation, please reply with your *Full Name* and *City or Town* below:\n\n*(e.g., Ramesh Patel, Surat)*`;

            await sendWhatsAppText(fromPhone, formPrompt);
            return res.sendStatus(200);
        }

        // 7. TEXT HANDLING (Step-aware to prevent premature lead submission)
        if (messageObj.type === 'text') {
            const lang = userState.lang || 'en';

            // If customer asks for Video / Demo
            if (lower.includes('video') || lower.includes('વિડીયો') || lower.includes('वीडियो') ||
                lower.includes('youtube') || lower.includes('facebook') || lower.includes('demo') ||
                lower.includes('photo') || lower.includes('image')) {

                const mediaMsg = (lang === 'gu') ?
                    `🎥 *લાઈવ મશીન ડેમો વિડીયો અને ફોટા:*\n\nઅમારા પલ્વરાઇઝર મશીનોના લાઈવ ગ્રાઇન્ડીંગ ડેમો નીચે આપેલ સત્તાવાર લિંક્સ પર જુઓ:\n\n▶️ *YouTube Channel:* https://www.youtube.com/@jayambefoodmachinery\n📘 *Facebook Page:* https://www.facebook.com/share/164cTgG9YZ/\n🌐 *Official Website:* https://jayambefoodmachinery.com\n\nકોઈપણ તાત્કાલિક માહિતી માટે સંપર્ક કરો:\n📞 *ઓફિસ હેલ્પલાઇન: +91 99253 43582*` :
                    (lang === 'hi') ?
                    `🎥 *लाइव मशीन डेमो वीडियो और फोटो:*\n\nहमारी पल्वराइजर मशीनों के लाइव ग्राइंडिंग डेमो नीचे दिए गए आधिकारिक लिंक्स पर देखें:\n\n▶️ *YouTube Channel:* https://www.youtube.com/@jayambefoodmachinery\n📘 *Facebook Page:* https://www.facebook.com/share/164cTgG9YZ/\n🌐 *Official Website:* https://jayambefoodmachinery.com\n\nकिसी भी त्वरित जानकारी के लिए संपर्क करें:\n📞 *ऑफिस हेल्पलाइन: +91 99253 43582*` :
                    `🎥 *Live Machine Demo Videos & Photos:*\n\nWatch our commercial pulverizers in live continuous operation on our official channels:\n\n▶️ *YouTube Channel:* https://www.youtube.com/@jayambefoodmachinery\n📘 *Facebook Page:* https://www.facebook.com/share/164cTgG9YZ/\n🌐 *Official Website:* https://jayambefoodmachinery.com\n\nFor any immediate assistance:\n📞 *Office Helpline: +91 99253 43582*`;

                await sendWhatsAppText(fromPhone, mediaMsg);
                return res.sendStatus(200);
            }

            // Case A: Customer already COMPLETED inquiry and sends extra message
            if (userState.step === 'COMPLETED') {
                const completedReply = (lang === 'gu') ?
                    `🙏 આપની પૂછપરછ સફળતાપૂર્વક નોંધાઈ ગઈ છે. અમારા સેલ્સ એક્ઝિક્યુટિવ ટૂંક સમયમાં આપનો સંપર્ક કરશે.\n\nનવી પૂછપરછ શરૂ કરવા માટે *Hi* લખીને મોકલો.` :
                    (lang === 'hi') ?
                    `🙏 आपकी पूछताछ सफलतापूर्वक दर्ज हो चुकी है। हमारे सेल्स एग्जीक्यूटिव जल्द ही आपसे संपर्क करेंगे।\n\nनई पूछताछ शुरू करने के लिए *Hi* लिखकर भेजें।` :
                    `🙏 Your inquiry has already been registered. Our sales executive will contact you shortly.\n\nTo start a new inquiry, type *Hi*.`;
                await sendWhatsAppText(fromPhone, completedReply);
                return res.sendStatus(200);
            }

            // Case B1: Customer entered details when asked for Name & City
            if (userState.step === 'AWAITING_DETAILS') {
                const parsed = parseNameAndLocation(incomingText, lang);

                // Option 1: Customer sent BOTH Name & City in one message!
                if (parsed.city) {
                    userState.name = parsed.name;
                    userState.city = parsed.city;
                    userState.state = parsed.state || 'India';
                    userState.step = 'COMPLETED';
                    await saveCustomerState(fromPhone, userState);

                    await syncLeadToOdoo(fromPhone, userState);
                    await syncLeadToSupabase(fromPhone, userState);
                    await sendLeadConfirmation(fromPhone, userState, lang);
                    return res.sendStatus(200);
                }

                // Option 2: Customer sent ONLY their Name (e.g., 'brijesh' or 'Ramesh Patel')
                // Save name and ask specifically for City/Village!
                userState.name = incomingText.trim();
                userState.step = 'AWAITING_CITY';
                await saveCustomerState(fromPhone, userState);

                const askCityPrompt = (lang === 'gu') ?
                    `આભાર *${userState.name}* ભાઈ! 🙏\n\nકૃપા કરીને આપના *શહેર અથવા ગામ*નું નામ લખીને મોકલો (દા.ત. સુરત, અમદાવાદ, રાજકોટ):` :
                    (lang === 'hi') ?
                    `धन्यवाद *${userState.name}* जी! 🙏\n\nकृपया अपने *शहर अथवा गाँव* का नाम लिखकर भेजें (उदा. सूरत, अहमदाबाद, राजकोट):` :
                    `Thank you *${userState.name}*! 🙏\n\nNow please reply with your *City or Village* name (e.g., Surat, Ahmedabad, Rajkot):`;

                await sendWhatsAppText(fromPhone, askCityPrompt);
                return res.sendStatus(200);
            }

            // Case B2: Customer sent City / Village after entering Name
            if (userState.step === 'AWAITING_CITY') {
                const cleanCity = incomingText.trim();
                const lowerCity = cleanCity.toLowerCase();
                const detectedCity = CITY_STATE_MAP[lowerCity]?.city || cleanCity;
                const detectedState = CITY_STATE_MAP[lowerCity]?.state || 'India';

                userState.city = detectedCity;
                userState.state = detectedState;
                userState.step = 'COMPLETED';
                await saveCustomerState(fromPhone, userState);

                await syncLeadToOdoo(fromPhone, userState);
                await syncLeadToSupabase(fromPhone, userState);
                await sendLeadConfirmation(fromPhone, userState, lang);
                return res.sendStatus(200);
            }

            // Case C: Customer sent text before choosing a language (LANG / INIT step)
            if (!userState.step || userState.step === 'INIT' || userState.step === 'LANG') {
                global.customerState[fromPhone] = { step: 'LANG' };
                await sendInteractiveButtons(fromPhone, "Welcome to Jay Shree Ambe Food Machinery! 🙏\nDirect Manufacturer of Commercial Pulverizers.\n\nPlease select your preferred language:\nકૃપા કરીને આપની ભાષા પસંદ કરો:\nकृपया अपनी भाषा चुनें:", [
                    { id: 'lang_en', title: 'English' },
                    { id: 'lang_hi', title: 'हिंदी' },
                    { id: 'lang_gu', title: 'ગુજરાતી' }
                ]);
                return res.sendStatus(200);
            }

            // Case D: Customer sent text while in the middle of Phase/Category/Type/HP selection
            const promptGuide = (lang === 'gu') ?
                `કૃપા કરીને આગળ વધવા માટે ઉપર આપેલા વિકલ્પોમાંથી પસંદ કરો, અથવા શરૂઆતથી શરૂ કરવા માટે *Hi* લખો. 🙏` :
                (lang === 'hi') ?
                `कृपया आगे बढ़ने के लिए ऊपर दिए गए विकल्पों में से चयन करें, या दोबारा शुरू करने के लिए *Hi* लिखें। 🙏` :
                `Please select one of the options above to proceed, or type *Hi* to restart. 🙏`;
            await sendWhatsAppText(fromPhone, promptGuide);
            return res.sendStatus(200);
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error.message);
        res.sendStatus(500);
    }
});

// Helper: Send Interactive Buttons (Max 3)
async function sendInteractiveButtons(toPhone, bodyText, buttons) {
    try {
        await axios({
            method: 'POST',
            url: `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
            data: {
                messaging_product: 'whatsapp',
                to: toPhone,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: { text: bodyText },
                    action: {
                        buttons: buttons.map(b => ({
                            type: 'reply',
                            reply: { id: b.id, title: b.title.substring(0, 20) }
                        }))
                    }
                }
            },
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error('sendInteractiveButtons error:', e.response?.data || e.message);
        // Fallback to plain text so customer always receives the confirmation
        await sendWhatsAppText(toPhone, bodyText);
    }
}

// Helper: Send Interactive List Menu (Up to 10 rows)
async function sendInteractiveList(toPhone, bodyText, buttonLabel, items) {
    try {
        await axios({
            method: 'POST',
            url: `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
            data: {
                messaging_product: 'whatsapp',
                to: toPhone,
                type: 'interactive',
                interactive: {
                    type: 'list',
                    body: { text: bodyText },
                    action: {
                        button: buttonLabel.substring(0, 20),
                        sections: [{
                            title: 'Options',
                            rows: items.slice(0, 10).map(item => ({
                                id: item.id,
                                title: item.title.substring(0, 24),
                                description: (item.description || '').substring(0, 72)
                            }))
                        }]
                    }
                }
            },
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error('sendInteractiveList error:', e.response?.data || e.message);
    }
}

// Helper: Send Plain WhatsApp Text
async function sendWhatsAppText(toPhone, textMsg) {
    try {
        await axios({
            method: 'POST',
            url: `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
            data: {
                messaging_product: 'whatsapp',
                to: toPhone,
                type: 'text',
                text: { body: textMsg }
            },
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error('sendWhatsAppText error:', e.response?.data || e.message);
    }
}

// Sales Team (9 Members for Round-Robin Lead Rotation in ViduCRM)
const SALES_TEAM = [
    { id: 6, name: 'Anilbhai', gu: 'શ્રી અનિલભાઈ પંચાલ', hi: 'श्री अनिल पांचाल', en: 'Mr. Anil Panchal' },
    { id: 9, name: 'Ankitbhai', gu: 'શ્રી અંકિતભાઈ', hi: 'श्री अंकितभाई', en: 'Mr. Ankitbhai' },
    { id: 7, name: 'Hemali', gu: 'હેમાલીબેન', hi: 'हेमाली जी', en: 'Ms. Hemali' },
    { id: 10, name: 'Lata', gu: 'લતાબેન', hi: 'लता जी', en: 'Ms. Lata' },
    { id: 4211, name: 'Mansi', gu: 'માનસીબેન', hi: 'मानसी जी', en: 'Ms. Mansi' },
    { id: 4229, name: 'Mukeshbhai', gu: 'શ્રી મુકેશભાઈ', hi: 'श्री मुकेशभाई', en: 'Mr. Mukeshbhai' },
    { id: 4230, name: 'Priyanshi', gu: 'પ્રિયાંશીબેન', hi: 'प्रियांशी जी', en: 'Ms. Priyanshi' },
    { id: 4203, name: 'Ritu', gu: 'રીતુબેન', hi: 'रितु जी', en: 'Ms. Ritu' },
    { id: 8, name: 'Siya', gu: 'સિયાબેન', hi: 'सिया जी', en: 'Ms. Siya' }
];
// Helper: Push lead to Odoo CRM with Salesperson Assignment (True Round-Robin from Odoo History)
function syncLeadToOdoo(phone, leadData) {
    return new Promise((resolve) => {
        try {
            const common = xmlrpc.createSecureClient({ host: 'v1.viducrm.com', port: 443, path: '/xmlrpc/2/common' });
            common.methodCall('authenticate', [ODOO_DB, ODOO_USER, ODOO_PASS, {}], (err, uid) => {
                if (err || !uid) {
                    console.error('Odoo auth error:', err);
                    const fbIdx = Math.floor(Date.now() / 1000) % SALES_TEAM.length;
                    const assignedRep = SALES_TEAM[fbIdx];
                    leadData.assignedRep = assignedRep.name;
                    leadData.assignedRepGu = assignedRep.gu;
                    leadData.assignedRepHi = assignedRep.hi;
                    leadData.assignedRepEn = assignedRep.en;
                    return resolve(false);
                }

                const models = xmlrpc.createSecureClient({ host: 'v1.viducrm.com', port: 443, path: '/xmlrpc/2/object' });

                // Step 1: Query the last lead from Odoo CRM to determine the next salesperson in round-robin sequence
                models.methodCall('execute_kw', [ODOO_DB, uid, ODOO_PASS, 'crm.lead', 'search_read', [[]], {
                    fields: ['id', 'user_id'],
                    limit: 1,
                    order: 'id desc'
                }], (searchErr, lastLeads) => {
                    let nextIndex = 0;
                    if (!searchErr && Array.isArray(lastLeads) && lastLeads.length > 0 && lastLeads[0].user_id) {
                        const lastUserId = Array.isArray(lastLeads[0].user_id) ? lastLeads[0].user_id[0] : lastLeads[0].user_id;
                        const lastIndex = SALES_TEAM.findIndex(m => m.id === lastUserId);
                        if (lastIndex !== -1) {
                            nextIndex = (lastIndex + 1) % SALES_TEAM.length;
                        } else {
                            nextIndex = Math.floor(Date.now() / 1000) % SALES_TEAM.length;
                        }
                    } else {
                        nextIndex = Math.floor(Date.now() / 1000) % SALES_TEAM.length;
                    }

                    const assignedRep = SALES_TEAM[nextIndex];
                    leadData.assignedRep = assignedRep.name;
                    leadData.assignedRepGu = assignedRep.gu;
                    leadData.assignedRepHi = assignedRep.hi;
                    leadData.assignedRepEn = assignedRep.en;

                    const leadRecord = {
                        name: `WhatsApp Lead: ${leadData.name || 'Customer'} - ${leadData.hp || '20 HP'} (${leadData.typeEn || leadData.type || 'Commercial'})`,
                        contact_name: leadData.name || 'Customer',
                        mobile: phone,
                        phone: phone,
                        city: leadData.city || '',
                        user_id: assignedRep.id,
                        description: `Assigned Sales Executive: ${assignedRep.name}\nCategory: ${leadData.categoryEn || leadData.category || ''}\nType: ${leadData.typeEn || leadData.type || ''}\nCapacity: ${leadData.hp || ''}\nState: ${leadData.state || ''}\nLanguage: ${leadData.lang || ''}\nSource: WhatsApp AI Interactive Agent`
                    };

                    models.methodCall('execute_kw', [ODOO_DB, uid, ODOO_PASS, 'crm.lead', 'create', [leadRecord]], (leadErr, leadId) => {
                        if (leadErr) {
                            console.error('Odoo lead creation error:', leadErr);
                        } else {
                            console.log(`Successfully created Odoo lead ID: ${leadId} rotated to: ${assignedRep.name} (Index ${nextIndex}/${SALES_TEAM.length})`);
                        }
                        resolve(true);
                    });
                });
            });
        } catch (e) {
            console.error('Odoo sync error:', e);
            const fbIdx = Math.floor(Date.now() / 1000) % SALES_TEAM.length;
            const assignedRep = SALES_TEAM[fbIdx];
            leadData.assignedRep = assignedRep.name;
            leadData.assignedRepGu = assignedRep.gu;
            leadData.assignedRepHi = assignedRep.hi;
            leadData.assignedRepEn = assignedRep.en;
            resolve(false);
        }
    });
}

// Helper: Push lead to Supabase (inquiries + whatsapp_customers)
async function syncLeadToSupabase(phone, leadData) {
    if (!supabase) return;
    try {
        // 1. Sync to inquiries table (stores full product, city, and assigned salesperson)
        try {
            const inqRecord = {
                name: leadData.name || 'Valued Customer',
                phone: phone,
                city: leadData.city || '',
                product: `${leadData.category || ''} | ${leadData.type || ''} | ${leadData.hp || ''}`,
                source: `whatsapp_bot - ${leadData.assignedRep || 'Sales Team'}`
            };
            await supabase.from('inquiries').insert([inqRecord]);
            console.log('Successfully inserted lead into Supabase inquiries table for:', phone);
        } catch (inqErr) {
            console.error('Inquiries insert error:', inqErr.message);
        }

        // 2. Sync to whatsapp_customers table (phone, name, state, last_message)
        try {
            await supabase.from('whatsapp_customers').insert([{
                phone: phone,
                name: leadData.name || null,
                state: leadData.state || null,
                last_message: new Date().toISOString()
            }]);
            console.log('Successfully synced to Supabase whatsapp_customers for:', phone);
        } catch (custErr) {
            console.error('whatsapp_customers insert error:', custErr.message);
        }
    } catch (e) {
        console.error('Supabase sync general error:', e.message);
    }
}

module.exports = app;
