import re
with open('/Users/brizpatel/antigravity new site/whatsapp-sales-agent/api/index.js', 'r') as f:
    content = f.read()

cors_middleware = '''const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
        return res.status(200).json({});
    }
    next();
});'''

content = content.replace("const app = express();", cors_middleware)

with open('/Users/brizpatel/antigravity new site/whatsapp-sales-agent/api/index.js', 'w') as f:
    f.write(content)
