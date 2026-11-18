const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvc3FtY2hsZnZ2ZXZ2ZG1ob3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDcwNTIsImV4cCI6MjEwMjMyMzA1Mn0.tPbdw9r2abCemy9X-Vwr36ie503PhXkLTOCy5tWA2Ow';
const PUB_KEY = 'sb_publishable_iaEuQFJp99NoI5Gp00hHag_7MlsHkyK';

const candidateTables = [
    'inquiries',
    'whatsapp_customers',
    'leads',
    'whatsapp_leads',
    'customer_leads',
    'customers',
    'orders',
    'messages',
    'contacts'
];

async function checkTable(name, key) {
    const res = await fetch(`https://uosqmchlfvvevvdmhozi.supabase.co/rest/v1/${name}?limit=1`, {
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
        }
    });
    const status = res.status;
    const body = await res.text();
    return { name, status, body: body.substring(0, 80) };
}

async function run() {
    console.log("=== TESTING CANDIDATE TABLES WITH PUB_KEY ===");
    for (const t of candidateTables) {
        const r = await checkTable(t, PUB_KEY);
        console.log(`${r.name}: Status ${r.status} -> ${r.body}`);
    }

    console.log("\n=== TESTING CANDIDATE TABLES WITH ANON_KEY ===");
    for (const t of candidateTables) {
        const r = await checkTable(t, SUPABASE_KEY);
        console.log(`${r.name}: Status ${r.status} -> ${r.body}`);
    }
}
run();
