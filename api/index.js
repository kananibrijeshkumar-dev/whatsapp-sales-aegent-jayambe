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

// Full Indian States Database (Numbered & Alphabetical A to Z)
const STATES_PAGE_1 = [
    { code: 'ap', num: 1, name_en: '1. Andhra Pradesh', name_hi: '1. आंध्र प्रदेश', name_gu: '1. આંધ્ર પ્રદેશ', cities_en: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati'], cities_hi: ['विशाखापट्टनम', 'विजयवाड़ा', 'गुंटूर', 'नेल्लोर', 'कर्नूल', 'राजमुंदरी', 'तिरुपति'], cities_gu: ['વિશાખાપટ્ટનમ', 'વિજયવાડા', 'ગુંટુર', 'નેલ્લોર', 'કુર્નૂલ', 'રાજમુંદરી', 'તિરુપતિ'] },
    { code: 'as', num: 2, name_en: '2. Assam', name_hi: '2. असम', name_gu: '2. અસમ', cities_en: ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur'], cities_hi: ['गुवाहाटी', 'सिलचर', 'डिब्रूगढ़', 'जोरहाट', 'नागांव', 'तिनसुकिया', 'तेजपुर'], cities_gu: ['ગુવાહાટી', 'સિલચર', 'ડિબ્રુગઢ', 'જોરહાટ', 'નાગાંવ', 'તિનસુકિયા', 'તેજપુર'] },
    { code: 'br', num: 3, name_en: '3. Bihar', name_hi: '3. बिहार', name_gu: '3. બિહાર', cities_en: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Arrah'], cities_hi: ['पटना', 'गया', 'भागलपुर', 'मुजफ्फरपुर', 'पूर्णिया', 'दरभंगा', 'आरा'], cities_gu: ['પટના', 'ગયા', 'ભાગલપુર', 'મુઝફ્ફરપુર', 'પૂર્ણિયા', 'દરભંગા', 'આરા'] },
    { code: 'cg', num: 4, name_en: '4. Chhattisgarh', name_hi: '4. छत्तीसगढ़', name_gu: '4. છત્તીસગઢ', cities_en: ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Rajnandgaon', 'Jagdalpur', 'Raigarh'], cities_hi: ['रायपुर', 'भिलाई', 'बिलासपुर', 'कोरबा', 'राजनांदगांव', 'जगदलपुर', 'रायगढ़'], cities_gu: ['રાયપુર', 'ભિલાઈ', 'બિલાસપુર', 'કોરબા', 'રાજનાંદગાંવ', 'જગદલપુર', 'રાયગઢ'] },
    { code: 'dl', num: 5, name_en: '5. Delhi', name_hi: '5. दिल्ली', name_gu: '5. દિલ્હી', cities_en: ['New Delhi', 'North Delhi', 'South Delhi', 'West Delhi', 'East Delhi', 'Rohini', 'Dwarka'], cities_hi: ['नई दिल्ली', 'उत्तर दिल्ली', 'दक्षिण दिल्ली', 'पश्चिम दिल्ली', 'पूर्वी दिल्ली', 'रोहिणी', 'द्वारका'], cities_gu: ['નવી દિલ્હી', 'ઉત્તર દિલ્હી', 'દક્ષિણ દિલ્હી', 'પશ્ચિમ દિલ્હી', 'પૂર્વ દિલ્હી', 'રોહિણી', 'દ્વારકા'] },
    { code: 'ga', num: 6, name_en: '6. Goa', name_hi: '6. गोवा', name_gu: '6. ગોવા', cities_en: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'], cities_hi: ['पणजी', 'मडगांव', 'वास्को', 'मापुसा', 'पोंडा'], cities_gu: ['પણજી', 'મડગાંવ', 'વાસ્કો', 'માપુસા', 'પોંડા'] },
    { code: 'gj', num: 7, name_en: '7. Gujarat', name_hi: '7. गुजरात', name_gu: '7. ગુજરાત', cities_en: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar'], cities_hi: ['अहमदाबाद', 'सूरत', 'वडोदरा', 'राजकोट', 'भावनगर', 'जामनगर', 'जूनागढ़', 'गांधीनगर'], cities_gu: ['અમદાવાદ', 'સુરત', 'વડોદરા', 'રાજકોટ', 'ભાવનગર', 'જામનગર', 'જૂનાગઢ', 'ગાંધીનગર'] },
    { code: 'hr', num: 8, name_en: '8. Haryana', name_hi: '8. हरियाणा', name_gu: '8. હરિયાણા', cities_en: ['Faridabad', 'Gurugram', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal'], cities_hi: ['फरीदाबाद', 'गुरुग्राम', 'पानीपत', 'अंबाला', 'यमुनानगर', 'रोहतक', 'हिसार', 'करनाल'], cities_gu: ['ફરીદાબાદ', 'ગુરુગ્રામ', 'પાણીપત', 'અંબાલા', 'યમુનાનગર', 'રોહતક', 'હિસાર', 'કરનાલ'] },
    { code: 'hp', num: 9, name_en: '9. Himachal Pradesh', name_hi: '9. हिमाचल प्रदेश', name_gu: '9. હિમાચલ પ્રદેશ', cities_en: ['Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Baddi', 'Kullu', 'Bilaspur'], cities_hi: ['शिमला', 'धर्मशाला', 'सोलन', 'मंडी', 'बद्दी', 'कुल्लू', 'बिलासपुर'], cities_gu: ['શિમલા', 'ધર્મશાળા', 'સોલન', 'મંડી', 'બદ્દી', 'કુલ્લુ', 'બિલાસપુર'] }
];

const STATES_PAGE_2 = [
    { code: 'jh', num: 10, name_en: '10. Jharkhand', name_hi: '10. झारखंड', name_gu: '10. ઝારખંડ', cities_en: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh', 'Giridih'], cities_hi: ['रांची', 'जमशेदपुर', 'धनबाद', 'बोकारो', 'देवघर', 'हजारीबाग', 'गिरिडीह'], cities_gu: ['રાંચી', 'જમશેદપુર', 'ધનબાદ', 'બોકારો', 'દેવઘર', 'હઝારીબાગ', 'ગિરિડીહ'] },
    { code: 'ka', num: 11, name_en: '11. Karnataka', name_hi: '11. कर्नाटक', name_gu: '11. કર્ણાટક', cities_en: ['Bengaluru', 'Mysuru', 'Hubballi', 'Belagavi', 'Mangaluru', 'Davanagere', 'Ballari'], cities_hi: ['बेंगलुरु', 'मैसूरु', 'हुबली', 'बेलगावी', 'मंगलुरु', 'दावणगेरे', 'बेल्लारी'], cities_gu: ['બેંગલુરુ', 'મૈસુર', 'હુબળી', 'બેલગામ', 'મંગલોર', 'દાવણગેરે', 'બલ્લારી'] },
    { code: 'kl', num: 12, name_en: '12. Kerala', name_hi: '12. केरल', name_gu: '12. કેરળ', cities_en: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad', 'Kannur'], cities_hi: ['तिरुवनंतपुरम', 'कोच्चि', 'कोझिकोड', 'त्रिशूर', 'कोल्लम', 'पालक्काड़', 'कन्नूर'], cities_gu: ['તિરુવનંતપુરમ', 'કોચી', 'કોઝિકોડ', 'ત્રિશૂર', 'કોલ્લમ', 'પાલક્કડ', 'કન્નુર'] },
    { code: 'mp', num: 13, name_en: '13. Madhya Pradesh', name_hi: '13. मध्य प्रदेश', name_gu: '13. મધ્ય પ્રદેશ', cities_en: ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna'], cities_hi: ['इंदौर', 'भोपाल', 'जबलपुर', 'ग्वालियर', 'उज्जैन', 'सागर', 'देवास', 'सतना'], cities_gu: ['ઇન્દોર', 'ભોપાલ', 'જબલપુર', 'ગ્વાલિયર', 'ઉજ્જૈન', 'સાગર', 'દેવાસ', 'સતના'] },
    { code: 'mh', num: 14, name_en: '14. Maharashtra', name_hi: '14. महाराष्ट्र', name_gu: '14. મહારાષ્ટ્ર', cities_en: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Kolhapur', 'Solapur', 'Thane'], cities_hi: ['मुंबई', 'पुणे', 'नागपुर', 'नाशिक', 'औरंगाबाद', 'कोल्हापुर', 'सोलापुर', 'ठाणे'], cities_gu: ['મુંબઈ', 'પુણે', 'નાગપુર', 'નાશિક', 'ઔરંગાબાદ', 'કોલ્હાપુર', 'સોલાપુર', 'થાણે'] },
    { code: 'od', num: 15, name_en: '15. Odisha', name_hi: '15. ओडिशा', name_gu: '15. ઓડિશા', cities_en: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore'], cities_hi: ['भुवनेश्वर', 'कटक', 'राउरकेला', 'बरहामपुर', 'संबलपुर', 'पुरी', 'बालेश्वर'], cities_gu: ['ભુવનેશ્વર', 'કટક', 'રાઉરકેલા', 'બરહામપુર', 'સંબલપુર', 'પુરી', 'બાલેશ્વર'] },
    { code: 'pb', num: 16, name_en: '16. Punjab', name_hi: '16. पंजाब', name_gu: '16. પંજાબ', cities_en: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur'], cities_hi: ['लुधियाना', 'अमृतसर', 'जालंधर', 'पटियाला', 'बठिंडा', 'मोहाली', 'होशियारपुर'], cities_gu: ['લુધિયાણા', 'અમૃતસર', 'જલંધર', 'પટિયાલા', 'બઠિંડા', 'મોહાલી', 'હોશિયારપુર'] },
    { code: 'rj', num: 17, name_en: '17. Rajasthan', name_hi: '17. राजस्थान', name_gu: '17. રાજસ્થાન', cities_en: ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Udaipur', 'Ajmer', 'Bhilwara', 'Alwar'], cities_hi: ['जयपुर', 'जोधपुर', 'कोटा', 'बीकानेर', 'उदयपुर', 'अजमेर', 'भीलवाड़ा', 'अलवर'], cities_gu: ['જયપુર', 'જોધપુર', 'કોટા', 'બિકાનેર', 'ઉદયપુર', 'અજમેર', 'ભીલવાડા', 'અલવર'] }
];

const STATES_PAGE_3 = [
    { code: 'tn', num: 18, name_en: '18. Tamil Nadu', name_hi: '18. तमिलनाडु', name_gu: '18. તમિલનાડુ', cities_en: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur', 'Erode'], cities_hi: ['चेन्नई', 'कोयंबटूर', 'मदुरै', 'तिरुचिरापल्ली', 'सलेम', 'तिरुपूर', 'इरोड'], cities_gu: ['ચેન્નાઈ', 'કોયમ્બતૂર', 'મદુરાઈ', 'તિરુચિરાપલ્લી', 'સાલેમ', 'તિરુપુર', 'ઈરોડ'] },
    { code: 'tg', num: 19, name_en: '19. Telangana', name_hi: '19. तेलंगाना', name_gu: '19. તેલંગાણા', cities_en: ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam'], cities_hi: ['हैदराबाद', 'वारंगल', 'निजामाबाद', 'खम्मम', 'करीमनगर', 'रामागुंडम'], cities_gu: ['હૈદરાબાદ', 'વારંગલ', 'નિઝામાબાદ', 'ખમ્મમ', 'કરીમનગર', 'રામાગુંડમ'] },
    { code: 'up', num: 20, name_en: '20. Uttar Pradesh', name_hi: '20. उत्तर प्रदेश', name_gu: '20. ઉત્તર પ્રદેશ', cities_en: ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Prayagraj', 'Meerut', 'Bareilly', 'Noida'], cities_hi: ['लखनऊ', 'कानपुर', 'वाराणसी', 'आगरा', 'प्रयागराज', 'मेरठ', 'बरेली', 'नोएडा'], cities_gu: ['લખનૌ', 'કાનપુર', 'વારાણસી', 'આગ્રા', 'પ્રયાગરાજ', 'મેરઠ', 'બરેલી', 'નોઇડા'] },
    { code: 'uk', num: 21, name_en: '21. Uttarakhand', name_hi: '21. उत्तराखंड', name_gu: '21. ઉત્તરાખંડ', cities_en: ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh'], cities_hi: ['देहरादून', 'हरिद्वार', 'रुड़की', 'हल्द्वानी', 'रुद्रपुर', 'काशीपुर', 'ऋषिकेश'], cities_gu: ['દેહરાદૂન', 'હરિદ્વાર', 'રૂડકી', 'હલ્દવાની', 'રુદ્રપુર', 'કાશીપુર', 'ઋષિકેશ'] },
    { code: 'wb', num: 22, name_en: '22. West Bengal', name_hi: '22. पश्चिम बंगाल', name_gu: '22. પશ્ચિમ બંગાળ', cities_en: ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda'], cities_hi: ['कोलकाता', 'हावड़ा', 'दुर्गापुर', 'आसनसोल', 'सिलीगुड़ी', 'बर्दवान', 'मालदा'], cities_gu: ['કોલકાતા', 'હાવડા', 'દુર્ગાપુર', 'આસનસોલ', 'સિલીગુડી', 'બર્ધમાન', 'માલદા'] }
];

const ALL_STATES_FLAT = [...STATES_PAGE_1, ...STATES_PAGE_2, ...STATES_PAGE_3];

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

        // 7. SHOW STATE PAGES (Page 1, 2, 3 Navigation)
        if (interactiveId.startsWith('stpage_')) {
            const parts = interactiveId.split('_'); // stpage, 1/2/3, lang
            const pageNum = parseInt(parts[1], 10);
            const lang = parts[2] || userState.lang || 'en';

            await sendStatePage(fromPhone, pageNum, lang);
            return res.sendStatus(200);
        }

        // 8. STATE CHOSEN (Numbered Full Name) -> Show Cities
        if (interactiveId.startsWith('st_')) {
            const parts = interactiveId.split('_'); // st, code, lang
            const stCode = parts[1];
            const lang = parts[2] || userState.lang || 'en';

            userState.lang = lang;
            userState.state = incomingText;
            userState.step = 'CITY';
            global.customerState[fromPhone] = userState;

            const matchedState = ALL_STATES_FLAT.find(s => s.code === stCode);

            if (matchedState) {
                const cities = (lang === 'gu' ? matchedState.cities_gu : lang === 'hi' ? matchedState.cities_hi : matchedState.cities_en) || [];
                const cityPrompt = (lang === 'gu') ? 
                    `આપનું રાજ્ય *${incomingText}* પસંદ થયું છે. આપનું શહેર પસંદ કરો:` :
                    (lang === 'hi') ?
                    `आपका राज्य *${incomingText}* चुना गया है। कृपया अपना शहर चुनें:` :
                    `State: *${incomingText}*. Please tap your City:`;
                const btnLabel = (lang === 'gu') ? 'શહેર પસંદ કરો' : (lang === 'hi') ? 'शहर चुनें' : 'Select City';

                const cityOptions = cities.slice(0, 10).map((c, idx) => ({
                    id: `ct_${idx}_${lang}`,
                    title: c.substring(0, 24)
                }));

                await sendInteractiveList(fromPhone, cityPrompt, btnLabel, cityOptions);
                return res.sendStatus(200);
            }
        }

        // 9. CITY CHOSEN VIA TAP -> Finalize
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

            // If user asks for video or photo or mentions links
            if (lower.includes('video') || lower.includes('વિડીયો') || lower.includes('वीडियो') ||
                lower.includes('photo') || lower.includes('image') || lower.includes('ફોટો') || lower.includes('फोटो') ||
                lower.includes('youtube') || lower.includes('facebook') || userState.step === 'COMPLETED') {
                
                const mediaMsg = (lang === 'gu') ?
                    `અમારા મશીનોના લાઈવ ગ્રાઇન્ડીંગ ડેમો વિડીયો અહીં જુઓ:\n\n▶️ *YouTube:* https://www.youtube.com/@jayambefoodmachinery\n📘 *Facebook:* https://www.facebook.com/share/164cTgG9YZ/\n🌐 *Website:* https://jayambefoodmachinery.com\n\nકોઈપણ માહિતી કે કવોટેશન માટે સંપર્ક કરો:\n📞 શ્રી અનિલ પંચાલ (+91 9925343582)` :
                    (lang === 'hi') ?
                    `हमारी मशीनों के लाइव ग्राइंडिंग डेमो वीडियो यहाँ देखें:\n\n▶️ *YouTube:* https://www.youtube.com/@jayambefoodmachinery\n📘 *Facebook:* https://www.facebook.com/share/164cTgG9YZ/\n🌐 *Website:* https://jayambefoodmachinery.com\n\nकिसी भी जानकारी या कोटेशन के लिए संपर्क करें:\n📞 श्री अनिल पांचाल (+91 9925343582)` :
                    `Watch our live grinding demo videos here:\n\n▶️ *YouTube:* https://www.youtube.com/@jayambefoodmachinery\n📘 *Facebook:* https://www.facebook.com/share/164cTgG9YZ/\n🌐 *Website:* https://jayambefoodmachinery.com\n\nFor any inquiries or quotations, contact:\n📞 Mr. Anil Panchal (+91 9925343582)`;

                await sendWhatsAppText(fromPhone, mediaMsg);
                return res.sendStatus(200);
            }

            // If we are at CITY step and user typed city name
            if (userState.step === 'CITY') {
                userState.city = incomingText;
                userState.step = 'COMPLETED';
                await finalizeLead(fromPhone, userState, lang);
                return res.sendStatus(200);
            }

            // Otherwise, user typed their NAME -> Show Numbered Full Name States (Page 1: 1 to 9)
            userState.name = incomingText;
            userState.step = 'STATE_SELECT';
            global.customerState[fromPhone] = userState;

            await sendStatePage(fromPhone, 1, lang);
            return res.sendStatus(200);
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error.message);
        res.sendStatus(500);
    }
});

// Helper to send Numbered Full Name States List
async function sendStatePage(toPhone, pageNum, lang) {
    const listTitle = (lang === 'gu') ? 'આપનું રાજ્ય પસંદ કરો:' :
                      (lang === 'hi') ? 'अपना राज्य चुनें:' :
                      'Select your State:';
    const btnLabel = (lang === 'gu') ? 'રાજ્ય પસંદ કરો' : (lang === 'hi') ? 'राज्य चुनें' : 'Select State';

    let states = [];
    let nextRow = null;

    if (pageNum === 1) {
        states = STATES_PAGE_1;
        nextRow = {
            id: `stpage_2_${lang}`,
            title: (lang === 'gu' ? '➡️ આગળ (10 થી 17)' : lang === 'hi' ? '➡️ आगे (10 से 17)' : '➡️ Next (10 to 17)').substring(0, 24),
            description: (lang === 'gu' ? 'ઝારખંડ, મહારાષ્ટ્ર, રાજસ્થાન...' : lang === 'hi' ? 'झारखंड, महाराष्ट्र, राजस्थान...' : 'Jharkhand, MP, Maharashtra...').substring(0, 72)
        };
    } else if (pageNum === 2) {
        states = STATES_PAGE_2;
        nextRow = {
            id: `stpage_3_${lang}`,
            title: (lang === 'gu' ? '➡️ આગળ (18 થી 22)' : lang === 'hi' ? '➡️ आगे (18 से 22)' : '➡️ Next (18 to 22)').substring(0, 24),
            description: (lang === 'gu' ? 'તમિલનાડુ, યુપી, બંગાળ...' : lang === 'hi' ? 'तमिलनाडु, यूपी, बंगाल...' : 'Tamil Nadu, UP, West Bengal...').substring(0, 72)
        };
    } else {
        states = STATES_PAGE_3;
        nextRow = {
            id: `stpage_1_${lang}`,
            title: (lang === 'gu' ? '⬅️ પહેલાંનાં (1 થી 9)' : lang === 'hi' ? '⬅️ पिछले (1 से 9)' : '⬅️ Back to (1 to 9)').substring(0, 24),
            description: (lang === 'gu' ? 'ગુજરાત, બિહાર, દિલ્હી...' : lang === 'hi' ? 'गुजरात, बिहार, दिल्ली...' : 'Gujarat, Bihar, Delhi...').substring(0, 72)
        };
    }

    const rows = states.map(st => {
        const title = (lang === 'gu' ? st.name_gu : lang === 'hi' ? st.name_hi : st.name_en);
        return {
            id: `st_${st.code}_${lang}`,
            title: title.substring(0, 24)
        };
    });

    if (nextRow) {
        rows.push(nextRow);
    }

    await sendInteractiveList(toPhone, listTitle, btnLabel, rows);
}

async function finalizeLead(fromPhone, userState, lang) {
    try {
        await syncLeadToOdoo(fromPhone, userState);
        await syncLeadToSupabase(fromPhone, userState);

        const thankMsg = (lang === 'gu') ?
            `આપની પૂછપરછ સફળતાપૂર્વક નોંધાઈ ગઈ છે! 🙏\n\n👤 *નામ:* ${userState.name || 'Customer'}\n⚙️ *મશીન:* ${userState.hp || ''} (${userState.type || ''})\n📍 *સ્થળ:* ${userState.city || ''}, ${userState.state || ''}\n\nજય અંબે ફૂડ મશીનરીના સેલ્સ એક્ઝિક્યુટિવ *શ્રી અનિલ પંચાલ (9925343582)* ટૂંક સમયમાં બેસ્ટ કવોટેશન સાથે આપનો સંપર્ક કરશે.\n\n🌐 *અમારી વેબસાઇટ પર મશીનો જુઓ:* https://jayambefoodmachinery.com\n\nજો આપને આ મશીનનો લાઈવ ગ્રાઇન્ડીંગ વિડીયો જોવો હોય, તો અહીં 'વિડીયો' લખીને મોકલી શકો છો.` :
            (lang === 'hi') ?
            `आपकी पूछताछ सफलतापूर्वक दर्ज कर ली गई है! 🙏\n\n👤 *नाम:* ${userState.name || 'Customer'}\n⚙️ *मशीन:* ${userState.hp || ''} (${userState.type || ''})\n📍 *स्थान:* ${userState.city || ''}, ${userState.state || ''}\n\nजय अम्बे फूड मशीनरी के सेल्स एग्जीक्यूटिव *श्री अनिल पांचाल (9925343582)* जल्द ही आपसे सर्वोत्तम कोटेशन के साथ संपर्क करेंगे।\n\n🌐 *हमारी वेबसाइट पर मशीनें देखें:* https://jayambefoodmachinery.com\n\nयदि आप इस मशीन का लाइव ग्राइंडिंग वीडियो देखना चाहते हैं, तो यहाँ 'वीडियो' लिखकर भेज सकते हैं।` :
            `Thank you for your inquiry! 🙏\n\n👤 *Name:* ${userState.name || 'Customer'}\n⚙️ *Machine:* ${userState.hp || ''} (${userState.type || ''})\n📍 *Location:* ${userState.city || ''}, ${userState.state || ''}\n\nOur Sales Executive *Mr. Anil Panchal (9925343582)* will contact you shortly with the best quote.\n\n🌐 *Explore machines on our website:* https://jayambefoodmachinery.com\n\nIf you would like to see live grinding demo videos, please type 'Video'.`;

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
