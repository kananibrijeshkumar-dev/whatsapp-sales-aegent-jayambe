const WHATSAPP_TOKEN = "EAAXTyBC2XwYBSekQUgakcZAkY2VSZB87pg8qQ9bImIg37LZBjyYU3iSkayimqsnxZBGjwH88NuXYZBrQDdMlGCHGMdn0VvOwJ7TgxZC5qbmocckduCM7WOmY7cUdZCvoCtFiEpTXmhZCEn6EXixSioZAxgMWoqlZC5KQCkhpjq6jmrv0wykY0noIi7YZCMwpRuzUsisIEAQza3Lyt4IoziMisq8FlW1ak6ltXQQzZAlFhIsE8LDjsByFwgGLcq9ZBw7XNp2qSvWHU74YTgJ6bCPxjaWjP";
const PHONE_NUMBER_ID = "1260228570511181";

async function test() {
    try {
        const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: '917201890711',
                type: 'text',
                text: { body: "Testing the new token connection..." }
            })
        });
        const data = await response.json();
        console.log("RESPONSE:", data);
    } catch (e) {
        console.error("FAILED:", e.message);
    }
}
test();
