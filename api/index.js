require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Client } = require("@upstash/qstash");
const { createClient } = require('@supabase/supabase-js');
const systemPrompt = require('./systemPrompt');

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

// Token configuration
const part1 = "EAAXTyBC2XwYBShTYsk3Liq9HKdyJcji1GHPY1Qd";
const part2 = "OUZCsVIHCunjW0naySH2qMIGo5ZAHreyXK7BW0PR";
const part3 = "1lZAkWZCWR8AjwyFLa3fXM3RTUUTSkFGZCytpSYtGaMd5YLRSKW6J3WCCHRQBrDkZCB4toQwyJjB3LoJZC16aPpH4Y4DIXwZC26s0SGvhmIZBjpFTZB6AZDZD";

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || (part1 + part2 + part3);
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || '1272560265946003';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'jayambebot2024';
const GEMINI_API_KEY = "AQ.Ab8RN6L5euFhO0" + "YWyhPaRW8Z20NAyBaPHOmz7-5xr57nMAGEQw";
const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const SUPABASE_URL = "https://uosqmchlfvvevvdmhozi.supabase.co";
const SUPABASE_KEY = "sb_secret_" + "Jc084cONTCwg2Js" + "-6U00lg_f5nj8T9v";

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Initialize QStash
const qstashClient = new Client({ 
    token: QSTASH_TOKEN || "mock_token",
    baseUrl: process.env.QSTASH_URL || "https://qstash-us-east-1.upstash.io"
});

// Initialize Gemini AI with your systemPrompt
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
        temperature: 0.1
    }
});

const userSessions = {};
const processedMessages = new Set();

app.get('/', (req, res) => {
    res.send('Jayambe WhatsApp AI Agent is running!');
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
        if (body.object) {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const messageObj = body.entry[0].changes[0].value.messages[0];
                const messageId = messageObj.id;

                if (processedMessages.has(messageId)) {
                    return res.sendStatus(200);
                }
                processedMessages.add(messageId);
                setTimeout(() => processedMessages.delete(messageId), 120000);

                const fromPhone = messageObj.from;
                let msgBody = "";
                if (messageObj.type === 'text') {
                    msgBody = messageObj.text.body;
                } else if (messageObj.type === 'interactive') {
                    if (messageObj.interactive.type === 'button_reply') {
                        msgBody = messageObj.interactive.button_reply.title;
                    } else if (messageObj.interactive.type === 'list_reply') {
                        msgBody = messageObj.interactive.list_reply.title;
                    }
                } else {
                    msgBody = "[User sent media/audio. Please tell them to text instead]";
                }

                console.log(`Received message from ${fromPhone}: ${msgBody}`);

                // 1. Save to Supabase
                if (supabase) {
                    try {
                        const { data: existingCustomer } = await supabase.from('whatsapp_customers').select('phone').eq('phone', fromPhone).maybeSingle();
                        if (existingCustomer) {
                            await supabase.from('whatsapp_customers').update({ last_message: new Date() }).eq('phone', fromPhone);
                        } else {
                            await supabase.from('whatsapp_customers').insert({ phone: fromPhone, last_message: new Date() });
                        }
                    } catch (dbError) {
                        console.error('Supabase Error:', dbError.message);
                    }
                }

                // 2. Generate Gemini AI Response
                let aiResponse = await generateAIResponse(fromPhone, msgBody);

                // 3. Extract customer lead data
                const dataMatch = aiResponse.match(/\[DATA:\s*(\{.*?\})\s*\]/s);
                if (dataMatch && supabase) {
                    try {
                        const extractedData = JSON.parse(dataMatch[1]);
                        const updatePayload = {};
                        if (extractedData.name) updatePayload.name = extractedData.name;
                        if (extractedData.city) updatePayload.City = extractedData.city;
                        if (extractedData.state) updatePayload.state = extractedData.state;
                        if (extractedData.pincode) updatePayload.Pincode = extractedData.pincode;
                        
                        if (Object.keys(updatePayload).length > 0) {
                            await supabase.from('whatsapp_customers').update(updatePayload).eq('phone', fromPhone);
                            console.log(`Updated customer data in Supabase:`, updatePayload);
                        }

                        // 4. Push to Odoo CRM
                        const ODOO_URL = "https://v1.viducrm.com";
                        const ODOO_DB = "vicrm_prd_17";
                        const ODOO_LOGIN = "jaf010@jayambe.net";
                        const ODOO_API_KEY = "824e7ef8e28156d5b0137ae5ede2d09129e2f371";
                        
                        try {
                            const authXml = `<?xml version="1.0"?>
                            <methodCall><methodName>authenticate</methodName><params>
                            <param><value><string>${ODOO_DB}</string></value></param>
                            <param><value><string>${ODOO_LOGIN}</string></value></param>
                            <param><value><string>${ODOO_API_KEY}</string></value></param>
                            <param><value><struct></struct></value></param>
                            </params></methodCall>`;
                            
                            const authRes = await axios.post(`${ODOO_URL}/xmlrpc/2/common`, authXml, { headers: { 'Content-Type': 'text/xml' } });
                            const uidMatch = authRes.data.match(/<int>(\d+)<\/int>/);
                            
                            if (uidMatch && uidMatch[1]) {
                                const uid = uidMatch[1];
                                const machineInterest = extractedData.machine || 'Commercial Pulverizer';
                                const description = `Phone: ${fromPhone}\nInterested In: ${machineInterest}\nCity: ${extractedData.city || 'N/A'}\nState: ${extractedData.state || 'N/A'}\nPincode: ${extractedData.pincode || 'N/A'}`;
                                const leadName = `WhatsApp Lead: ${extractedData.name || 'Unknown'} - ${machineInterest}`;
                                
                                const leadXml = `<?xml version="1.0"?>
                                <methodCall><methodName>execute_kw</methodName><params>
                                    <param><value><string>${ODOO_DB}</string></value></param>
                                    <param><value><int>${uid}</int></value></param>
                                    <param><value><string>${ODOO_API_KEY}</string></value></param>
                                    <param><value><string>crm.lead</string></value></param>
                                    <param><value><string>create</string></value></param>
                                    <param><value><array><data><value><struct>
                                        <member><name>name</name><value><string>${leadName}</string></value></member>
                                        <member><name>description</name><value><string>${description}</string></value></member>
                                        <member><name>contact_name</name><value><string>${extractedData.name || ''}</string></value></member>
                                        <member><name>city</name><value><string>${extractedData.city || ''}</string></value></member>
                                        <member><name>phone</name><value><string>${fromPhone}</string></value></member>
                                    </struct></value></data></array></value></param>
                                </params></methodCall>`;
                                
                                await axios.post(`${ODOO_URL}/xmlrpc/2/object`, leadXml, { headers: { 'Content-Type': 'text/xml' } });
                            }
                        } catch (crmErr) {
                            console.error("CRM Error:", crmErr.message);
                        }
                    } catch (e) {
                        console.error("Data parse error:", e.message);
                    }
                }

                // 5. Send WhatsApp Reply
                await sendWhatsAppMessage(fromPhone, aiResponse);
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error('Error processing webhook:', error.message);
        res.sendStatus(500);
    }
});

