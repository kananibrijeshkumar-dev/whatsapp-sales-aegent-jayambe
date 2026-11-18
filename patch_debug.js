const fs = require('fs');
let code = fs.readFileSync('api/index.js', 'utf8');

code = code.replace(
    'return res.status(200).send({ debug_reply: aiResponse, GEMINI_API_KEY: process.env.GEMINI_API_KEY });',
    'return res.status(200).send({ debug_reply: aiResponse, SUPA_URL: process.env.SUPABASE_URL, SUPA_KEY: (process.env.SUPABASE_KEY || "").substring(0,10) });'
);

fs.writeFileSync('api/index.js', code);
