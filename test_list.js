require('dotenv').config();
const axios = require('axios');
async function list() {
  const key = process.env.GEMINI_API_KEY;
  const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  console.log(res.data.models.map(m => m.name));
}
list();