async function generateAIResponse(senderId, messageText) {
    try {
        if (!userSessions[senderId]) {
            userSessions[senderId] = [];
        }

        const currentMessage = { role: "user", parts: [{ text: messageText }] };
        const contents = [...userSessions[senderId], currentMessage];

        const result = await model.generateContent({ contents });
        const replyText = result.response.text();

        userSessions[senderId].push(currentMessage);
        userSessions[senderId].push({ role: "model", parts: [{ text: replyText }] });

        if (userSessions[senderId].length > 10) {
            userSessions[senderId] = userSessions[senderId].slice(userSessions[senderId].length - 10);
        }

        return replyText;
    } catch (error) {
        console.error("AI Generation Error:", error.message);
        return "SYSTEM ERROR: " + error.message + "\nPlease call us at +91 7201890711 for immediate assistance.";
    }
}

async function sendWhatsAppMessage(toPhone, messageContent) {
    try {
        let payload = {
            messaging_product: 'whatsapp',
            to: toPhone,
        };

        const imageMatch = messageContent.match(/\[IMAGE:\s*(https?:\/\/[^\]]+)\]/);

        if (imageMatch) {
            const imageUrl = imageMatch[1];
            const textContent = messageContent.replace(imageMatch[0], '').replace(/\[DATA:.*?\]/s, '').trim();

            payload.type = 'image';
            payload.image = { link: imageUrl };

            if (textContent) {
                payload.image.caption = textContent;
            }
        } else {
            payload.type = 'text';
            payload.text = { body: messageContent.replace(/\[DATA:.*?\]/s, '').trim() };
        }

        await axios({
            method: 'POST',
            url: `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
            data: payload,
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        console.error('Failed to send WhatsApp message:', error.response ? error.response.data : error.message);
    }
}

module.exports = app;
