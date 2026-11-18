const { createClient } = require("@supabase/supabase-js");
const https = require("https");
const dotenv = require("dotenv");
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function getSession() {
  return new Promise((resolve) => {
    const p = JSON.stringify({ jsonrpc: "2.0", method: "call", params: { db: process.env.ODOO_DB, login: process.env.ODOO_USER, password: process.env.ODOO_PASS } });
    const req = https.request("https://v1.viducrm.com/web/session/authenticate", { method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(p) } }, (res) => {
      let d = "";
      const c = res.headers["set-cookie"];
      res.on("data", chunk => d += chunk);
      res.on("end", () => resolve({ cookie: c ? c.map(x => x.split(";")[0]).join("; ") : "" }));
    });
    req.write(p); req.end();
  });
}

function call(session, model, method, args, kwargs = {}) {
  return new Promise((resolve, reject) => {
    const p = JSON.stringify({ jsonrpc: "2.0", method: "call", params: { model, method, args, kwargs } });
    const req = https.request("https://v1.viducrm.com/web/dataset/call_kw", { method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(p), "Cookie": session.cookie } }, (res) => {
      let d = "";
      res.on("data", chunk => d += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(d);
          if (parsed.error) reject(new Error(parsed.error.data ? parsed.error.data.message : parsed.error.message));
          else resolve(parsed.result);
        } catch(e) { reject(e); }
      });
    });
    req.write(p); req.end();
  });
}

(async () => {
  console.log("--- UPDATING LEAD DATES IN ODOO CRM ---");
  const session = await getSession();

  const { data: waLeads, error: waErr } = await supabase
    .from("whatsapp_customers")
    .select("phone, created_at")
    .gte("created_at", "2026-11-07T00:00:00Z");

  if (waErr) throw waErr;

  const phoneToDateMap = new Map();
  waLeads.forEach(l => {
    if (l.phone && l.created_at) {
      const plain = l.phone.replace(/[^0-9]/g, "").slice(-10);
      const dateStr = l.created_at.split("T")[0];
      phoneToDateMap.set(plain, dateStr);
    }
  });

  const { data: inqs } = await supabase
    .from("inquiries")
    .select("phone, created_date")
    .gte("created_date", "2026-11-07T00:00:00Z");
  
  if (inqs) {
    inqs.forEach(l => {
      if (l.phone && l.created_date) {
        const plain = l.phone.replace(/[^0-9]/g, "").slice(-10);
        phoneToDateMap.set(plain, l.created_date.split("T")[0]);
      }
    });
  }

  const odooLeads = await call(session, "crm.lead", "search_read", [[
    ["create_date", ">=", "2026-11-07 00:00:00"]
  ]], { fields: ["id", "phone", "mobile", "lead_date"], limit: 5000 });

  const dateToIdsMap = {};
  odooLeads.forEach(l => {
    const plainPhone = (l.phone || l.mobile || "").replace(/[^0-9]/g, "").slice(-10);
    const targetDate = phoneToDateMap.get(plainPhone);
    if (targetDate) {
      if (!dateToIdsMap[targetDate]) dateToIdsMap[targetDate] = [];
      dateToIdsMap[targetDate].push(l.id);
    }
  });

  console.log("Dates to update breakdown:");
  for (const [date, ids] of Object.entries(dateToIdsMap)) {
    console.log("Date: " + date + " => " + ids.length + " leads");
  }

  let totalUpdated = 0;
  for (const [date, ids] of Object.entries(dateToIdsMap)) {
    // Write in chunks of 50 to avoid payload size issues
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      await call(session, "crm.lead", "write", [chunk, { lead_date: date, close_date: date }], {});
      totalUpdated += chunk.length;
    }
    console.log("Updated " + ids.length + " leads to date " + date);
  }

  console.log("ALL DONE! Successfully updated " + totalUpdated + " leads to their exact original dates!");
})();