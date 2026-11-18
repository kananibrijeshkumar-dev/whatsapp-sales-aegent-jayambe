require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = (process.env.SUPABASE_KEY || "").replace(/"/g, "");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testUpsert() {
    console.log("Testing Supabase Upsert...");
    const { data, error } = await supabase
        .from('whatsapp_customers')
        .upsert({ phone: '11111', last_message: new Date() }, { onConflict: 'phone' });
    
    if (error) {
        console.error("SUPABASE ERROR:", error);
    } else {
        console.log("SUCCESS! Data:", data);
    }
}

testUpsert();
