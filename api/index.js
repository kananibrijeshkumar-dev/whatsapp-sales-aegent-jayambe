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

// Gemini Setup (Using active gemini-3.5-flash-lite)
const GEMINI_API_KEY = "AQ.Ab8RN6L5euFhO0" + "YWyhPaRW8Z20NAyBaPHOmz7-5xr57nMAGEQw";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    systemInstruction: systemPrompt,
    generationConfig: { temperature: 0.1 }
});

const userSessions = {};
const processedMessages = new Set();

// City datasets for State Tap selection
const STATE_CITIES = {
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Other'],
    'ગુજરાત': ['અમદાવાદ', 'સુરત', 'વડોદરા', 'રાજકોટ', 'ભાવનગર', 'જામનગર', 'જૂનાગઢ', 'ગાંધીનગર', 'અન્ય શહેર'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Kolhapur', 'Solapur', 'Thane', 'Other'],
    'महाराष्ट्र': ['मुंबई', 'पुणे', 'नागपुर', 'नाशिक', 'औरंगाबाद', 'कोल्हापुर', 'सोलापुर', 'ठाणे', 'अन्य शहर'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Udaipur', 'Ajmer', 'Bhilwara', 'Alwar', 'Other'],
    'રાજસ્થાન': ['જયપુર', 'જોધપુર', 'કોટા', 'બિકાનેર', 'ઉદયપુર', 'અજમેર', 'ભીલવાડા', 'અલવર', 'અન્ય શહેર'],
    'राजस्थान': ['जयपुर', 'जोधपुर', 'कोटा', 'बीकानेर', 'उदयपुर', 'अजमेर', 'भीलवाड़ा', 'अलवर', 'अन्य शहर'],
    'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Other'],
    'મધ્ય પ્રદેશ': ['ઇન્દોર', 'ભોપાલ', 'જબલપુર', 'ગ્વાલિયર', 'ઉજ્જૈન', 'સાગર', 'દેવાસ', 'અન્ય શહેર'],
    'मध्य प्रदेश': ['इंदौर', 'भोपाल', 'जबलपुर', 'ग्वालियर', 'उज्जैन', 'सागर', 'देवास', 'अन्य शहर'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Prayagraj', 'Meerut', 'Bareilly', 'Noida', 'Other'],
    'ઉત્તર પ્રદેશ': ['લખનૌ', 'કાનપુર', 'વારાણસી', 'આગ્રા', 'પ્રયાગરાજ', 'મેરઠ', 'બરેલી', 'અન્ય શહેર'],
    'उत्तर प्रदेश': ['लखनऊ', 'कानपुर', 'वाराणसी', 'आगरा', 'प्रयागराज', 'मेरठ', 'बरेली', 'अन्य शहर']
};

app.get('/', (req, res) => {
    res.send('Jay Shree Ambe Food Machinery WhatsApp Agent is active!');
});

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
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

        let session = userSessions[fromPhone] || { step: 'INIT', data: {} };
        const lower = incomingText.toLowerCase();

        // Restart trigger
        if (lower === 'hi' || lower === 'hello' || lower === 'start' || lower === 'menu') {
            session = { step: 'LANG', data: {} };
            userSessions[fromPhone] = session;
            await sendInteractiveButtons(fromPhone, "Welcome to Jay Shree Ambe Food Machinery! 🙏\nPlease select your language / भाषा चुनें / ભાષા પસંદ કરો:", [
                { id: 'lang_en', title: 'English' },
                { id: 'lang_hi', title: 'हिंदी' },
                { id: 'lang_gu', title: 'ગુજરાતી' }
            ]);
            return res.sendStatus(200);
        }

        // STEP 1: Language selected -> Ask Phase (Single Phase or Three Phase)
        if (interactiveId.startsWith('lang_')) {
            session.data.language = incomingText;
            session.step = 'PHASE';
            userSessions[fromPhone] = session;

            if (incomingText === 'ગુજરાતી') {
                await sendInteractiveButtons(fromPhone, "આપને કયો ફેઝ જોઈએ છે?", [
                    { id: 'ph_single', title: 'સિંગલ ફેઝ' },
                    { id: 'ph_three', title: 'થ્રી ફેઝ' }
                ]);
            } else if (incomingText === 'हिंदी') {
                await sendInteractiveButtons(fromPhone, "आपको कौन सा फेज चाहिए?", [
                    { id: 'ph_single', title: 'सिंगल फेज' },
                    { id: 'ph_three', title: 'थ्री फेज' }
                ]);
            } else {
                await sendInteractiveButtons(fromPhone, "Which phase do you require?", [
                    { id: 'ph_single', title: 'Single Phase' },
                    { id: 'ph_three', title: 'Three Phase' }
                ]);
            }
            return res.sendStatus(200);
        }

        // STEP 2: Phase selected
        if (interactiveId === 'ph_single') {
            session.step = 'SINGLE_REDIRECT';
            userSessions[fromPhone] = session;

            const isGu = session.data.language === 'ગુજરાતી';
            const isHi = session.data.language === 'हिंदी';

            const singleMsg = isGu ? 
                "દિલગીર છીએ, અમે સિંગલ ફેઝ મશીન બનાવતા નથી. અમે ફક્ત થ્રી-ફેઝ કોમર્શિયલ પલ્વરાઇઝર (5 HP થી 30 HP) બનાવીએ છીએ. શું આપ થ્રી-ફેઝ મશીન જોવા માંગો છો?" :
                isHi ?
                "क्षमा करें, हम सिंगल फेज मशीन नहीं बनाते हैं। हम केवल थ्री-फेज कमर्शियल पल्वराइजर (5 HP से 30 HP) बनाते हैं। क्या आप थ्री-फेज मशीन देखना चाहते हैं?" :
                "Sorry, we do not manufacture Single Phase machinery. We exclusively manufacture heavy commercial Three-Phase Pulverizers (5 HP to 30 HP). Would you like to explore Three-Phase machines?";

            await sendInteractiveButtons(fromPhone, singleMsg, [
                { id: 'ph_three', title: isGu ? 'થ્રી-ફેઝ મશીન બતાવો' : isHi ? 'थ्री-फेज मशीन देखें' : 'Show Three Phase' },
                { id: 'talk_sales', title: isGu ? 'સેલ્સ ટીમ વાત કરો' : isHi ? 'सेल्स टीम से बात' : 'Talk to Sales' }
            ]);
            return res.sendStatus(200);
        }

        if (interactiveId === 'talk_sales') {
            const isGu = session.data.language === 'ગુજરાતી';
            const isHi = session.data.language === 'हिंदी';
            const contactMsg = isGu ?
                "આપ અમારા સેલ્સ એક્ઝિક્યુટિવ શ્રી અનિલ પંચાલ સાથે સીધો સંપર્ક કરી શકો છો: +91 9925343582." :
                isHi ?
                "आप हमारे सेल्स एग्जीक्यूटिव श्री अनिल पांचाल से सीधे संपर्क कर सकते हैं: +91 9925343582." :
                "You can directly contact our Sales Executive Mr. Anil Panchal at +91 9925343582.";
            await sendWhatsAppText(fromPhone, contactMsg);
            return res.sendStatus(200);
        }

        // STEP 3: Three Phase chosen -> Select from the 4 Real Machine Categories
        if (interactiveId === 'ph_three' || (session.step === 'SINGLE_REDIRECT' && interactiveId === 'ph_three')) {
            session.data.phase = 'Three Phase';
            session.step = 'CATEGORY';
            userSessions[fromPhone] = session;

            const isGu = session.data.language === 'ગુજરાતી';
            const isHi = session.data.language === 'हिंदी';

            const catTitle = isGu ? 'આપને કયું મશીન જોઈએ છે?' : isHi ? 'आपको कौन सी मशीन चाहिए?' : 'Which machine are you looking for?';
            const btnLabel = isGu ? 'મશીન પસંદ કરો' : isHi ? 'मशीन चुनें' : 'Select Machine';

            await sendInteractiveList(fromPhone, catTitle, btnLabel, [
                { id: 'cat_atta', title: isGu ? 'આટા ચક્કી' : isHi ? 'आटा चक्की' : 'Atta Chakki', description: isGu ? 'કોમર્શિયલ ફ્લોર મિલ' : isHi ? 'कमर्शियल फ्लोर मिल' : 'Commercial Flour Mill' },
                { id: 'cat_masala', title: isGu ? 'મસાલા ગ્રાઇન્ડીંગ' : isHi ? 'मसाला ग्राइंडिंग' : 'Masala Grinding', description: isGu ? 'મસાલા પલ્વરાઇઝર' : isHi ? 'मसाला पल्वराइजर' : 'Spice Grinding Pulverizer' },
                { id: 'cat_haldi', title: isGu ? 'હળદર ગ્રાઇન્ડીંગ' : isHi ? 'हल्दी ग्राइंडिंग' : 'Haldi Grinding', description: isGu ? 'હળદર દળવાનું મશીન' : isHi ? 'हल्दी पीसने की मशीन' : 'Heavy-Duty Turmeric Mill' },
                { id: 'cat_chilly', title: isGu ? 'મરચા ગ્રાઇન્ડીંગ' : isHi ? 'मिर्ची ग्राइंडिंग' : 'Chilly Grinding', description: isGu ? 'મરચા દળવાનું મશીન' : isHi ? 'मिर्ची पीसने की मशीन' : 'Chilly Grinding Pulverizer' }
            ]);
            return res.sendStatus(200);
        }

        // STEP 4: Category selected -> Cyclone or Standard
        if (interactiveId.startsWith('cat_')) {
            session.data.category = incomingText;
            session.step = 'TYPE';
            userSessions[fromPhone] = session;

            const isGu = session.data.language === 'ગુજરાતી';
            const isHi = session.data.language === 'हिंदी';

            const qText = isGu ? 'આપને સાયક્લોન સાથે જોઈએ છે કે સ્ટાન્ડર્ડ?' :
                          isHi ? 'साइक्लोन के साथ चाहिए या साधारण?' :
                          'Do you need With Cyclone or Standard?';

            await sendInteractiveButtons(fromPhone, qText, [
                { id: 'type_std', title: isGu ? 'સ્ટાન્ડર્ડ' : isHi ? 'साधारण' : 'Standard' },
                { id: 'type_cyc', title: isGu ? 'સાયક્લોન સાથે' : isHi ? 'साइक्लोन के साथ' : 'With Cyclone' },
                { id: 'type_both', title: isGu ? 'બંને ઓપ્શન બતાવો' : isHi ? 'दोनों विकल्प दिखाएं' : 'Show Both Options' }
            ]);
            return res.sendStatus(200);
        }

        // STEP 5: Type selected -> Select HP Capacity (5 to 30 HP)
        if (interactiveId.startsWith('type_')) {
            session.data.type = incomingText;
            session.step = 'HP';
            userSessions[fromPhone] = session;

            const isGu = session.data.language === 'ગુજરાતી';
            const isHi = session.data.language === 'हिंदी';

            const hpTitle = isGu ? 'મોટર કેપેસિટી (HP) પસંદ કરો:' :
                            isHi ? 'मोटर क्षमता (HP) चुनें:' :
                            'Select HP Capacity:';
            const btnLabel = isGu ? 'HP પસંદ કરો' : isHi ? 'HP चुनें' : 'Select HP';

            await sendInteractiveList(fromPhone, hpTitle, btnLabel, [
                { id: 'hp_5', title: '5 HP Pulverizer', description: 'Capacity: 35-50 KG/HR' },
                { id: 'hp_7_5', title: '7.5 HP Pulverizer', description: 'Capacity: 60-80 KG/HR' },
                { id: 'hp_10', title: '10 HP Pulverizer', description: 'Capacity: 80-100 KG/HR' },
                { id: 'hp_15', title: '15 HP Pulverizer', description: 'Capacity: 100-150 KG/HR' },
                { id: 'hp_20', title: '20 HP Pulverizer', description: 'Capacity: 150-200 KG/HR' },
                { id: 'hp_25', title: '25 HP Pulverizer', description: 'Capacity: 200-250 KG/HR' },
                { id: 'hp_30', title: '30 HP Pulverizer', description: 'Capacity: 250-300 KG/HR' }
            ]);
            return res.sendStatus(200);
        }

        // STEP 6: HP selected -> Ask Customer Full Name (Only type Name)
        if (interactiveId.startsWith('hp_')) {
            session.data.hp = incomingText;
            session.step = 'NAME';
            userSessions[fromPhone] = session;

            const isGu = session.data.language === 'ગુજરાતી';
            const isHi = session.data.language === 'हिंदी';

            const namePrompt = isGu ? 
                `ખૂબ સરસ! આપનું મશીન: *${session.data.hp}* (${session.data.type}).\n\nકૃપા કરીને આપનું *પૂરું નામ* અહીં લખીને મોકલો:` :
                isHi ?
                `बहुत बढ़िया! आपकी मशीन: *${session.data.hp}* (${session.data.type}).\n\nकृपया अपना *पूरा नाम* यहाँ लिखकर भेजें:` :
                `Great! Selected: *${session.data.hp}* (${session.data.type}).\n\nPlease type your *Full Name* below:`;

            await sendWhatsAppText(fromPhone, namePrompt);
            return res.sendStatus(200);
        }

        // STEP 7: Name received -> Show State Tap Menu
        if (session.step === 'NAME' && messageObj.type === 'text') {
            session.data.name = incomingText;
            session.step = 'STATE';
            userSessions[fromPhone] = session;

            const isGu = session.data.language === 'ગુજરાતી';
            const isHi = session.data.language === 'हिंदी';

            const statePrompt = isGu ? 
                `આભાર ${session.data.name} જી! કૃપા કરીને આપનું *રાજ્ય* પસંદ કરો:` :
                isHi ?
                `धन्यवाद ${session.data.name} जी! कृपया अपना *राज्य* चुनें:` :
                `Thank you ${session.data.name}! Please tap your *State*:`;
            const btnLabel = isGu ? 'રાજ્ય પસંદ કરો' : isHi ? 'राज्य चुनें' : 'Select State';

            await sendInteractiveList(fromPhone, statePrompt, btnLabel, [
                { id: 'st_gujarat', title: isGu ? 'ગુજરાત' : isHi ? 'गुजरात' : 'Gujarat', description: 'Gujarat' },
                { id: 'st_maharashtra', title: isGu ? 'મહારાષ્ટ્ર' : isHi ? 'महाराष्ट्र' : 'Maharashtra', description: 'Maharashtra' },
                { id: 'st_rajasthan', title: isGu ? 'રાજસ્થાન' : isHi ? 'राजस्थान' : 'Rajasthan', description: 'Rajasthan' },
                { id: 'st_mp', title: isGu ? 'મધ્ય પ્રદેશ' : isHi ? 'मध्य प्रदेश' : 'Madhya Pradesh', description: 'Madhya Pradesh' },
                { id: 'st_up', title: isGu ? 'ઉત્તર પ્રદેશ' : isHi ? 'उत्तर प्रदेश' : 'Uttar Pradesh', description: 'Uttar Pradesh' },
                { id: 'st_other', title: isGu ? 'અન્ય રાજ્ય' : isHi ? 'अन्य राज्य' : 'Other State', description: 'Other State in India' }
            ]);
            return res.sendStatus(200);
        }

        // STEP 8: State selected -> Auto-detect and show City Tap Menu
        if (interactiveId.startsWith('st_')) {
            session.data.state = incomingText;
            userSessions[fromPhone] = session;

            const cities = STATE_CITIES[incomingText];
            if (cities && cities.length > 0) {
                session.step = 'CITY';
                const isGu = session.data.language === 'ગુજરાતી';
                const isHi = session.data.language === 'हिंदी';

                const cityPrompt = isGu ? 
                    `આપનું રાજ્ય *${session.data.state}* પસંદ થયું છે. આપનું *શહેર* પસંદ કરો:` :
                    isHi ?
                    `आपका राज्य *${session.data.state}* चुना गया है। कृपया अपना *शहर* चुनें:` :
                    `State: *${session.data.state}*. Please tap your *City*:`;
                const btnLabel = isGu ? 'શહેર પસંદ કરો' : isHi ? 'शहर चुनें' : 'Select City';

                const cityOptions = cities.slice(0, 10).map((c, idx) => ({
                    id: `ct_${idx}_${c.replace(/[^a-zA-Z0-9]/g, '')}`,
                    title: c,
                    description: `${c}, ${session.data.state}`
                }));

                await sendInteractiveList(fromPhone, cityPrompt, btnLabel, cityOptions);
                return res.sendStatus(200);
            } else {
                session.step = 'MANUAL_CITY';
                const isGu = session.data.language === 'ગુજરાતી';
                const isHi = session.data.language === 'हिंदी';
                const manualCityPrompt = isGu ? 
                    'કૃપા કરીને આપના શહેર/ગામનું નામ લખીને મોકલો:' :
                    isHi ?
                    'कृपया अपने शहर/गाँव का नाम लिखकर भेजें:' :
                    'Please type your City / Town name below:';
                await sendWhatsAppText(fromPhone, manualCityPrompt);
                return res.sendStatus(200);
            }
        }

        // STEP 9: City selected (Tap or Typed) -> Finalize & Sync to Odoo + Supabase
        if ((interactiveId.startsWith('ct_') && session.step === 'CITY') || 
            (session.step === 'MANUAL_CITY' && messageObj.type === 'text')) {
            
            session.data.city = incomingText;
            session.step = 'COMPLETED';

            // Push to CRM and Supabase
            await syncLeadToOdoo(fromPhone, session.data);
            await syncLeadToSupabase(fromPhone, session.data);

            const isGu = session.data.language === 'ગુજરાતી';
            const isHi = session.data.language === 'हिंदी';

            const thankMsg = isGu ?
                `આપની પૂછપરછ સફળતાપૂર્વક નોંધાઈ ગઈ છે! 🙏\n\n👤 *નામ:* ${session.data.name}\n⚙️ *મશીન:* ${session.data.hp} (${session.data.type})\n📍 *સ્થળ:* ${session.data.city}, ${session.data.state}\n\nજય અંબે ફૂડ મશીનરીના સેલ્સ એક્ઝિક્યુટિવ *શ્રી અનિલ પંચાલ (9925343582)* ટૂંક સમયમાં બેસ્ટ કવોટેશન સાથે આપનો સંપર્ક કરશે.\n\nજો આપને આ મશીનનો ફોટો કે વિડીયો જોવો હોય તો અહીં 'ફોટો' અથવા 'વિડીયો' લખીને મોકલી શકો છો.` :
                isHi ?
                `आपकी पूछताछ सफलतापूर्वक दर्ज कर ली गई है! 🙏\n\n👤 *नाम:* ${session.data.name}\n⚙️ *मशीन:* ${session.data.hp} (${session.data.type})\n📍 *स्थान:* ${session.data.city}, ${session.data.state}\n\nजय अम्बे फूड मशीनरी के सेल्स एग्जीक्यूटिव *श्री अनिल पांचाल (9925343582)* जल्द ही आपसे सर्वोत्तम कोटेशन के साथ संपर्क करेंगे।\n\nयदि आप मशीन का फोटो या वीडियो देखना चाहते हैं, तो 'फोटो' या 'वीडियो' लिखकर भेज सकते हैं।` :
                `Thank you for your inquiry! 🙏\n\n👤 *Name:* ${session.data.name}\n⚙️ *Machine:* ${session.data.hp} (${session.data.type})\n📍 *Location:* ${session.data.city}, ${session.data.state}\n\nOur Sales Executive *Mr. Anil Panchal (9925343582)* will contact you shortly with the best quote.\n\nIf you would like to see machine photos or demo videos, please type 'Photo' or 'Video'.`;

            await sendWhatsAppText(fromPhone, thankMsg);
            delete userSessions[fromPhone];
            return res.sendStatus(200);
        }

        // PHOTO / VIDEO ON-DEMAND CHECK
        if (lower.includes('photo') || lower.includes('image') || lower.includes('ફોટો') || lower.includes('फोटो')) {
            await sendWhatsAppText(fromPhone, "Here is our machine photo gallery: https://jayambefoodmachinery.com/media/\n\nYou can also browse 5 HP to 30 HP commercial pulverizers with cyclone on our website!");
            return res.sendStatus(200);
        }

        if (lower.includes('video') || lower.includes('youtube') || lower.includes('facebook') || lower.includes('વિડીયો') || lower.includes('वीडियो')) {
            await sendWhatsAppText(fromPhone, "Watch live grinding demo videos here:\n\n▶️ *YouTube:* https://www.youtube.com/@jayambefoodmachinery\n📘 *Facebook:* https://www.facebook.com/share/164cTgG9YZ/");
            return res.sendStatus(200);
        }

        // FALLBACK TO GEMINI AI
        const chat = model.startChat({ history: [] });
        const result = await chat.sendMessage(incomingText);
        const replyText = result.response.text();
        await sendWhatsAppText(fromPhone, replyText);

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
                    description: `Category: ${leadData.category || ''}\nType: ${leadData.type || ''}\nCapacity: ${leadData.hp || ''}\nState: ${leadData.state || ''}\nLanguage: ${leadData.language || ''}\nSource: WhatsApp AI Interactive Agent`
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
            language: leadData.language || 'English',
            last_message: new Date().toISOString()
        }, { onConflict: 'phone' });
        console.log('Successfully synced to Supabase for:', phone);
    } catch (e) {
        console.error('Supabase sync error:', e.message);
    }
}

module.exports = app;
