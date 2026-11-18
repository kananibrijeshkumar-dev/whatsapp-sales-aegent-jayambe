const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvc3FtY2hsZnZ2ZXZ2ZG1ob3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDcwNTIsImV4cCI6MjEwMjMyMzA1Mn0.tPbdw9r2abCemy9X-Vwr36ie503PhXkLTOCy5tWA2Ow';

async function check() {
    const res = await fetch('https://uosqmchlfvvevvdmhozi.supabase.co/rest/v1/', {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });
    console.log(await res.json());
}
check();
