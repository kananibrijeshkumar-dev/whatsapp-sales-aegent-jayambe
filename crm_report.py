import xmlrpc.client
import json
import urllib.request
import re
from datetime import datetime

ODOO_URL = 'https://v1.viducrm.com'
ODOO_DB = 'vicrm_prd_17'
ODOO_USER = 'jaf010@jayambe.net'
ODOO_PASS = '824e7ef8e28156d5b0137ae5ede2d09129e2f371'

SUPABASE_URL = "https://uosqmchlfvvevvdmhozi.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvc3FtY2hsZnZ2ZXZ2ZG1ob3ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc0NzA1MiwiZXhwIjoyMTAyMzIzMDUyfQ.TapgthZQdJwY4PDSR8FzwZWcZqeifc2ecg6xy_2Pt_k"

def last10(p):
    if not p:
        return ""
    digits = re.sub(r'\D', '', str(p))
    return digits[-10:] if len(digits) >= 10 else digits

def stage_of(state):
    s = str(state or '')
    if s.startswith('Chat Started') or s.startswith('SESSION:'):
        return '1 - Chat started only'
    if s.startswith('Choosing Machine'):
        return '2 - Choosing machine'
    if s.startswith('Awaiting Address'):
        return '3 - Awaiting name/city'
    return '4 - Completed (name & city given)'

# 1. Authenticate with Odoo
print("Connecting to Odoo CRM...")
common = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/common')
uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_PASS, {})
if not uid:
    raise Exception("Odoo authentication failed")

models = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/object')

# Fetch Odoo leads since Oct 16
print("Fetching CRM leads...")
raw_leads = models.execute_kw(
    ODOO_DB, uid, ODOO_PASS, 'crm.lead', 'search_read',
    [[['create_date', '>=', '2026-10-16 00:00:00']]],
    {
        'fields': ['id', 'name', 'contact_name', 'phone', 'mobile', 'user_id', 'create_date', 'description'],
        'context': {'active_test': False}
    }
)
print(f"Total CRM leads fetched: {len(raw_leads)}")

# Filter WhatsApp bot leads
bot_crm_leads = [
    l for l in raw_leads
    if ('WhatsApp AI Interactive Agent' in (l.get('description') or '') or
        str(l.get('name') or '').startswith('WhatsApp Lead'))
]
print(f"WhatsApp Bot CRM leads: {len(bot_crm_leads)}")

by_phone = {}
for l in sorted(bot_crm_leads, key=lambda x: x.get('create_date') or ''):
    p1 = last10(l.get('phone'))
    p2 = last10(l.get('mobile'))
    if p1 and p1 not in by_phone:
        by_phone[p1] = l
    if p2 and p2 not in by_phone:
        by_phone[p2] = l

# 2. Fetch all customers from Supabase
print("Fetching Supabase whatsapp_customers...")
headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json"
}

all_customers = []
offset = 0
limit = 1000

while True:
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/whatsapp_customers?select=phone,name,assigned_salesperson,City,state,last_message&phone=not.like.__%25TRACKER%25&limit={limit}&offset={offset}",
        headers=headers
    )
    with urllib.request.urlopen(req) as resp:
        chunk = json.loads(resp.read().decode())
        all_customers.extend(chunk)
        if len(chunk) < limit:
            break
        offset += limit

print(f"Total Supabase Bot Customers: {len(all_customers)}")

# 3. Build comparison rows
rows = []
for c in all_customers:
    phone = c.get('phone') or ''
    p10 = last10(phone)
    crm_lead = by_phone.get(p10)
    
    clean_name = re.sub(r'\s*\[.*?\]\s*$', '', c.get('name') or '').strip() or 'New WhatsApp Inquiry'
    bot_rep = c.get('assigned_salesperson')
    if not bot_rep:
        m = re.search(r'\[(.*?)\]', c.get('name') or '')
        if m:
            bot_rep = m.group(1)
            
    crm_salesperson = None
    if crm_lead and crm_lead.get('user_id'):
        crm_salesperson = crm_lead['user_id'][1] if isinstance(crm_lead['user_id'], list) else str(crm_lead['user_id'])

    crm_created = None
    if crm_lead and crm_lead.get('create_date'):
        crm_created = crm_lead['create_date'].replace(' ', 'T') + 'Z'

    rows.append({
        "phone": phone,
        "customer_name": clean_name,
        "bot_salesperson": bot_rep,
        "city": c.get('City'),
        "bot_stage": stage_of(c.get('state')),
        "bot_requirement": c.get('state'),
        "bot_last_message": c.get('last_message'),
        "reached_crm": bool(crm_lead),
        "crm_lead_id": crm_lead['id'] if crm_lead else None,
        "crm_lead_title": crm_lead['name'] if crm_lead else None,
        "crm_salesperson": crm_salesperson,
        "crm_created_at": crm_created,
        "refreshed_at": datetime.utcnow().isoformat() + 'Z'
    })

in_crm = sum(1 for r in rows if r['reached_crm'])
not_in_crm = len(rows) - in_crm
print(f"Comparison ready: Total {len(rows)} | Reached CRM: {in_crm} | NOT in CRM: {not_in_crm}")

# 4. Upsert into Supabase `crm_vs_bot_report` table
print("Upserting into Supabase crm_vs_bot_report...")
batch_size = 200
for i in range(0, len(rows), batch_size):
    batch = rows[i:i + batch_size]
    post_req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/crm_vs_bot_report",
        data=json.dumps(batch).encode('utf-8'),
        headers={
            **headers,
            "Prefer": "resolution=merge-duplicates"
        },
        method="POST"
    )
    with urllib.request.urlopen(post_req) as post_resp:
        pass

print("ALL DATA SAVED SUCCESSFULLY IN SUPABASE!")
