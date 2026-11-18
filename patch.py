import re

with open('/Users/brizpatel/antigravity new site/whatsapp-sales-agent/api/index.js', 'r') as f:
    content = f.read()

# 1. Add .trim() to token
content = content.replace('.replace(/"/g, "");', '.replace(/"/g, "").trim();')

# 2. Stringify the error so it doesn't collapse in Vercel logs
content = content.replace("console.error('Failed to send WhatsApp message:', error.response ? error.response.data : error.message);",
                          "console.error('Failed to send WhatsApp message:', JSON.stringify(error.response ? error.response.data : error.message, null, 2));")

with open('/Users/brizpatel/antigravity new site/whatsapp-sales-agent/api/index.js', 'w') as f:
    f.write(content)
