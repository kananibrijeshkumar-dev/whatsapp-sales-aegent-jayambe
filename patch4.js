const fs = require('fs');
let code = fs.readFileSync('api/index.js', 'utf8');

code = code.replace(
    'await sendWhatsAppMessage(fromPhone, aiResponse);',
    'await sendWhatsAppMessage(fromPhone, aiResponse);\n                return res.status(200).send({ debug_reply: aiResponse });'
);

fs.writeFileSync('api/index.js', code);
