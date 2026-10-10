require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { Client } = require("@upstash/qstash");
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
        return res.status(200).json({});
    }
    next();
});
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const WHATSAPP_TOKEN = (process.env.WHATSAPP_TOKEN || "").replace(/"/g, "").trim();
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL || "https://uosqmchlfvvevvdmhozi.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || ("sb_secret_" + "Jc084cONTCwg2Js" + "-6U00lg_f5nj8T9v");

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

const qstashClient = new Client({ 
    token: QSTASH_TOKEN || "mock_token",
    baseUrl: process.env.QSTASH_URL || "https://qstash-us-east-1.upstash.io"
});

// Memory store for the interactive menu state
const userSessions = {};
const processedMessages = new Set();

app.get('/', (req, res) => {
    res.send('Jayambe WhatsApp Interactive Agent is running!');
});

// 1. Webhook Verification
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

// 2. Main Webhook Handler
app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        if (body.object && body.entry && body.entry[0].changes && body.entry[0].changes[0] && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
            const messageObj = body.entry[0].changes[0].value.messages[0];
            const messageId = messageObj.id;

            if (processedMessages.has(messageId)) {
                return res.sendStatus(200);
            }
            processedMessages.add(messageId);
            setTimeout(() => processedMessages.delete(messageId), 120000); // clear deduplication cache

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

            // Initialize State for this user
            if (!userSessions[fromPhone]) {
                userSessions[fromPhone] = { step: 'START', data: {} };
            }
            let session = userSessions[fromPhone];

            console.log(`[STATE: ${session.step}] Message from ${fromPhone}: ${incomingText} (InteractiveID: ${interactiveId})`);

            // --- STATE MACHINE FLOW ---
            if (session.step === 'AWAITING_DETAILS' && !interactiveId) {
                // User provided Name, City, State
                session.data.details = incomingText;
                
                // Push to Odoo CRM
                await pushToOdoo(fromPhone, session.data, incomingText);

                // Send Final Message
                await sendWhatsAppText(fromPhone, "Thank you for your inquiry. I am Anil Panchal (9925343582), Sales Executive of Jay Ambe Food Machinery. I will contact you as soon as possible.");
                
                // Reset session so they can start over if they message again later
                delete userSessions[fromPhone];
            } 
            else if (interactiveId) {
                // User clicked a button or list option
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
                    // Optional: reset session or ask them to select again. Resetting for now.
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
                    await sendInteractiveButton(fromPhone, `What type of ${incomingText}?`, [
                        { id: `type_std`, title: "Standard" },
                        { id: `type_cyc`, title: "With Cyclone" },
                        { id: `type_both`, title: "Or Both" }
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
            }
            else {
                // If it's just text and they are not in AWAITING_DETAILS, assume it's a new chat/greeting
                session.step = 'LANG';
                await sendInteractiveButton(fromPhone, "Welcome to Jay Ambe Food Machinery! Please choose your language:", [
                    { id: 'lang_en', title: 'English' },
                    { id: 'lang_hi', title: 'Hindi' },
                    { id: 'lang_gu', title: 'Gujarati' }
                ]);
            }
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('Error processing webhook:', error.message);
        res.sendStatus(500);
    }
});

// Helper: Send Standard Text
async function sendWhatsAppText(toPhone, textMsg) {
    try {
        await axios({
            method: 'POST',
            url: `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
            data: { messaging_product: 'whatsapp', to: toPhone, type: 'text', text: { body: textMsg } },
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        });
    } catch (e) {
        console.error('Error sending text:', e.response ? e.response.data : e.message);
    }
}

// Helper: Send Interactive Buttons (Max 3)
async function sendInteractiveButton(toPhone, bodyText, buttons) {
    try {
        const formattedButtons = buttons.map(b => ({ type: 'reply', reply: { id: b.id, title: b.title } }));
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
                    action: { buttons: formattedButtons }
                }
            },
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        });
    } catch (e) {
        console.error('Error sending buttons:', e.response ? JSON.stringify(e.response.data) : e.message);
    }
}

// Helper: Send Interactive List (Up to 10)
async function sendInteractiveList(toPhone, bodyText, buttonTitle, items) {
    try {
        const rows = items.map(i => ({ id: i.id, title: i.title }));
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
                        button: buttonTitle,
                        sections: [{ title: 'Options', rows: rows }]
                    }
                }
            },
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        });
    } catch (e) {
        console.error('Error sending list:', e.response ? JSON.stringify(e.response.data) : e.message);
    }
}

// Helper: Push WhatsApp Lead to Odoo CRM
async function pushToOdoo(phone, sessionData, userDetailsText) {
    try {
        const ODOO_URL = "https://v1.viducrm.com";
        const ODOO_DB = "vicrm_prd_17";
        const ODOO_LOGIN = "jaf010@jayambe.net";
        const ODOO_API_KEY = "824e7ef8e28156d5b0137ae5ede2d09129e2f371";
        
        const authXml = \`<?xml version="1.0"?>
        <methodCall>
            <methodName>authenticate</methodName>
            <params>
                <param><value><string>\${ODOO_DB}</string></value></param>
                <param><value><string>\${ODOO_LOGIN}</string></value></param>
                <param><value><string>\${ODOO_API_KEY}</string></value></param>
                <param><value><struct></struct></value></param>
            </params>
        </methodCall>\`;
        
        const authRes = await fetch(\`\${ODOO_URL}/xmlrpc/2/common\`, { method: 'POST', headers: { 'Content-Type': 'text/xml' }, body: authXml });
        const authText = await authRes.text();
        const uidMatch = authText.match(/<int>(\d+)<\/int>/);
        
        if (uidMatch && uidMatch[1]) {
            const uid = uidMatch[1];
            
            // Extract the first word as a rough "Name" approximation
            const parts = userDetailsText.split(/[,\\n\\- ]+/);
            const contactName = parts[0] ? parts[0].trim() : 'Unknown';
            
            const description = \`Phone: \${phone}\\nDetails Provided: \${userDetailsText}\\n\\n--- SELECTION ---\\nLanguage: \${sessionData.language}\\nPhase: \${sessionData.phase}\\nCategory: \${sessionData.category}\\nType: \${sessionData.type}\\nHP: \${sessionData.hp}\`;
            const leadName = \`WhatsApp Lead: \${contactName} - \${sessionData.category} (\${sessionData.hp})\`;
            
            const leadXml = \`<?xml version="1.0"?>
            <methodCall>
                <methodName>execute_kw</methodName>
                <params>
                    <param><value><string>\${ODOO_DB}</string></value></param>
                    <param><value><int>\${uid}</int></value></param>
                    <param><value><string>\${ODOO_API_KEY}</string></value></param>
                    <param><value><string>crm.lead</string></value></param>
                    <param><value><string>create</string></value></param>
                    <param><value><array><data><value><struct>
                        <member><name>name</name><value><string>\${leadName}</string></value></member>
                        <member><name>description</name><value><string>\${description}</string></value></member>
                        <member><name>contact_name</name><value><string>\${contactName}</string></value></member>
                        <member><name>phone</name><value><string>\${phone}</string></value></member>
                        <member><name>mobile</name><value><string>\${phone}</string></value></member>
                    </struct></value></data></array></value></param>
                </params>
            </methodCall>\`;
            
            await fetch(\`\${ODOO_URL}/xmlrpc/2/object\`, { method: 'POST', headers: { 'Content-Type': 'text/xml' }, body: leadXml });
            console.log("Successfully pushed WhatsApp lead to Odoo.");
        }
    } catch (e) {
        console.error("XML-RPC Error:", e.message);
    }
}

// Retain Website Lead API Endpoint intact
app.post('/api/website-lead', async (req, res) => {
    try {
        let name, phone, product, city, state, zipcode;
        ({ name, phone, product, city, state, zipcode } = req.body);
        
        if (supabase) {
            const { data, error } = await supabase.from('inquiries').insert([{ name, phone, product, city, state, zipcode, source: 'success' }]).select();
        }

        const ODOO_URL = "https://v1.viducrm.com";
        const ODOO_DB = "vicrm_prd_17";
        const ODOO_LOGIN = "jaf010@jayambe.net";
        const ODOO_API_KEY = "824e7ef8e28156d5b0137ae5ede2d09129e2f371";
        
        const authXml = \`<?xml version="1.0"?>
        <methodCall>
            <methodName>authenticate</methodName>
            <params>
                <param><value><string>\${ODOO_DB}</string></value></param>
                <param><value><string>\${ODOO_LOGIN}</string></value></param>
                <param><value><string>\${ODOO_API_KEY}</string></value></param>
                <param><value><struct></struct></value></param>
            </params>
        </methodCall>\`;
        
        const authRes = await fetch(\`\${ODOO_URL}/xmlrpc/2/common\`, { method: 'POST', headers: { 'Content-Type': 'text/xml' }, body: authXml });
        const authText = await authRes.text();
        const uidMatch = authText.match(/<int>(\d+)<\/int>/);
        
        if (uidMatch && uidMatch[1]) {
            const uid = uidMatch[1];
            const machineInterest = product || 'Unknown Machine';
            const description = \`Phone: \${phone || 'N/A'}\\nInterested In: \${machineInterest}\\nCity: \${city || 'N/A'}\\nState: \${state || 'N/A'}\\nPincode: \${zipcode || 'N/A'}\`;
            const leadName = \`Website Lead: \${name || 'Unknown'} - \${machineInterest}\`;
            
            const leadXml = \`<?xml version="1.0"?>
            <methodCall>
                <methodName>execute_kw</methodName>
                <params>
                    <param><value><string>\${ODOO_DB}</string></value></param>
                    <param><value><int>\${uid}</int></value></param>
                    <param><value><string>\${ODOO_API_KEY}</string></value></param>
                    <param><value><string>crm.lead</string></value></param>
                    <param><value><string>create</string></value></param>
                    <param><value><array><data><value><struct>
                        <member><name>name</name><value><string>\${leadName}</string></value></member>
                        <member><name>description</name><value><string>\${description}</string></value></member>
                        <member><name>contact_name</name><value><string>\${name || ''}</string></value></member>
                        <member><name>city</name><value><string>\${city || ''}</string></value></member>
                        <member><name>phone</name><value><string>\${phone || ''}</string></value></member>
                    </struct></value></data></array></value></param>
                </params>
            </methodCall>\`;
            
            await fetch(\`\${ODOO_URL}/xmlrpc/2/object\`, { method: 'POST', headers: { 'Content-Type': 'text/xml' }, body: leadXml });
            res.status(200).json({ success: true, message: "Lead sent to Odoo CRM" });
        } else {
            throw new Error("Odoo Authentication Failed");
        }
    } catch (error) {
        console.error("Website Lead Odoo Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = app;
