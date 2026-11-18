import re
with open('/Users/brizpatel/antigravity new site/jayambe-live-site/apps/web/src/components/EnquiryForm.jsx', 'r') as f:
    content = f.read()

# Remove supabase import
content = re.sub(r"import\s*\{\s*supabase\s*\}\s*from\s*'[^']+';\n", "", content)

# Remove syncSuccess
content = re.sub(r"\s*let syncSuccess = false;", "", content)
content = re.sub(r"\s*syncSuccess = true;", "", content)
content = re.sub(r"\s*syncSuccess = false;", "", content)

with open('/Users/brizpatel/antigravity new site/jayambe-live-site/apps/web/src/components/EnquiryForm.jsx', 'w') as f:
    f.write(content)
