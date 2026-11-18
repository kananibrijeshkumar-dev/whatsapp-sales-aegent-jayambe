require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const key = "AQ.Ab8RN6L5euFhO0" + "YWyhPaRW8Z20NAyBaPHOmz7-5xr57nMAGEQw";
const genAI = new GoogleGenerativeAI(key);
async function test() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
        const result = await model.generateContent("hi");
        console.log("SUCCESS:", result.response.text());
    } catch (e) {
        console.log("ERROR:", e.message);
    }
}
test();
