const fs = require('fs');
const file = '/Users/brizpatel/antigravity new site/jayambe-live-site/apps/web/src/components/EnquiryForm.jsx';
let content = fs.readFileSync(file, 'utf8');

const newFetch = `
      await fetch('https://script.google.com/macros/s/AKfycbw13ktW_EZU15trRdPYOBxeNffoHUJmtSd9xGDhAkxT6AQQIVP3B34a80oqNZb-kbB_/exec', {
        method: 'POST',
        body: formData,
        mode: 'no-cors'
      });

      // --- PUSH TO ODOO CRM VIA WHATSAPP BOT BACKEND ---
      try {
        await fetch('https://whatsapp-sales-aegent-jayambe.vercel.app/api/website-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            phone: form.phone,
            product: form.product,
            city: form.city,
            state: form.state,
            zipcode: form.zipcode
          })
        });
      } catch (crmErr) {
        console.error('Error pushing to CRM:', crmErr);
      }
      // -------------------------------------------------
`;

content = content.replace(/await fetch\('https:\/\/script\.google\.com\/macros.*?mode: 'no-cors'.*?\}\);/s, newFetch);

fs.writeFileSync(file, content);
console.log("Updated successfully");
