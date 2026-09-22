require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Client } = require("@upstash/qstash");
const { createClient } = require('@supabase/supabase-js');
const systemPrompt = require('./systemPrompt');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const WHATSAPP_TOKEN = (process.env.WHATSAPP_TOKEN || "").replace(/"/g, "");
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const GEMINI_API_KEY = "AQ.Ab8RN6L5euFhO0" + "YWyhPaRW8Z20NAyBaPHOmz7-5xr57nMAGEQw";
const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = (process.env.SUPABASE_KEY || "").replace(/"/g, "");

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Initialize QStash
const qstashClient = new Client({ 
    token: QSTASH_TOKEN || "mock_token",
    baseUrl: process.env.QSTASH_URL || "https://qstash-us-east-1.upstash.io"
});

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
        temperature: 0.1 // Strict temperature to prevent hallucination
    }
});

// In-memory conversation history (very basic, for short-term memory)
const userSessions = {};
const processedMessages = new Set();

// Root endpoint for health check
app.get('/', (req, res) => {
    res.send('Jayambe WhatsApp AI Agent is running!');
});

// 1. Webhook Verification (Required by Meta to connect the webhook)
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


// 3. GitHub Actions Cron Endpoint for 1-hour follow-up
app.post('/webhook-cron', async (req, res) => {
    try {
        if (!supabase) return res.status(500).send("No Supabase configured");
        
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000).toISOString();
        
        const { data: customers, error } = await supabase
            .from('whatsapp_customers')
            .select('*')
            .lt('last_message', oneHourAgo)
            .gt('last_message', twoHoursAgo);
            
        if (customers && customers.length > 0) {
            for (const customer of customers) {
                const followUpMessage = "Hi! This is Sanjay from Jay Ambe Food Machinery following up. Did our sales team get in touch with you? Let me know if you need any more help!";
                await sendWhatsAppMessage(customer.phone, followUpMessage);
                
                // Prevent duplicate follow-ups by setting last_message to year 2000
                await supabase.from('whatsapp_customers').upsert({ phone: customer.phone, last_message: '2000-01-01T00:00:00.000Z' });
            }
        }
        res.sendStatus(200);
    } catch (err) {
        console.error("Cron Error:", err);
        res.sendStatus(500);
    }
});

// 2. Receiving Messages & Replying

app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        console.log("=== INCOMING WEBHOOK ===");
        console.log(JSON.stringify(body, null, 2));

        // Check if this is a WhatsApp status update or a message
        if (body.object) {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const messageObj = body.entry[0].changes[0].value.messages[0];

                // We only handle text messages in this basic version
                if (messageObj.type !== 'text') {
                    res.sendStatus(200);
                    return;
                }

                const messageId = messageObj.id;

                // DEDUPLICATION: Prevent Meta from processing retries multiple times
                if (processedMessages.has(messageId)) {
                    console.log("Duplicate Webhook Retry Ignored:", messageId);
                    return res.sendStatus(200);
                }
                processedMessages.add(messageId);
                setTimeout(() => processedMessages.delete(messageId), 120000); // Clear after 2 mins

                const fromPhone = messageObj.from; // Customer's phone number
                const msgBody = messageObj.text ? messageObj.text.body : "[User sent media/audio. Please tell them to text instead]";

                console.log(`Received message from ${fromPhone}: ${msgBody}`);

                // Save to Supabase CRM
                if (supabase) {
                    try {
                        await supabase
                            .from('whatsapp_customers')
                            .upsert({ phone: fromPhone, last_message: new Date() }, { onConflict: 'phone' });
                        console.log(`Saved ${fromPhone} to Supabase`);
                    } catch (dbError) {
                        console.error('Supabase Error:', dbError.message);
                    }
                }

                // Generate AI Response using the lightning-fast Lite model
                const aiResponse = await generateAIResponse(fromPhone, msgBody);

                // Send reply back to WhatsApp
                await sendWhatsAppMessage(fromPhone, aiResponse);
                return res.status(200).send({ debug_reply: aiResponse, SUPA_URL: process.env.SUPABASE_URL, SUPA_KEY: (process.env.SUPABASE_KEY || "").substring(0,10) });
                
                // Schedule 1-hour follow up via QStash
                if (QSTASH_TOKEN) {
                    try {
                        const hostUrl = req.headers.host ? `https://${req.headers.host}` : "https://jayambefoodmachinery.com"; // Fallback if host not found
                        
                        const qstashUrl = process.env.QSTASH_URL || "https://qstash-us-east-1.upstash.io";
                        const response = await axios({
                            method: 'POST',
                            url: `${qstashUrl}/v2/publish/${hostUrl}/api/followup`,
                            headers: {
                                'Authorization': `Bearer ${QSTASH_TOKEN}`,
                                'Content-Type': 'application/json',
                                'Upstash-Delay': '1h'
                            },
                            data: { phone: fromPhone }
                        });
                        console.log(`Scheduled 1h follow-up via REST API:`, response.data);
                    } catch (e) {
                        console.log("QStash schedule error:", e.message);
                    }
                }
            }
            // Always return 200 OK to Meta so they don't retry the webhook
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error('Error processing webhook:', error.message);
        res.sendStatus(500);
    }
});

// 3. Follow-up Endpoint (Triggered by QStash after 1 hour)
app.post('/api/followup', async (req, res) => {
    try {
        const body = req.body;
        const toPhone = body.phone;
        
        if (!toPhone) {
            return res.sendStatus(400);
        }

        const followUpMessage = "Hi! This is Sanjay from Jay Ambe Food Machinery following up. Did our sales team get in touch with you? Let me know if you need any more help!";
        
        await sendWhatsAppMessage(toPhone, followUpMessage);
        
        // Add to AI memory so it remembers Sanjay sent this
        if (!userSessions[toPhone]) {
            userSessions[toPhone] = [];
        }
        userSessions[toPhone].push({ role: "model", parts: [{ text: followUpMessage }] });

        console.log(`Sent 1-hour follow-up to ${toPhone}`);
        
        res.sendStatus(200);
    } catch (e) {
        console.error("Followup error:", e);
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

        // Using the global model configured with systemPrompt and strict temperature
        const result = await model.generateContent({ contents });
        const replyText = result.response.text();

        // Save history
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

        // IMAGE SUPPORT: Check if the AI included a [IMAGE: url] tag
        const imageMatch = messageContent.match(/\[IMAGE:\s*(https?:\/\/[^\]]+)\]/);

        if (imageMatch) {
            const imageUrl = imageMatch[1];
            // Remove the image tag from the text to use as the caption
            const textContent = messageContent.replace(imageMatch[0], '').trim();

            payload.type = 'image';
            payload.image = { link: imageUrl };

            if (textContent) {
                payload.image.caption = textContent;
            }
        } else {
            payload.type = 'text';
            payload.text = { body: messageContent };
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
        console.log(`Message successfully sent to ${toPhone}`);
    } catch (error) {
        console.error('Failed to send WhatsApp message:', error.response ? error.response.data : error.message);
    }
}

module.exports = app;
