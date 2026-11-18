require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const systemPrompt = require('./api/systemPrompt');
async function test() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.replace(/"/g, ''));
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3.5-flash-lite",
        systemInstruction: systemPrompt,
        generationConfig: { temperature: 0.2 },
    });
    try {
        const contents = [
            { role: "user", parts: [{ text: "hi" }] }
        ];
        const result = await model.generateContent({ contents });
        console.log("Success:", result.response.text());
    } catch (e) {
        console.error("Error:", e.message);
    }
}
test();
