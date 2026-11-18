with open('/Users/brizpatel/antigravity new site/whatsapp-sales-agent/api/index.js', 'r') as f:
    content = f.read()

supabase_logger = """
        const errorMsg = JSON.stringify(error.response ? error.response.data : error.message, null, 2);
        console.error('Failed to send WhatsApp message:', errorMsg);
        if (supabase) {
            await supabase.from('inquiries').insert([{
                name: 'META_ERROR_LOG',
                phone: toPhone,
                city: errorMsg.substring(0, 500)
            }]);
        }
"""

content = content.replace(
    "console.error('Failed to send WhatsApp message:', JSON.stringify(error.response ? error.response.data : error.message, null, 2));",
    supabase_logger
)

with open('/Users/brizpatel/antigravity new site/whatsapp-sales-agent/api/index.js', 'w') as f:
    f.write(content)
