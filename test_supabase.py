import requests
import json
import os

SUPABASE_URL = "https://uosqmchlfvvevvdmhozi.supabase.co"
SUPABASE_KEY = "sb_secret_Jc084cONTCwg2Js-6U00lg_f5nj8T9v"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

res = requests.get(
    f"{SUPABASE_URL}/rest/v1/inquiries?name=eq.META_ERROR_LOG&select=phone,city,id&order=id.desc&limit=2",
    headers=headers
)

if res.status_code == 200:
    data = res.json()
    for row in data:
        print(f"PHONE: {row['phone']} - ERROR: {row['city'][:300]}...")
else:
    print("Supabase query failed:", res.status_code, res.text)
