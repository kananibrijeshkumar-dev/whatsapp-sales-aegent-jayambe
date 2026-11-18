const fs = require('fs');
let code = fs.readFileSync('api/index.js', 'utf8');

// Fix deduplication reference error
code = code.replace(
    'return res.status(200).send({ reply: aiResponse });',
    'return res.sendStatus(200);'
);

// Fix literal quotes in environment variables
code = code.replace(
    'const GEMINI_API_KEY = process.env.GEMINI_API_KEY;',
    'const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").replace(/"/g, "");'
);
code = code.replace(
    'const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;',
    'const WHATSAPP_TOKEN = (process.env.WHATSAPP_TOKEN || "").replace(/"/g, "");'
);
code = code.replace(
    'const SUPABASE_KEY = process.env.SUPABASE_KEY;',
    'const SUPABASE_KEY = (process.env.SUPABASE_KEY || "").replace(/"/g, "");'
);

fs.writeFileSync('api/index.js', code);
