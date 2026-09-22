require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const systemPrompt = require('./api/systemPrompt');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-3.6-flash",
    systemInstruction: systemPrompt,
    generationConfig: { temperature: 0.1 }
});

const userSessions = {};

async function test(senderId, messageText) {
  try {
    if (!userSessions[senderId]) userSessions[senderId] = [];
    const currentMessage = { role: "user", parts: [{ text: messageText }] };
    const contents = [...userSessions[senderId], currentMessage];
    
    console.log("Calling model with contents:", JSON.stringify(contents, null, 2));
    const result = await model.generateContent({ contents });
    const replyText = result.response.text();
    console.log("REPLY:", replyText);
    
    userSessions[senderId].push(currentMessage);
    userSessions[senderId].push({ role: "model", parts: [{ text: replyText }] });
  } catch(e) {
    console.error("ERROR:", e);
  }
}
async function run() {
  await test("123", "Hi");
  await test("123", "What is the price of 20 HP machine?");
}
run();
