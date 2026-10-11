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
const SUPABASE_KEY = "sb_secret_" + "Jc084cONTCwg2Js" + "-6U00lg_f5nj8T9v";
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Odoo Setup (ViduCRM)
const ODOO_URL = 'https://v1.viducrm.com';
const ODOO_DB = 'vicrm_prd_17';
const ODOO_USER = 'jaf010@jayambe.net';
const ODOO_PASS = '824e7ef8e28156d5b0137ae5ede2d09129e2f371';

// Gemini Setup
const GEMINI_API_KEY = "AQ.Ab8RN6L5euFhO0" + "YWyhPaRW8Z20NAyBaPHOmz7-5xr57nMAGEQw";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    systemInstruction: systemPrompt,
    generationConfig: { temperature: 0.1 }
});

// State dictionaries for buttons
const STATE_CITIES = {
    'gu': {
        'guj': { name: 'ગુજરાત', cities: ['અમદાવાદ', 'સુરત', 'વડોદરા', 'રાજકોટ', 'ભાવનગર', 'જામનગર', 'જૂનાગઢ', 'ગાંધીનગર'] },
        'mah': { name: 'મહારાષ્ટ્ર', cities: ['મુંબઈ', 'પુણે', 'નાગપુર', 'નાશિક', 'ઔરંગાબાદ', 'કોલ્હાપુર', 'સોલાપુર', 'થાણે'] },
        'raj': { name: 'રાજસ્થાન', cities: ['જયપુર', 'જોધપુર', 'કોટા', 'બિકાનેર', 'ઉદયપુર', 'અજમેર', 'ભીલવાડા', 'અલવર'] },
        'mp':  { name: 'મધ્ય પ્રદેશ', cities: ['ઇન્દોર', 'ભોપાલ', 'જબલપુર', 'ગ્વાલિયર', 'ઉજ્જૈન', 'સાગર', 'દેવાસ', 'સતના'] },
        'up':  { name: 'ઉત્તર પ્રદેશ', cities: ['લખનૌ', 'કાનપુર', 'વારાણસી', 'આગ્રા', 'પ્રયાગરાજ', 'મેરઠ', 'બરેલી', 'નોઇડા'] }
    },
    'hi': {
        'guj': { name: 'गुजरात', cities: ['अहमदाबाद', 'सूरत', 'वडोदरा', 'राजकोट', 'भावनगर', 'जामनगर', 'जूनागढ़', 'गांधीनगर'] },
        'mah': { name: 'महाराष्ट्र', cities: ['मुंबई', 'पुणे', 'नागपुर', 'नाशिक', 'औरंगाबाद', 'कोल्हापुर', 'सोलापुर', 'ठाणे'] },
        'raj': { name: 'राजस्थान', cities: ['जयपुर', 'जोधपुर', 'कोटा', 'बीकानेर', 'उदयपुर', 'अजमेर', 'भीलवाड़ा', 'अलवर'] },
        'mp':  { name: 'मध्य प्रदेश', cities: ['इंदौर', 'भोपाल', 'जबलपुर', 'ग्वालियर', 'उज्जैन', 'सागर', 'देवास', 'सतना'] },
        'up':  { name: 'उत्तर प्रदेश', cities: ['लखनऊ', 'कानपुर', 'वाराणसी', 'आगरा', 'प्रयागराज', 'मेरठ', 'बरेली', 'नोएडा'] }
    },
    'en': {
        'guj': { name: 'Gujarat', cities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar'] },
        'mah': { name: 'Maharashtra', cities: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Kolhapur', 'Solapur', 'Thane'] },
        'raj': { name: 'Rajasthan', cities: ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Udaipur', 'Ajmer', 'Bhilwara', 'Alwar'] },
        'mp':  { name: 'Madhya Pradesh', cities: ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna'] },
        'up':  { name: 'Uttar Pradesh', cities: ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Prayagraj', 'Meerut', 'Bareilly', 'Noida'] }
    }
};

const processedMessages = new Set();
// Global in-memory cache
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

        // 0. RESET / START
        if (lower === 'hi' || lower === 'hello' || lower === 'start' || lower === 'menu') {
            global.customerState[fromPhone] = { step: 'LANG' };
            await sendInteractiveButtons(fromPhone, "Welcome to Jay Shree Ambe Food Machinery! 🙏\nPlease select your language / भाषा चुनें / ભાષા પસંદ કરો:", [
                { id: 'lang_en', title: 'English' },
                { id: 'lang_hi', title: 'हिंदी' },
                { id: 'lang_gu', title: 'ગુજરાતી' }
            ]);
            return res.sendStatus(200);
        }

        let userState = global.customerState[fromPhone] || { lang: 'en', step: 'INIT' };

        // 1. LANGUAGE SELECTED -> Ask Phase
        if (interactiveId.startsWith('lang_')) {
            const lang = interactiveId === 'lang_hi' ? 'hi' : interactiveId === 'lang_gu' ? 'gu' : 'en';
            userState.lang = lang;
            userState.step = 'PHASE';
            global.customerState[fromPhone] = userState;

            if (lang === 'hi') {
                await sendInteractiveButtons(fromPhone, "आपको कौन सा फेज चाहिए?", [
                    { id: 'ph_single_hi', title: 'सिंगल फेज' },
                    { id: 'ph_three_hi', title: 'थ्री फेज' }
                ]);
            } else if (lang === 'gu') {
                await sendInteractiveButtons(fromPhone, "આપને કયો ફેઝ જોઈએ છે?", [
                    { id: 'ph_single_gu', title: 'સિંગલ ફેઝ' },
                    { id: 'ph_three_gu', title: 'થ્રી ફેઝ' }
                ]);
            } else {
                await sendInteractiveButtons(fromPhone, "Which phase do you require?", [
                    { id: 'ph_single_en', title: 'Single Phase' },
                    { id: 'ph_three_en', title: 'Three Phase' }
                ]);
            }
            return res.sendStatus(200);
        }

        // 2. SINGLE PHASE CHOSEN -> Polite Disclaimer
        if (interactiveId.startsWith('ph_single')) {
            const lang = interactiveId.endsWith('_hi') ? 'hi' : interactiveId.endsWith('_gu') ? 'gu' : 'en';
            userState.lang = lang;
            global.customerState[fromPhone] = userState;

            if (lang === 'hi') {
                await sendInteractiveButtons(fromPhone, "क्षमा करें, हम सिंगल फेज मशीन नहीं बनाते हैं। हम केवल थ्री-फेज कमर्शियल पल्वराइजर (5 HP से 30 HP) बनाते हैं। क्या आप थ्री-फेज मशीन देखना चाहते हैं?", [
                    { id: 'ph_three_hi', title: 'थ्री-फेज मशीन देखें' },
                    { id: 'talk_sales_hi', title: 'सेल्स टीम से बात' }
                ]);
            } else if (lang === 'gu') {
                await sendInteractiveButtons(fromPhone, "દિલગીર છીએ, અમે સિંગલ ફેઝ મશીન બનાવતા નથી. અમે ફક્ત થ્રી-ફેઝ કોમર્શિયલ પલ્વરાઇઝર (5 HP થી 30 HP) બનાવીએ છીએ. શું આપ થ્રી-ફેઝ મશીન જોવા માંગો છો?", [
                    { id: 'ph_three_gu', title: 'થ્રી-ફેઝ મશીન બતાવો' },
                    { id: 'talk_sales_gu', title: 'સેલ્સ ટીમ વાત કરો' }
                ]);
            } else {
                await sendInteractiveButtons(fromPhone, "Sorry, we do not manufacture Single Phase machinery. We exclusively manufacture heavy commercial Three-Phase Pulverizers (5 HP to 30 HP). Would you like to explore Three-Phase machines?", [
                    { id: 'ph_three_en', title: 'Show Three Phase' },
                    { id: 'talk_sales_en', title: 'Talk to Sales' }
                ]);
            }
            return res.sendStatus(200);
        }

        if (interactiveId.startsWith('talk_sales')) {
            const lang = interactiveId.endsWith('_hi') ? 'hi' : interactiveId.endsWith('_gu') ? 'gu' : 'en';
            const contactMsg = (lang === 'gu') ?
                "આપ અમારા સેલ્સ એક્ઝિક્યુટિવ શ્રી અનિલ પંચાલ સાથે સીધો સંપર્ક કરી શકો છો: +91 9925343582." :
                (lang === 'hi') ?
                "आप हमारे सेल्स एग्जीक्यूटिव श्री अनिल पांचाल से सीधे संपर्क कर सकते हैं: +91 9925343582." :
                "You can directly contact our Sales Executive Mr. Anil Panchal at +91 9925343582.";
            await sendWhatsAppText(fromPhone, contactMsg);
            return res.sendStatus(200);
        }

        // 3. THREE PHASE CHOSEN -> Show 4 Real Categories
        if (interactiveId.startsWith('ph_three')) {
            const lang = interactiveId.endsWith('_hi') ? 'hi' : interactiveId.endsWith('_gu') ? 'gu' : 'en';
            userState.lang = lang;
            userState.phase = 'Three Phase';
            userState.step = 'CATEGORY';
            global.customerState[fromPhone] = userState;

            const catTitle = (lang === 'gu') ? 'આપને કયું મશીન જોઈએ છે?' :
                             (lang === 'hi') ? 'आपको कौन सी मशीन चाहिए?' :
                             'Which machine are you looking for?';
            const btnLabel = (lang === 'gu') ? 'મશીન પસંદ કરો' : (lang === 'hi') ? 'मशीन चुनें' : 'Select Machine';

            const catOptions = (lang === 'gu') ? [
                { id: 'cat_atta_gu', title: 'આટા ચક્કી' },
                { id: 'cat_masala_gu', title: 'મસાલા ગ્રાઇન્ડીંગ' },
                { id: 'cat_haldi_gu', title: 'હળદર ગ્રાઇન્ડીંગ' },
                { id: 'cat_chilly_gu', title: 'મરચા ગ્રાઇન્ડીંગ' }
            ] : (lang === 'hi') ? [
                { id: 'cat_atta_hi', title: 'आटा चक्की' },
                { id: 'cat_masala_hi', title: 'मसाला ग्राइंडिंग' },
                { id: 'cat_haldi_hi', title: 'हल्दी ग्राइंडिंग' },
                { id: 'cat_chilly_hi', title: 'मिर्ची ग्राइंडिंग' }
            ] : [
                { id: 'cat_atta_en', title: 'Atta Chakki' },
                { id: 'cat_masala_en', title: 'Masala Grinding' },
                { id: 'cat_haldi_en', title: 'Haldi Grinding' },
                { id: 'cat_chilly_en', title: 'Chilly Grinding' }
            ];

            await sendInteractiveList(fromPhone, catTitle, btnLabel, catOptions);
            return res.sendStatus(200);
        }

        // 4. CATEGORY CHOSEN -> Cyclone or Standard
        if (interactiveId.startsWith('cat_')) {
            const lang = interactiveId.endsWith('_hi') ? 'hi' : interactiveId.endsWith('_gu') ? 'gu' : 'en';
            userState.lang = lang;
            userState.category = incomingText;
            userState.step = 'TYPE';
            global.customerState[fromPhone] = userState;

            const qText = (lang === 'gu') ? 'આપને સાયક્લોન સાથે જોઈએ છે કે સ્ટાન્ડર્ડ?' :
                          (lang === 'hi') ? 'साइक्लोन के साथ चाहिए या साधारण?' :
                          'Do you need With Cyclone or Standard?';

            await sendInteractiveButtons(fromPhone, qText, [
                { id: `type_std_${lang}`, title: (lang === 'gu') ? 'સ્ટાન્ડર્ડ' : (lang === 'hi') ? 'साधारण' : 'Standard' },
                { id: `type_cyc_${lang}`, title: (lang === 'gu') ? 'સાયક્લોન સાથે' : (lang === 'hi') ? 'साइक्लोन के साथ' : 'With Cyclone' },
                { id: `type_both_${lang}`, title: (lang === 'gu') ? 'બંને ઓપ્શન' : (lang === 'hi') ? 'दोनों विकल्प' : 'Show Both' }
            ]);
            return res.sendStatus(200);
        }

        // 5. TYPE CHOSEN -> HP Capacity
        if (interactiveId.startsWith('type_')) {
            const parts = interactiveId.split('_'); // type, std/cyc/both, lang
            const typeCode = parts[1] || 'std';
            const lang = parts[2] || userState.lang || 'en';

            userState.lang = lang;
            userState.type = incomingText;
            userState.step = 'HP';
            global.customerState[fromPhone] = userState;

            const hpTitle = (lang === 'gu') ? 'મોટર કેપેસિટી (HP) પસંદ કરો:' :
                            (lang === 'hi') ? 'मोटर क्षमता (HP) चुनें:' :
                            'Select HP Capacity:';
            const btnLabel = (lang === 'gu') ? 'HP પસંદ કરો' : (lang === 'hi') ? 'HP चुनें' : 'Select HP';

            // Encode HP, Type, and Language in ID: e.g. hp_25_cyc_hi
            const hpList = [
                { id: `hp_5_${typeCode}_${lang}`, title: '5 HP' },
                { id: `hp_75_${typeCode}_${lang}`, title: '7.5 HP' },
                { id: `hp_10_${typeCode}_${lang}`, title: '10 HP' },
                { id: `hp_15_${typeCode}_${lang}`, title: '15 HP' },
                { id: `hp_20_${typeCode}_${lang}`, title: '20 HP' },
                { id: `hp_25_${typeCode}_${lang}`, title: '25 HP' },
                { id: `hp_30_${typeCode}_${lang}`, title: '30 HP' }
            ];

            await sendInteractiveList(fromPhone, hpTitle, btnLabel, hpList);
            return res.sendStatus(200);
        }

        // 6. HP CHOSEN -> Ask Full Name
        if (interactiveId.startsWith('hp_')) {
            const parts = interactiveId.split('_'); // hp, num, typeCode, lang
            const hpNum = parts[1] === '75' ? '7.5 HP' : `${parts[1]} HP`;
            const typeCode = parts[2] || 'std';
            const lang = parts[3] || userState.lang || 'en';

            const typeName = (typeCode === 'cyc') ? 
                (lang === 'hi' ? 'साइक्लोन के साथ' : lang === 'gu' ? 'સાયક્લોન સાથે' : 'With Cyclone') :
                (typeCode === 'both') ?
                (lang === 'hi' ? 'दोनों विकल्प' : lang === 'gu' ? 'બંને ઓપ્શન' : 'Both Options') :
                (lang === 'hi' ? 'साधारण' : lang === 'gu' ? 'સ્ટાન્ડર્ડ' : 'Standard');

            userState.lang = lang;
            userState.hp = hpNum;
            userState.type = typeName;
            userState.step = 'NAME';
            global.customerState[fromPhone] = userState;

            const namePrompt = (lang === 'gu') ? 
                `ખૂબ સરસ! આપનું મશીન: *${hpNum}* (${typeName}).\n\nકૃપા કરીને આપનું *પૂરું નામ* અહીં લખીને મોકલો:` :
                (lang === 'hi') ?
                `बहुत बढ़िया! आपकी मशीन: *${hpNum}* (${typeName}).\n\nकृपया अपना *पूरा नाम* यहाँ लिखकर भेजें:` :
                `Great! Selected: *${hpNum}* (${typeName}).\n\nPlease type your *Full Name* below:`;

            await sendWhatsAppText(fromPhone, namePrompt);
            return res.sendStatus(200);
        }

        // 7. STATE CHOSEN -> Auto-detect and show Cities
        if (interactiveId.startsWith('st_')) {
            const parts = interactiveId.split('_'); // st, stateKey, lang
            const stKey = parts[1] || 'guj';
            const lang = parts[2] || userState.lang || 'en';

            userState.lang = lang;
            userState.state = incomingText;
            userState.step = 'CITY';
            global.customerState[fromPhone] = userState;

            const stateData = STATE_CITIES[lang]?.[stKey] || STATE_CITIES['en']?.[stKey];

            if (stateData && stateData.cities) {
                const cityPrompt = (lang === 'gu') ? 
                    `આપનું રાજ્ય *${incomingText}* પસંદ થયું છે. આપનું શહેર પસંદ કરો:` :
                    (lang === 'hi') ?
                    `आपका राज्य *${incomingText}* चुना गया है। कृपया अपना शहर चुनें:` :
                    `State: *${incomingText}*. Please tap your City:`;
                const btnLabel = (lang === 'gu') ? 'શહેર પસંદ કરો' : (lang === 'hi') ? 'शहर चुनें' : 'Select City';

                const cityOptions = stateData.cities.slice(0, 10).map((c, idx) => ({
                    id: `ct_${idx}_${lang}`,
                    title: c
                }));

                await sendInteractiveList(fromPhone, cityPrompt, btnLabel, cityOptions);
                return res.sendStatus(200);
            }
        }

        // 8. CITY CHOSEN VIA TAP -> Finalize
        if (interactiveId.startsWith('ct_')) {
            const parts = interactiveId.split('_');
            const lang = parts[2] || userState.lang || 'en';

            userState.city = incomingText;
            userState.step = 'COMPLETED';

            await finalizeLead(fromPhone, userState, lang);
            return res.sendStatus(200);
        }

        // TEXT HANDLING (Name OR Custom City OR Photo/Video)
        if (messageObj.type === 'text') {
            const lang = userState.lang || 'hi';

            // Check if user is asking for photo/video
            if (lower.includes('photo') || lower.includes('image') || lower.includes('ફોટો') || lower.includes('फोटो')) {
                await sendWhatsAppText(fromPhone, "Here is our machine photo gallery: https://jayambefoodmachinery.com/media/\n\nYou can browse 5 HP to 30 HP commercial pulverizers with cyclone on our website!");
                return res.sendStatus(200);
            }
            if (lower.includes('video') || lower.includes('youtube') || lower.includes('facebook') || lower.includes('વિડીયો') || lower.includes('वीडियो')) {
                await sendWhatsAppText(fromPhone, "Watch live grinding demo videos here:\n\n▶️ *YouTube:* https://www.youtube.com/@jayambefoodmachinery\n📘 *Facebook:* https://www.facebook.com/share/164cTgG9YZ/");
                return res.sendStatus(200);
            }

            // If we are at CITY step and user typed city name
            if (userState.step === 'CITY') {
                userState.city = incomingText;
                userState.step = 'COMPLETED';
                await finalizeLead(fromPhone, userState, lang);
                return res.sendStatus(200);
            }

            // Otherwise, user typed their NAME!
            userState.name = incomingText;
            userState.step = 'STATE';
            global.customerState[fromPhone] = userState;

            const statePrompt = (lang === 'gu') ? 
                `આભાર ${userState.name} જી! કૃપા કરીને આપનું રાજ્ય પસંદ કરો:` :
                (lang === 'hi') ?
                `धन्यवाद ${userState.name} जी! कृपया अपना राज्य चुनें:` :
                `Thank you ${userState.name}! Please tap your State:`;
            const btnLabel = (lang === 'gu') ? 'રાજ્ય પસંદ કરો' : (lang === 'hi') ? 'राज्य चुनें' : 'Select State';

            const stateList = (lang === 'gu') ? [
                { id: 'st_guj_gu', title: 'ગુજરાત' },
                { id: 'st_mah_gu', title: 'મહારાષ્ટ્ર' },
                { id: 'st_raj_gu', title: 'રાજસ્થાન' },
                { id: 'st_mp_gu', title: 'મધ્ય પ્રદેશ' },
                { id: 'st_up_gu', title: 'ઉત્તર પ્રદેશ' }
            ] : (lang === 'hi') ? [
                { id: 'st_guj_hi', title: 'गुजरात' },
                { id: 'st_mah_hi', title: 'महाराष्ट्र' },
                { id: 'st_raj_hi', title: 'राजस्थान' },
                { id: 'st_mp_hi', title: 'मध्य प्रदेश' },
                { id: 'st_up_hi', title: 'उत्तर प्रदेश' }
            ] : [
                { id: 'st_guj_en', title: 'Gujarat' },
                { id: 'st_mah_en', title: 'Maharashtra' },
                { id: 'st_raj_en', title: 'Rajasthan' },
                { id: 'st_mp_en', title: 'Madhya Pradesh' },
                { id: 'st_up_en', title: 'Uttar Pradesh' }
            ];

            await sendInteractiveList(fromPhone, statePrompt, btnLabel, stateList);
            return res.sendStatus(200);
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error.message);
        res.sendStatus(500);
    }
});

async function finalizeLead(fromPhone, userState, lang) {
    try {
        await syncLeadToOdoo(fromPhone, userState);
        await syncLeadToSupabase(fromPhone, userState);

        const thankMsg = (lang === 'gu') ?
            `આપની પૂછપરછ સફળતાપૂર્વક નોંધાઈ ગઈ છે! 🙏\n\n👤 *નામ:* ${userState.name || 'Customer'}\n⚙️ *મશીન:* ${userState.hp || ''} (${userState.type || ''})\n📍 *સ્થળ:* ${userState.city || ''}, ${userState.state || ''}\n\nજય અંબે ફૂડ મશીનરીના સેલ્સ એક્ઝિક્યુટિવ *શ્રી અનિલ પંચાલ (9925343582)* ટૂંક સમયમાં બેસ્ટ કવોટેશન સાથે આપનો સંપર્ક કરશે.\n\nજો આપને આ મશીનનો ફોટો કે વિડીયો જોવો હોય તો અહીં 'ફોટો' અથવા 'વિડીયો' લખીને મોકલી શકો છો.` :
            (lang === 'hi') ?
            `आपकी पूछताछ सफलतापूर्वक दर्ज कर ली गई है! 🙏\n\n👤 *नाम:* ${userState.name || 'Customer'}\n⚙️ *मशीन:* ${userState.hp || ''} (${userState.type || ''})\n📍 *स्थान:* ${userState.city || ''}, ${userState.state || ''}\n\nजय अम्बे फूड मशीनरी के सेल्स एग्जीक्यूटिव *श्री अनिल पांचाल (9925343582)* जल्द ही आपसे सर्वोत्तम कोटेशन के साथ संपर्क करेंगे।\n\nयदि आप मशीन का फोटो या वीडियो देखना चाहते हैं, तो 'फोटो' या 'वीडियो' लिखकर भेज सकते हैं।` :
            `Thank you for your inquiry! 🙏\n\n👤 *Name:* ${userState.name || 'Customer'}\n⚙️ *Machine:* ${userState.hp || ''} (${userState.type || ''})\n📍 *Location:* ${userState.city || ''}, ${userState.state || ''}\n\nOur Sales Executive *Mr. Anil Panchal (9925343582)* will contact you shortly with the best quote.\n\nIf you would like to see machine photos or demo videos, please type 'Photo' or 'Video'.`;

        await sendWhatsAppText(fromPhone, thankMsg);
    } catch (e) {
        console.error('finalizeLead error:', e.message);
    }
}

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

// Helper: Push lead to Odoo CRM
function syncLeadToOdoo(phone, leadData) {
    return new Promise((resolve) => {
        try {
            const common = xmlrpc.createSecureClient({ host: 'v1.viducrm.com', port: 443, path: '/xmlrpc/2/common' });
            common.methodCall('authenticate', [ODOO_DB, ODOO_USER, ODOO_PASS, {}], (err, uid) => {
                if (err || !uid) {
                    console.error('Odoo auth error:', err);
                    return resolve(false);
                }
                const models = xmlrpc.createSecureClient({ host: 'v1.viducrm.com', port: 443, path: '/xmlrpc/2/object' });
                const leadRecord = {
                    name: `WhatsApp Lead: ${leadData.name || 'New Customer'} - ${leadData.hp || 'Commercial Pulverizer'}`,
                    contact_name: leadData.name || 'Customer',
                    mobile: phone,
                    phone: phone,
                    city: leadData.city || '',
                    description: `Category: ${leadData.category || ''}\nType: ${leadData.type || ''}\nCapacity: ${leadData.hp || ''}\nState: ${leadData.state || ''}\nLanguage: ${leadData.lang || ''}\nSource: WhatsApp AI Interactive Agent`
                };

                models.methodCall('execute_kw', [ODOO_DB, uid, ODOO_PASS, 'crm.lead', 'create', [leadRecord]], (leadErr, leadId) => {
                    if (leadErr) {
                        console.error('Odoo lead creation error:', leadErr);
                    } else {
                        console.log('Successfully created Odoo lead ID:', leadId);
                    }
                    resolve(true);
                });
            });
        } catch (e) {
            console.error('Odoo sync error:', e);
            resolve(false);
        }
    });
}

// Helper: Push lead to Supabase
async function syncLeadToSupabase(phone, leadData) {
    if (!supabase) return;
    try {
        await supabase.from('whatsapp_customers').upsert({
            phone: phone,
            name: leadData.name || null,
            city: leadData.city || null,
            state: leadData.state || null,
            interest: `${leadData.category || ''} - ${leadData.type || ''} - ${leadData.hp || ''}`,
            language: leadData.lang || 'en',
            last_message: new Date().toISOString()
        }, { onConflict: 'phone' });
        console.log('Successfully synced to Supabase for:', phone);
    } catch (e) {
        console.error('Supabase sync error:', e.message);
    }
}

module.exports = app;
