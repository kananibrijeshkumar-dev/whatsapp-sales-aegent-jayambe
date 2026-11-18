const PUB_KEY = 'sb_publishable_iaEuQFJp99NoI5Gp00hHag_7MlsHkyK';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvc3FtY2hsZnZ2ZXZ2ZG1ob3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDcwNTIsImV4cCI6MjEwMjMyMzA1Mn0.tPbdw9r2abCemy9X-Vwr36ie503PhXkLTOCy5tWA2Ow';

async function test(keyName, key, payload) {
    const res = await fetch(`https://uosqmchlfvvevvdmhozi.supabase.co/rest/v1/whatsapp_customers`, {
        method: 'POST',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
    });
    console.log(`${keyName} status:`, res.status);
    console.log(`${keyName} body:`, await res.text());
}

async function run() {
    await test("PUB_KEY", PUB_KEY, [{ phone: '917201890711', name: 'Brijesh' }]);
    await test("ANON_KEY", ANON_KEY, [{ phone: '917201890711', name: 'Brijesh' }]);
}
run();
