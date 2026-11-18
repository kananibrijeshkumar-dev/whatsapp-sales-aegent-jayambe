require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
async function test() {
    const key = "AQ.Ab8RN6L5euFhO0" + "YWyhPaRW8Z20NAyBaPHOmz7-5xr57nMAGEQw";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    console.log(data.models.map(m => m.name));
}
test();
