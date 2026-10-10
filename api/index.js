require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

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

// CRITICAL FIX: Hardcoded fallback tokens
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || "EAAXTyBC2XwYBSdq3sw4g4F6DJsVRvZBS8LxaHLoUg9yqAT0oMU5uLmWyZCoTGtXgKQuwgzZAKQdtsbVAxy2GGogNVtp7RoAsZAuo4ZAnLQjZCG4dxDP3M3sEuxHNRN650NlEx3Q1SvrTJvC5QcLWuFD2P1fhsryvKfudFVb4fWTrrsySUZAJPZAkxVE4V8CMGhJ6sPErVRR6Y6xHH46m4t6LbSgtgWT0tZAvscG8BNDyOMDBttr6AcQ0Tw9E9zNrdHWZCgbIH2BhMCl17Y4cl4Ewu4uAZDZD";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "1272560265946003";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://uosqmchlfvvevvdmhozi.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || ("sb_secret_Jc084cONTCwg2Js-6U00lg_f5nj8T9v");

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

const userSessions = {};
const processedMessages = new Set();

app.get('/', (req, res) => { res.send('Jayambe WhatsApp Interactive Agent is running! (Patched v2)'); });

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode && token) { res.status(200).send(challenge); } 
    else { res.sendStatus(400); }
});

app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        if (body.object && body.entry && body.entry[0].changes && body.entry[0].changes[0] && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
            const messageObj = body.entry[0].changes[0].value.messages[0];
            const messageId = messageObj.id;

            if (processedMessages.has(messageId)) { return res.sendStatus(200); }
            processedMessages.add(messageId);
            setTimeout(() => processedMessages.delete(messageId), 120000);

            const fromPhone = messageObj.from;
            let incomingText = '';
            let interactiveId = '';

            if (messageObj.type === 'text') {
                incomingText = messageObj.text.body;
            } else if (messageObj.type === 'interactive') {
                if (messageObj.interactive.type === 'button_reply') {
                    interactiveId = messageObj.interactive.button_reply.id;
                    incomingText = messageObj.interactive.button_reply.title;
                } else if (messageObj.interactive.type === 'list_reply') {
                    interactiveId = messageObj.interactive.list_reply.id;
                    incomingText = messageObj.interactive.list_reply.title;
                }
            } else {
                return res.sendStatus(200);
            }

            if (!userSessions[fromPhone]) {
                userSessions[fromPhone] = { step: 'START', data: {} };
            }
            let session = userSessions[fromPhone];

            if (interactiveId) {
                if (interactiveId.startsWith('lang_')) {
                    session.data.language = incomingText;
                    session.step = 'PHASE';
                    await sendInteractiveButton(fromPhone, "Which machine phase do you require?", [
                        { id: 'phase_single', title: 'Single Phase' },
                        { id: 'phase_three', title: 'Three Phase' }
                    ]);
                }
                else if (interactiveId === 'phase_single') {
                    await sendWhatsAppText(fromPhone, "We are sorry sir, our company does not make single phase machines. We only manufacture commercial and three phase machines.");
                    delete userSessions[fromPhone];
                }
                else if (interactiveId === 'phase_three') {
                    session.data.phase = 'Three Phase';
                    session.step = 'CATEGORY';
                    await sendInteractiveList(fromPhone, "Please select the type of machine you are looking for:", "View Machines", [
                        { id: 'cat_atta', title: 'Atta Chakki' },
                        { id: 'cat_masala', title: 'Masala Chakki' },
                        { id: 'cat_haldi', title: 'Haldi Grinding' },
                        { id: 'cat_chilly', title: 'Chilly Grinding' }
                    ]);
                }
                else if (interactiveId.startsWith('cat_')) {
                    session.data.category = incomingText;
                    session.step = 'SUBTYPE';
                    await sendInteractiveButton(fromPhone, What type of ?, [
                        { id: 'type_std', title: "Standard" },
                        { id: 'type_cyc', title: "With Cyclone" },
                        { id: 'type_both', title: "Or Both" }
                    ]);
                }
                else if (interactiveId.startsWith('type_')) {
                    session.data.type = incomingText;
                    session.step = 'HP';
                    await sendInteractiveList(fromPhone, "What capacity (HP) do you require?", "View HP Options", [
                        { id: 'hp_5', title: '5 HP' },
                        { id: 'hp_10', title: '10 HP' },
                        { id: 'hp_15', title: '15 HP' },
                        { id: 'hp_20', title: '20 HP' },
                        { id: 'hp_25', title: '25 HP' },
                        { id: 'hp_30', title: '30 HP' }
                    ]);
                }
                else if (interactiveId.startsWith('hp_')) {
                    session.data.hp = incomingText;
                    session.step = 'AWAITING_DETAILS';
                    await sendWhatsAppText(fromPhone, "Great! Please type your Name, City, and State below:");
                }
                userSessions[fromPhone] = session;
            }
            else {
                if (session.step === 'AWAITING_DETAILS') {
                    session.data.details = incomingText;
                    await pushToOdoo(fromPhone, session.data, incomingText);
                    await sendWhatsAppText(fromPhone, "Thank you for your inquiry. I am Anil Panchal (9925343582), Sales Executive of Jay Ambe Food Machinery. I will contact you as soon as possible.");
                    delete userSessions[fromPhone];
                } else {
                    session.step = 'LANG';
                    userSessions[fromPhone] = session;
                    await sendInteractiveButton(fromPhone, "Welcome to Jay Ambe Food Machinery! Please choose your language:", [
                        { id: 'lang_en', title: 'English' },
                        { id: 'lang_hi', title: 'Hindi' },
                        { id: 'lang_gu', title: 'Gujarati' }
                    ]);
                }
            }
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('Error processing webhook:', error.message);
        res.sendStatus(500);
    }
});

