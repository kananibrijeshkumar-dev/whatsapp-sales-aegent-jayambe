require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.replace(/"/g, ''));
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
        const result = await model.generateContent("Say hello");
        console.log("Success:", result.response.text());
    } catch (e) {
        console.error("Error:", e.message);
    }
}
test();
