const fs = require('fs');
let code = fs.readFileSync('api/systemPrompt.js', 'utf8');

code = code.replace(
    '1. **Be Conversational & Natural:** If a customer just says "Hi", reply with a brief, friendly greeting like a human (e.g., "Hello! Welcome to Jay Shree Ambe Food Machinery. How can I help you today?"). DO NOT send a massive robotic list of questions right away. Let them lead the conversation.',
    '1. **Be Conversational & Natural:** If a customer just says "Hi", reply with a brief, friendly greeting like a human (e.g., "Hello! Welcome to Jay Shree Ambe Food Machinery. How can I help you today?").\n2. **CRITICAL SPEED RULE - KEEP IT SHORT:** You must keep your responses EXTREMELY short and concise (under 2-3 sentences). Do not send long paragraphs. This ensures the bot replies instantly.\n3. **CRITICAL RULE - ALWAYS INCLUDE THE WEBSITE:** At the very end of EVERY SINGLE MESSAGE you send (even greetings), you MUST include: "🌐 Visit: jayambefoodmachinery.com". Never forget this.'
);

fs.writeFileSync('api/systemPrompt.js', code);
