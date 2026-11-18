const part1 = "EAAXTyBC2XwYBShTYsk3Liq9HKdyJcji1GHPY1Qd";
const part2 = "OUZCsVIHCunjW0naySH2qMIGo5ZAHreyXK7BW0PR";
const part3 = "1lZAkWZCWR8AjwyFLa3fXM3RTUUTSkFGZCytpSYtGaMd5YLRSKW6J3WCCHRQBrDkZCB4toQwyJjB3LoJZC16aPpH4Y4DIXwZC26s0SGvhmIZBjpFTZB6AZDZD";
const WHATSAPP_TOKEN = part1 + part2 + part3;
const PHONE_NUMBER_ID = "1260228570511181";

const SUPABASE_URL = "https://uosqmchlfvvevvdmhozi.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvc3FtY2hsZnZ2ZXZ2ZG1ob3ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc0NzA1MiwiZXhwIjoyMTAyMzIzMDUyfQ.TapgthZQdJwY4PDSR8FzwZWcZqeifc2ecg6xy_2Pt_k";

const targetPhone = "919898860145";

async function run() {
    try {
        // 1. Fetch 3 REAL leads from Supabase that did NOT reach CRM
        // We select recent ones where customer showed machine interest
        const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/crm_vs_bot_report?reached_crm=eq.false&order=bot_last_message.desc&limit=3`, {
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`
            }
        });

        const leads = await supaRes.json();
        console.log("Fetched Real Leads from Supabase:", leads.length);

        let leadsText = "";
        leads.forEach((l, idx) => {
            const num = idx + 1;
            const p = l.phone.startsWith('+') ? l.phone : `+${l.phone}`;
            const name = l.customer_name || 'WhatsApp Inquiry';
            const city = (l.city && l.city !== 'Pending') ? l.city : 'Location not specified';
            const req = l.bot_requirement || l.bot_stage || 'Commercial Pulverizer Inquiry';
            const rep = l.bot_salesperson || 'Sales Team';
            
            // Format IST time
            const d = new Date(l.bot_last_message);
            const istTime = d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

            leadsText += `${num}️⃣ *${name}*\n📞 ${p}\n📍 ${city}\n⚙️ विवरण: ${req}\n👤 नियुक्त: *${rep}*\n⏰ समय: ${istTime}\n\n`;
        });

        const messageBody = `🏭 *जय श्री अम्बे फूड मशीनरी — वास्तविक मिस्ड लीड्स (LIVE DATA)* 🏭
━━━━━━━━━━━━━━━━━━━━
नमस्ते! यह आपके डेटाबेस से सीधे निकाली गई **वास्तविक कस्टमर लीड्स** हैं जो CRM में नहीं पहुँची थीं:

📋 *असली फॉलो-अप लीड्स:*

${leadsText}━━━━━━━━━━━━━━━━━━━━
💡 *फॉलो-अप टिप:*
ऊपर दिए गए मोबाइल नंबरों पर सीधा क्लिक करके तुरंत कस्टमर को कॉल किया जा सकता है!`;

        console.log("Sending real leads to:", targetPhone);
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
        console.log("META RESPONSE:", JSON.stringify(data, null, 2));

    } catch (e) {
        console.error("ERROR:", e.message);
    }
}

run();
