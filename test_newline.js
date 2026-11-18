require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
async function test() {
    const keyWithNewline = `${process.env.GEMINI_API_KEY}\n`;
    const genAI = new GoogleGenerativeAI(keyWithNewline);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
    try {
        const result = await model.generateContent("hi");
        console.log("Success:", result.response.text());
    } catch (e) {
        console.error("Error:", e.message);
    }
}
test();
