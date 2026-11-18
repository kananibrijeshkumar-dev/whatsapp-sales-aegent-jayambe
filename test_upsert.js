require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const badKey = process.env.SUPABASE_KEY + "\n";
const supabase = createClient(process.env.SUPABASE_URL, badKey);
async function test() {
    const { data, error } = await supabase
        .from('whatsapp_customers')
        .upsert({ phone: '11111', last_message: new Date() }, { onConflict: 'phone' });
    console.log("Error:", error);
}
test();
