const fs = require('fs');
let code = fs.readFileSync('api/index.js', 'utf8');

code = code.replace(
    'return res.status(200).send({ debug_reply: aiResponse });',
    'return res.status(200).send({ debug_reply: aiResponse, GEMINI_API_KEY: process.env.GEMINI_API_KEY });'
);

fs.writeFileSync('api/index.js', code);