async function sendWhatsAppText(toPhone, textMsg) {
    try {
        await axios({
            method: 'POST',
            url: https://graph.facebook.com/v18.0//messages,
            data: { messaging_product: 'whatsapp', to: toPhone, type: 'text', text: { body: textMsg } },
            headers: { 'Authorization': Bearer , 'Content-Type': 'application/json' },
        });
    } catch (e) {
        console.error('Error sending text:', e.response ? e.response.data : e.message);
    }
}

async function sendInteractiveButton(toPhone, bodyText, buttons) {
    try {
        const formattedButtons = buttons.map(b => ({ type: 'reply', reply: { id: String(b.id), title: String(b.title) } }));
        await axios({
            method: 'POST',
            url: https://graph.facebook.com/v18.0//messages,
            data: {
                messaging_product: 'whatsapp',
                to: toPhone,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: { text: String(bodyText) },
                    action: { buttons: formattedButtons }
                }
            },
            headers: { 'Authorization': Bearer , 'Content-Type': 'application/json' },
        });
    } catch (e) {
        console.error('Error sending buttons:', e.response ? JSON.stringify(e.response.data) : e.message);
    }
}

async function sendInteractiveList(toPhone, bodyText, buttonTitle, items) {
    try {
        const rows = items.map(i => ({ id: String(i.id), title: String(i.title) }));
        await axios({
            method: 'POST',
            url: https://graph.facebook.com/v18.0//messages,
            data: {
                messaging_product: 'whatsapp',
                to: toPhone,
                type: 'interactive',
                interactive: {
                    type: 'list',
                    body: { text: String(bodyText) },
                    action: {
                        button: String(buttonTitle),
                        sections: [{ title: 'Options', rows: rows }]
                    }
                }
            },
            headers: { 'Authorization': Bearer , 'Content-Type': 'application/json' },
        });
    } catch (e) {
        console.error('Error sending list:', e.response ? JSON.stringify(e.response.data) : e.message);
    }
}

async function pushToOdoo(phone, sessionData, userDetailsText) {
    try {
        const ODOO_URL = "https://v1.viducrm.com";
        const ODOO_DB = "vicrm_prd_17";
        const ODOO_LOGIN = "jaf010@jayambe.net";
        const ODOO_API_KEY = "824e7ef8e28156d5b0137ae5ede2d09129e2f371";
        
        const authXml = <?xml version="1.0"?>
        <methodCall><methodName>authenticate</methodName><params>
        <param><value><string></string></value></param>
        <param><value><string></string></value></param>
        <param><value><string></string></value></param>
        <param><value><struct></struct></value></param>
        </params></methodCall>;
        
        // REPLACED FETCH WITH AXIOS FOR NODE 16 COMPATIBILITY
        const authRes = await axios.post(${ODOO_URL}/xmlrpc/2/common, authXml, { headers: { 'Content-Type': 'text/xml' } });
        const authText = authRes.data;
        const uidMatch = authText.match(/<int>(\d+)<\/int>/);
        
        if (uidMatch && uidMatch[1]) {
            const uid = uidMatch[1];
            const parts = userDetailsText.split(/[,\\n\\- ]+/);
            const contactName = parts[0] ? parts[0].trim() : 'Unknown';
            const lang = sessionData.language || 'N/A';
            const phase = sessionData.phase || 'N/A';
            const cat = sessionData.category || 'N/A';
            const typ = sessionData.type || 'N/A';
            const hp = sessionData.hp || 'N/A';
            const description = Phone: \nDetails Provided: \n\n--- SELECTION ---\nLanguage: \nPhase: \nCategory: \nType: \nHP: ;
            const leadName = WhatsApp Lead:  -  ();
            
            const leadXml = <?xml version="1.0"?>
            <methodCall><methodName>execute_kw</methodName><params>
                <param><value><string></string></value></param>
                <param><value><int></int></value></param>
                <param><value><string></string></value></param>
                <param><value><string>crm.lead</string></value></param>
                <param><value><string>create</string></value></param>
                <param><value><array><data><value><struct>
                    <member><name>name</name><value><string></string></value></member>
                    <member><name>description</name><value><string></string></value></member>
                    <member><name>contact_name</name><value><string></string></value></member>
                    <member><name>phone</name><value><string></string></value></member>
                </struct></value></data></array></value></param>
            </params></methodCall>;
            
            await axios.post(${ODOO_URL}/xmlrpc/2/object, leadXml, { headers: { 'Content-Type': 'text/xml' } });
        }
    } catch (e) { console.error("XML-RPC Error:", e.message); }
}

module.exports = app;
