require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
async function test() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.replace(/"/g, ''));
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
    for (let i = 0; i < 5; i++) {
        try {
            const result = await model.generateContent("List 5 machines");
            console.log(`Success ${i}:`, result.response.text().substring(0, 10));
        } catch (e) {
            console.error(`Error ${i}:`, e.message);
        }
    }
}
test();
