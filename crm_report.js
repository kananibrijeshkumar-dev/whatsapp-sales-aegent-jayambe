// One-off report: compares every WhatsApp bot customer (Supabase) with the real leads in Odoo CRM
// and writes the result into Supabase table `crm_vs_bot_report` (view: "3_crm_vs_bot_report").
// Credentials are read from api/index.js so they are not duplicated here.
const fs = require('fs');
const path = require('path');
const xmlrpc = require('xmlrpc');
const { createClient } = require('@supabase/supabase-js');

const src = fs.readFileSync(path.join(__dirname, 'api', 'index.js'), 'utf8');
const grab = (re) => { const m = src.match(re); if (!m) throw new Error('Missing config: ' + re); return m[1]; };
const ODOO_DB = grab(/const ODOO_DB = '([^']+)'/);
const ODOO_USER = grab(/const ODOO_USER = '([^']+)'/);
const ODOO_PASS = grab(/const ODOO_PASS = '([^']+)'/);
const SUPABASE_URL = grab(/const SUPABASE_URL = "([^"]+)"/);
const SERVICE_KEY = grab(/const SERVICE_ROLE_KEY = "([^"]+)"/);
const SINCE = '2026-10-16 00:00:00';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const last10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);
const call = (client, method, params) => new Promise((res, rej) => client.methodCall(method, params, (e, v) => e ? rej(e) : res(v)));

function stageOf(state) {
    const s = String(state || '');
    if (s.startsWith('Chat Started') || s.startsWith('SESSION:')) return '1 - Chat started only';
    if (s.startsWith('Choosing Machine')) return '2 - Choosing machine';
    if (s.startsWith('Awaiting Address')) return '3 - Awaiting name/city';
    return '4 - Completed (name & city given)';
}

(async () => {
    // 1. Odoo CRM leads created by the bot
    const common = xmlrpc.createSecureClient({ host: 'v1.viducrm.com', port: 443, path: '/xmlrpc/2/common' });
    const uid = await call(common, 'authenticate', [ODOO_DB, ODOO_USER, ODOO_PASS, {}]);
    if (!uid) throw new Error('Odoo authentication failed');
    const models = xmlrpc.createSecureClient({ host: 'v1.viducrm.com', port: 443, path: '/xmlrpc/2/object' });
    const leads = await call(models, 'execute_kw', [ODOO_DB, uid, ODOO_PASS, 'crm.lead', 'search_read',
        [[['create_date', '>=', SINCE]]],
        { fields: ['id', 'name', 'contact_name', 'phone', 'mobile', 'user_id', 'create_date', 'description'], context: { active_test: false } }]);
    const botLeads = leads.filter(l => /WhatsApp AI Interactive Agent/i.test(l.description || '') || /^WhatsApp Lead/i.test(l.name || ''));
    console.log(`Odoo leads since ${SINCE}: ${leads.length} total, ${botLeads.length} created by WhatsApp bot`);

    const byPhone = {};
    for (const l of botLeads.sort((a, b) => a.create_date.localeCompare(b.create_date))) {
        for (const p of [last10(l.phone), last10(l.mobile)]) {
            if (p && !byPhone[p]) byPhone[p] = l;
        }
    }

    // 2. All bot customers from Supabase
    let customers = [];
    for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from('whatsapp_customers').select('phone,name,assigned_salesperson,City,state,last_message')
            .not('phone', 'like', '\\_\\_%').range(from, from + 999);
        if (error) throw error;
        customers = customers.concat(data);
        if (data.length < 1000) break;
    }
    customers = customers.filter(c => !/TRACKER/.test(c.phone));
    console.log('Bot customers:', customers.length);

    // 3. Compare
    const rows = customers.map(c => {
        const l = byPhone[last10(c.phone)];
        const cleanName = String(c.name || '').replace(/\s*\[.*?\]\s*$/, '').trim();
        return {
            phone: c.phone,
            customer_name: cleanName || 'New WhatsApp Inquiry',
            bot_salesperson: c.assigned_salesperson || (String(c.name || '').match(/\[(.*?)\]/) || [])[1] || null,
            city: c.City,
            bot_stage: stageOf(c.state),
            bot_requirement: c.state,
            bot_last_message: c.last_message,
            reached_crm: !!l,
            crm_lead_id: l ? l.id : null,
            crm_lead_title: l ? l.name : null,
            crm_salesperson: l && l.user_id ? l.user_id[1] : null,
            crm_created_at: l ? l.create_date.replace(' ', 'T') + 'Z' : null,
            refreshed_at: new Date().toISOString()
        };
    });

    for (let i = 0; i < rows.length; i += 200) {
        const { error } = await supabase.from('crm_vs_bot_report').upsert(rows.slice(i, i + 200), { onConflict: 'phone' });
        if (error) throw error;
    }
    const inCrm = rows.filter(r => r.reached_crm).length;
    console.log(`Saved ${rows.length} rows. Reached CRM: ${inCrm}. NOT in CRM: ${rows.length - inCrm}`);
})().catch(e => { console.error('FAILED:', e.message || e); process.exit(1); });
