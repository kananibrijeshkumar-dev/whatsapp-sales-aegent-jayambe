const fs = require('fs');
let code = fs.readFileSync('api/index.js', 'utf8');

code = code.replace(
    'return res.sendStatus(200);',
    'return res.status(200).send({ reply: aiResponse });'
);

fs.writeFileSync('api/index.js', code);
