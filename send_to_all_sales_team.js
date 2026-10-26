const part1 = "EAAXTyBC2XwYBShTYsk3Liq9HKdyJcji1GHPY1Qd";
const part2 = "OUZCsVIHCunjW0naySH2qMIGo5ZAHreyXK7BW0PR";
const part3 = "1lZAkWZCWR8AjwyFLa3fXM3RTUUTSkFGZCytpSYtGaMd5YLRSKW6J3WCCHRQBrDkZCB4toQwyJjB3LoJZC16aPpH4Y4DIXwZC26s0SGvhmIZBjpFTZB6AZDZD";
const WHATSAPP_TOKEN = part1 + part2 + part3;
const PHONE_NUMBER_ID = "1260228570511181";

const SUPABASE_URL = "https://uosqmchlfvvevvdmhozi.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvc3FtY2hsZnZ2ZXZ2ZG1ob3ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc0NzA1MiwiZXhwIjoyMTAyMzIzMDUyfQ.TapgthZQdJwY4PDSR8FzwZWcZqeifc2ecg6xy_2Pt_k";

const SALES_TEAM = [
    { name: 'Anilbhai', phone: '919925343582' },
    { name: 'Ankitbhai', phone: '918160694888' },
    { name: 'Hemali', phone: '917622885040' },
    { name: 'Lata', phone: '917201890809' },
    { name: 'Mansi', phone: '918780964019' },
    { name: 'Mukeshbhai', phone: '919054585040' },
    { name: 'Priyanshi', phone: '919328263342' },
    { name: 'Ritu', phone: '917990471987' },
    { name: 'Siya', phone: '919723928746' }
];

async function sendWhatsApp(toPhone, textMsg) {
    const res = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: toPhone,
            type: 'text',
            text: { body: textMsg }
        })
    });
    return await res.json();
}

function getYesterdayDateRangeIST() {
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffsetMs);
    const istYesterday = new Date(istNow);
    istYesterday.setUTCDate(istYesterday.getUTCDate() - 1);
    
    const yYear = istYesterday.getUTCFullYear();
    const yMonth = String(istYesterday.getUTCMonth() + 1).padStart(2, '0');
    const yDay = String(istYesterday.getUTCDate()).padStart(2, '0');
    const yesterdayStr = `${yDay}/${yMonth}/${yYear}`;
    
    const startUtc = new Date(Date.UTC(yYear, istYesterday.getUTCMonth(), istYesterday.getUTCDate(), 0, 0, 0) - istOffsetMs).toISOString();
    const endUtc = new Date(Date.UTC(yYear, istYesterday.getUTCMonth(), istYesterday.getUTCDate(), 23, 59, 59, 999) - istOffsetMs).toISOString();
    
    return { yesterdayStr, startUtc, endUtc };
}

async function run() {
    const { yesterdayStr, startUtc, endUtc } = getYesterdayDateRangeIST();
    console.log(`=== FETCHING YESTERDAY'S MISSED LEADS (${yesterdayStr}) ===`);
    console.log(`Range UTC: ${startUtc} to ${endUtc}`);
    
    // Fetch ONLY yesterday's unreached leads
    const res = await fetch(`${SUPABASE_URL}/rest/v1/crm_vs_bot_report?reached_crm=eq.false&bot_last_message=gte.${startUtc}&bot_last_message=lte.${endUtc}&order=bot_last_message.desc&limit=1000`, {
        headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`
        }
    });
    const allLeads = await res.json();
    console.log(`Total Unreached Leads for Yesterday (${yesterdayStr}): ${allLeads.length}`);

    const summaryReport = [];

    for (const rep of SALES_TEAM) {
        const repLeads = allLeads.filter(l => (l.bot_salesperson || '').toLowerCase() === rep.name.toLowerCase());
        console.log(`\n--------------------------------------------`);
        console.log(`Processing ${rep.name} (${rep.phone}): ${repLeads.length} missed leads`);

        if (repLeads.length === 0) {
            summaryReport.push({ rep: rep.name, phone: rep.phone, total: 0, status: "No missed leads" });
            continue;
        }

        // WhatsApp max message length is 4096 chars. We chunk in batches of 15 leads per message.
        // We will send the latest batch (up to 15 leads) immediately.
        const batch = repLeads.slice(0, 15);
        let leadsText = "";
        batch.forEach((l, idx) => {
            const num = idx + 1;
            const p = l.phone.startsWith('+') ? l.phone : `+${l.phone}`;
            const name = l.customer_name || 'Customer';
            const city = (l.city && l.city !== 'Pending') ? l.city : 'Not specified';
            const req = l.bot_requirement || l.bot_stage || 'Pulverizer';
            const d = new Date(l.bot_last_message);
            const istTime = d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

            leadsText += `${num}️⃣ *${name}*\n📞 ${p}\n📍 ${city}\n⚙️ Requirement: ${req}\n⏰ Time: ${istTime}\n\n`;
        });

        const messageBody = `🏭 *Jay Shree Ambe Food Machinery — Yesterday's Missed Leads* 🏭
━━━━━━━━━━━━━━━━━━━━
Hello *${rep.name}*! 🙏
Here are your **${batch.length} pending missed leads** from yesterday (*${yesterdayStr}*) (Total: ${repLeads.length}):

${leadsText}━━━━━━━━━━━━━━━━━━━━
💡 *Calling Instructions:*
Tap directly on the phone numbers above to call immediately and share quotation/catalogue on WhatsApp!`;

        console.log(`Sending to ${rep.name} (${rep.phone})...`);
        const result = await sendWhatsApp(rep.phone, messageBody);
        console.log(`Result for ${rep.name}:`, JSON.stringify(result));

        if (result.messages && result.messages[0]) {
            summaryReport.push({ rep: rep.name, phone: rep.phone, total: repLeads.length, sentLeads: batch.length, status: "DELIVERED", msgId: result.messages[0].id });
        } else if (result.error) {
            summaryReport.push({ rep: rep.name, phone: rep.phone, total: repLeads.length, status: "FAILED", error: result.error.message, code: result.error.code });
        }
        
        // Wait 1.5 seconds between sends to avoid rate limits
        await new Promise(r => setTimeout(r, 1500));
    }

    console.log("\n================ SUMMARY REPORT ================");
    console.table(summaryReport);
}

run();
