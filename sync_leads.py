import urllib.request
import json

SUPABASE_URL = "https://uosqmchlfvvevvdmhozi.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvc3FtY2hsZnZ2ZXZ2ZG1ob3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDcwNTIsImV4cCI6MjEwMjMyMzA1Mn0.tPbdw9r2abCemy9X-Vwr36ie503PhXkLTOCy5tWA2Ow"

req = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/inquiries?select=*",
    headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
)

with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())

print(f"Found {len(data)} total inquiries in Supabase.")

import urllib.parse
from datetime import datetime

# Filter leads from Oct 1 onwards
new_leads = []
for row in data:
    if row.get('created_date'):
        dt = row['created_date'][:10]
        if dt >= '2026-10-01' and row.get('name') != 'Antigravity Test' and row.get('name') != 'Antigravity Live Test':
            new_leads.append(row)

print(f"Found {len(new_leads)} missing leads since Oct 1.")

for lead in new_leads:
    payload = json.dumps({
        "name": lead.get('name'),
        "phone": lead.get('phone'),
        "product": lead.get('product'),
        "city": lead.get('city'),
        "state": lead.get('state'),
        "zipcode": lead.get('zipcode')
    }).encode('utf-8')
    
    preq = urllib.request.Request(
        "https://whatsapp-sales-agent-blond.vercel.app/api/website-lead",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(preq) as presp:
            res = json.loads(presp.read().decode())
            print(f"Pushed {lead.get('name')} to Odoo: {res}")
    except Exception as e:
        print(f"Failed to push {lead.get('name')}: {e}")

