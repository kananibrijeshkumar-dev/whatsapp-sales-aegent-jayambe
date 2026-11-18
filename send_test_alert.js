const part1 = "EAAXTyBC2XwYBShTYsk3Liq9HKdyJcji1GHPY1Qd";
const part2 = "OUZCsVIHCunjW0naySH2qMIGo5ZAHreyXK7BW0PR";
const part3 = "1lZAkWZCWR8AjwyFLa3fXM3RTUUTSkFGZCytpSYtGaMd5YLRSKW6J3WCCHRQBrDkZCB4toQwyJjB3LoJZC16aPpH4Y4DIXwZC26s0SGvhmIZBjpFTZB6AZDZD";
const WHATSAPP_TOKEN = part1 + part2 + part3;
const PHONE_NUMBER_ID = "1260228570511181";

const targetPhone = "919898860145";

const messageBody = `🏭 *जय श्री अम्बे फूड मशीनरी — मिस्ड लीड्स अलर्ट (DEMO TEST)* 🏭
━━━━━━━━━━━━━━━━━━━━
नमस्ते! यह एक सैंपल टेस्ट मैसेज है जो आपकी सेल्स टीम को भेजा जा सकता है:

📋 *आज की पेंडिंग फॉलो-अप लीड्स:*

1️⃣ *रमेश पटेल (Ramesh Patel)*
📞 +919825012345
📍 राजकोट, गुजरात
⚙️ मशीन: 10 HP हैवी-ड्यूटी पल्वराइजर
⏰ समय: 25 Oct 02:30 PM

2️⃣ *न्यू इन्क्वायरी (New Inquiry)*
📞 +919723067890
📍 अहमदाबाद
⚙️ मशीन: आटा चक्की (5 HP)
⏰ समय: 25 Oct 04:15 PM

3️⃣ *सुरेश भाई (Suresh Kumar)*
📞 +919925098765
📍 सूरत
⚙️ मशीन: मसाला / हल्दी ग्राइंडर
⏰ समय: 25 Oct 05:40 PM

━━━━━━━━━━━━━━━━━━━━
💡 *सेल्स टीम के लिए फायदा:*
ऊपर दिए गए मोबाइल नंबरों पर सीधा क्लिक करके तुरंत कॉल लगाया जा सकता है!`;

async function sendTest() {
    try {
        console.log("Sending WhatsApp message to:", targetPhone);
        const res = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: targetPhone,
                type: 'text',
                text: { body: messageBody }
            })
        });

        const data = await res.json();
        console.log("META API RESPONSE:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("SEND FAILED:", e.message);
    }
}

sendTest();
