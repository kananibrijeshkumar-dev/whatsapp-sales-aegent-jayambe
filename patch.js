const fs = require('fs');
let code = fs.readFileSync('api/index.js', 'utf8');

// Patch 1: Make fallback message include error
code = code.replace(
    'return "Sorry, our AI system is currently overloaded due to high demand. Please call us directly at +91 7201890711 for immediate assistance.";',
    'return "SYSTEM ERROR: " + error.message + "\\nPlease call us at +91 7201890711 for immediate assistance.";'
);

// Patch 2: Handle non-text messages safely
code = code.replace(
    'const msgBody = messageObj.text.body; // What the customer said',
    'const msgBody = messageObj.text ? messageObj.text.body : "[User sent media/audio. Please tell them to text instead]";'
);

fs.writeFileSync('api/index.js', code);
