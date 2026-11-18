const { createClient } = require("@supabase/supabase-js");
const https = require("https");
const dotenv = require("dotenv");

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SALES_TEAM = [
    { id: 6, name: "Anilbhai", phone: "+91 99253 43582" },
    { id: 9, name: "Ankitbhai", phone: "+91 81606 94888" },
    { id: 7, name: "Hemali", phone: "+91 76228 85040" },
    { id: 10, name: "Lata", phone: "+91 72018 90809" },
    { id: 4211, name: "Mansi", phone: "+91 87809 64019" },
    { id: 4229, name: "Mukeshbhai", phone: "+91 90545 85040" },
    { id: 4230, name: "Priyanshi", phone: "+91 93282 63342" },
    { id: 4203, name: "Ritu", phone: "+91 79904 71987" },
    { id: 8, name: "Siya", phone: "+91 97239 28746" }
];

let cachedOdooSession = null;
function getOdooSession() {
    return new Promise((resolve, reject) => {
        if (cachedOdooSession) return resolve(cachedOdooSession);
        const authPayload = JSON.stringify({
            jsonrpc: "2.0",
            method: "call",
            params: { db: process.env.ODOO_DB, login: process.env.ODOO_USER, password: process.env.ODOO_PASS }
        });
        const req = https.request("https://v1.viducrm.com/web/session/authenticate", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(authPayload) }
        }, (res) => {
            let data = "";
            const cookies = res.headers["set-cookie"];
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                const parsed = JSON.parse(data);
                const cookieHeader = cookies ? cookies.map(c => c.split(";")[0]).join("; ") : "";
                cachedOdooSession = { uid: parsed.result.uid, cookie: cookieHeader };
                resolve(cachedOdooSession);
            });
        });
        req.on("error", reject);
        req.write(authPayload);
        req.end();
    });
}

function callOdoo(model, method, args = [], kwargs = {}) {
    return new Promise(async (resolve, reject) => {
        try {
            const session = await getOdooSession();
            const callPayload = JSON.stringify({
                jsonrpc: "2.0",
                method: "call",
                params: { model, method, args, kwargs }
            });
            const req = https.request("https://v1.viducrm.com/web/dataset/call_kw", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(callPayload),
                    "Cookie": session.cookie
                }
            }, (res) => {
                let data = "";
                res.on("data", chunk => data += chunk);
                res.on("end", () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.error) reject(new Error(parsed.error.data ? parsed.error.data.message : parsed.error.message));
                        else resolve(parsed.result);
                    } catch (e) { reject(e); }
                });
            });
            req.on("error", reject);
            req.write(callPayload);
            req.end();
        } catch(e) { reject(e); }
    });
}

async function runSync() {
    console.log("--- STARTING ODOO BACKFILL SYNC ---");
    
    console.log("Fetching existing Odoo leads since Nov 7th...");
    const existingOdoo = await callOdoo("crm.lead", "search_read", [[
        ["create_date", ">=", "2026-11-07 00:00:00"]
    ]], {
        fields: ["id", "phone", "mobile"],
        limit: 5000
    });
    
    const existingPhoneSet = new Set();
    existingOdoo.forEach(l => {
        if (l.phone) existingPhoneSet.add(l.phone.replace(/[^0-9]/g, "").slice(-10));
        if (l.mobile) existingPhoneSet.add(l.mobile.replace(/[^0-9]/g, "").slice(-10));
    });
    console.log("Found " + existingOdoo.length + " existing leads in Odoo CRM since Nov 7th.");

    console.log("Fetching Supabase whatsapp_customers...");
    const { data: waLeads, error: waErr } = await supabase
        .from("whatsapp_customers")
        .select("*")
        .gte("created_at", "2026-11-07T00:00:00Z")
        .order("created_at", { ascending: true });
    
    if (waErr) throw waErr;
    console.log("Fetched " + waLeads.length + " WhatsApp leads from Supabase.");

    const leadsToCreate = [];
    let rrCounter = 0;

    for (const lead of waLeads) {
        const plainPhone = (lead.phone || "").replace(/[^0-9]/g, "").slice(-10);
        if (!plainPhone || existingPhoneSet.has(plainPhone)) {
            continue;
        }

        let rep = null;
        if (lead.assigned_salesperson) {
            rep = SALES_TEAM.find(m => m.name.toLowerCase() === lead.assigned_salesperson.toLowerCase());
        }
        if (!rep) {
            rep = SALES_TEAM[rrCounter % SALES_TEAM.length];
            rrCounter++;
        }

        let cleanName = lead.name || "";
        if (cleanName.startsWith("New WhatsApp Inquiry")) {
            cleanName = "WhatsApp Visitor";
        } else {
            cleanName = cleanName.replace(/\s*\[.*?\]$/, "").trim();
        }

        const city = (lead.City && lead.City !== "Pending") ? lead.City : "";

        leadsToCreate.push({
            name: "WhatsApp Lead: " + cleanName + " - Inquiry",
            contact_name: cleanName,
            phone: lead.phone,
            mobile: lead.phone,
            city: city,
            user_id: rep.id,
            description: "Customer WhatsApp Lead (Backfilled)\nPhone: " + lead.phone + "\nAssigned Sales Executive: " + rep.name + " (" + rep.phone + ")\nState/Status: " + (lead.state || "N/A") + "\nCreated At: " + lead.created_at + "\nSource: WhatsApp AI Interactive Agent"
        });

        existingPhoneSet.add(plainPhone);
    }

    console.log("Prepared " + leadsToCreate.length + " missing WhatsApp leads for creation in Odoo CRM.");

    const CHUNK_SIZE = 25;
    let createdCount = 0;

    for (let i = 0; i < leadsToCreate.length; i += CHUNK_SIZE) {
        const chunk = leadsToCreate.slice(i, i + CHUNK_SIZE);
        try {
            await callOdoo("crm.lead", "create", [chunk]);
            createdCount += chunk.length;
            console.log("Created chunk " + Math.floor(i / CHUNK_SIZE + 1) + " (" + chunk.length + " leads). Total created: " + createdCount + "/" + leadsToCreate.length);
        } catch (err) {
            console.error("Error in chunk " + Math.floor(i / CHUNK_SIZE + 1) + ":", err.message);
        }
    }

    console.log("\n🎉 COMPLETED! Successfully synchronized " + createdCount + " leads into Odoo CRM!");
}

runSync().catch(console.error);