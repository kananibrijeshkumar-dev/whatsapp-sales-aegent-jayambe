require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
    const result = await model.generateContent("Say hello");
    console.log("SUCCESS:", result.response.text());
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}
test();
