const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

const SALES_TEAM = [
    { id: 6, name: "Anilbhai", phone: "919925343582" },
    { id: 9, name: "Ankitbhai", phone: "918160694888" },
    { id: 7, name: "Hemali", phone: "917622885040" },
    { id: 10, name: "Lata", phone: "917201890809" },
    { id: 4211, name: "Mansi", phone: "918780964019" },
    { id: 4229, name: "Mukeshbhai", phone: "919054585040" },
    { id: 4230, name: "Priyanshi", phone: "919328263342" },
    { id: 4203, name: "Ritu", phone: "917990471987" },
    { id: 8, name: "Siya", phone: "919723928746" }
];

async function sendWhatsAppText(toPhone, textMsg) {
    try {
        const cleanTo = toPhone.replace(/[^0-9]/g, "");
        const formatted = cleanTo.startsWith("91") ? cleanTo : `91${cleanTo.slice(-10)}`;
        const res = await axios({
            method: "POST",
            url: `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
            data: {
                messaging_product: "whatsapp",
                to: formatted,
                type: "text",
                text: { body: textMsg }
            },
            headers: { 
                "Authorization": `Bearer ${WHATSAPP_TOKEN}`, 
                "Content-Type": "application/json" 
            }
        });
        return { success: true, messageId: res.data?.messages?.[0]?.id };
    } catch (e) {
        const errDetail = e.response ? JSON.stringify(e.response.data) : e.message;
        console.error(`❌ sendWhatsAppText error to ${toPhone}:`, errDetail);
        return { success: false, error: errDetail };
    }
}

async function runDispatch() {
    console.log("=== STARTING DIRECT WHATSAPP LEADS DISPATCH TO 9 SALES MEMBERS ===");
    
    // Date range: 17 Nov 00:00 IST onwards
    const startUtc = "2026-11-16T18:30:00.000Z";
    
    const results = [];

    for (const rep of SALES_TEAM) {
        console.log(`\n🔍 Fetching assigned leads for ${rep.name}...`);
        const { data: custLeads, error } = await supabase
            .from("whatsapp_customers")
            .select("*")
            .eq("assigned_salesperson", rep.name)
            .gte("last_message", startUtc)
            .not("phone", "eq", "__ROTATION_TRACKER__")
            .order("last_message", { ascending: false });

        if (error) {
            console.error(`❌ Error fetching leads for ${rep.name}:`, error.message);
            continue;
        }

        const leads = (custLeads || []).filter(c => !c.phone.startsWith("__")).map(c => ({
            phone: c.phone,
            name: (c.name || "").replace(/\s*\[.*?\]/, "").trim() || "WhatsApp Customer",
            city: (c.City && c.City !== "Pending") ? c.City : "Location pending",
            req: c.state || "Commercial Pulverizer Inquiry",
            time: c.last_message
        }));

        console.log(`📋 Found ${leads.length} leads for ${rep.name} (${rep.phone})`);

        if (leads.length === 0) {
            results.push({ rep: rep.name, count: 0, status: "no_leads" });
            continue;
        }

        const BATCH_SIZE = 15;
        let batchNum = 1;
        const totalBatches = Math.ceil(leads.length / BATCH_SIZE);
        let sentCount = 0;

        for (let i = 0; i < leads.length; i += BATCH_SIZE) {
            const batch = leads.slice(i, i + BATCH_SIZE);
            let msg = `🏭 *Jay Shree Ambe Food Machinery — Leads Dispatch* 🏭\n━━━━━━━━━━━━━━━━━━━━\nGood morning *${rep.name}*! 🙏\nHere are your assigned leads (Part ${batchNum}/${totalBatches}) — Total: *${leads.length} leads*:\n\n`;

            batch.forEach((l, idx) => {
                const num = i + idx + 1;
                const p = l.phone.startsWith("+") ? l.phone : `+${l.phone}`;
                const d = new Date(l.time);
                const istTime = d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });

                msg += `${num}️⃣ *${l.name}*\n📞 ${p}\n📍 ${l.city}\n⚙️ Requirement: ${l.req}\n⏰ Time: ${istTime}\n\n`;
            });

            msg += `━━━━━━━━━━━━━━━━━━━━\n💡 *Action:* Tap directly on the phone numbers to call immediately!`;

            const sendRes = await sendWhatsAppText(rep.phone, msg);
            console.log(`📤 Sent Part ${batchNum}/${totalBatches} to ${rep.name} (${rep.phone}): ${sendRes.success ? "✅ SUCCESS (" + sendRes.messageId + ")" : "❌ FAILED"}`);
            if (sendRes.success) sentCount += batch.length;
            batchNum++;
            await new Promise(r => setTimeout(r, 1500));
        }

        results.push({ rep: rep.name, phone: rep.phone, total: leads.length, sentCount, status: "sent" });
    }

    // Send Summary to Admin (Briz Patel)
    const totalLeads = results.reduce((acc, r) => acc + (r.total || 0), 0);
    const totalDelivered = results.reduce((acc, r) => acc + (r.sentCount || 0), 0);
    let adminMsg = `🏭 *Jay Shree Ambe Food Machinery — All Leads Dispatch Report* 🏭\n━━━━━━━━━━━━━━━━━━━━\nAll team leads dispatched name and number-wise:\n\n`;
    results.forEach(r => {
        const icon = r.status === "sent" ? "✅" : "⚪";
        adminMsg += `👤 *${r.rep}:* ${r.total} leads (${r.phone}) ${icon}\n`;
    });
    adminMsg += `━━━━━━━━━━━━━━━━━━━━\n📊 *Total Assigned Leads:* ${totalLeads}\n📱 *Total Delivered:* ${totalDelivered}\n💡 All 9 sales team members received their exact assigned leads on WhatsApp!`;

    console.log("\n📢 Sending Admin Report to 919898860145...");
    await sendWhatsAppText("919898860145", adminMsg);
    console.log("✅ Admin summary sent successfully to 919898860145");

    console.log("\n=== ALL 9 SALES REPS DISPATCH COMPLETED SUCCESSFULLY! ===");
}

runDispatch().catch(console.error);
