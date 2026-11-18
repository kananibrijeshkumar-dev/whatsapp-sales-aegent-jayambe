require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const key = "AQ.Ab8RN6L5euFhO0" + "YWyhPaRW8Z20NAyBaPHOmz7-5xr57nMAGEQw";
const genAI = new GoogleGenerativeAI(key);

async function test(modelName) {
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const result = await model.generateContent({
            contents: [{role: 'user', parts: [{text: 'hi'}]}]
        }, { signal: controller.signal });
        
        clearTimeout(timeout);
        console.log(modelName, "SUCCESS:", result.response.text().substring(0, 10));
    } catch (e) {
        console.log(modelName, "ERROR:", e.message);
    }
}

async function run() {
    await Promise.all([
        test("gemini-2.5-flash"),
        test("gemini-flash-latest"),
        test("gemini-pro-latest"),
        test("gemini-3.5-flash-lite")
    ]);
}
run();
