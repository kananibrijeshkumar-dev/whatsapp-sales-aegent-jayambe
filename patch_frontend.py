import re
with open('/Users/brizpatel/antigravity new site/jayambe-live-site/apps/web/src/components/EnquiryForm.jsx', 'r') as f:
    content = f.read()

# Remove the insertedId and Supabase block
content = re.sub(r"    let insertedId = null;[\s\S]*?} catch \(err\) \{\n      console\.error\('Error saving to Supabase:', err\);\n    \}", "    // Bypass RLS by letting the Vercel backend do the insert", content)

# Remove the Update block at the bottom
content = re.sub(r"    // Update Supabase with final sync status[\s\S]*?console\.error\('Error updating sync status:', err\);\n      \}\n    \}", "", content)

with open('/Users/brizpatel/antigravity new site/jayambe-live-site/apps/web/src/components/EnquiryForm.jsx', 'w') as f:
    f.write(content)
