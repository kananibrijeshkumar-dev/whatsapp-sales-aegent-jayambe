require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const key = "AQ.Ab8RN6L5euFhO0" + "YWyhPaRW8Z20NAyBaPHOmz7-5xr57nMAGEQw";
const genAI = new GoogleGenerativeAI(key);

async function test(modelName) {
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("hi");
        console.log(modelName, "SUCCESS:", result.response.text());
    } catch (e) {
        console.log(modelName, "ERROR:", e.message);
    }
}

async function run() {
    await test("gemini-3.7-flash");
    await test("gemini-3.8-flash");
    await test("gemini-omni-1.1-flash");
    await test("gemma-4-31b-it");
}
run();
