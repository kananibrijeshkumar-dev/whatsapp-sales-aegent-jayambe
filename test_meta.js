const WHATSAPP_TOKEN = "EAAXTyBC2XwYBSdq3sw4g4F6DJsVRvZBS8LxaHLoUg9yqAT0oMU5uLmWyZCoTGtXgKQuwgzZAKQdtsbVAxy2GGogNVtp7RoAsZAuo4ZAnLQjZCG4dxDP3M3sEuxHNRN650NlEx3Q1SvrTJvC5QcLWuFD2P1fhsryvKfudFVb4fWTrrsySUZAJPZAkxVE4V8CMGhJ6sPErVRR6Y6xHH46m4t6LbSgtgWT0tZAvscG8BNDyOMDBttr6AcQ0Tw9E9zNrdHWZCgbIH2BhMCl17Y4cl4Ewu4uAZDZD";
const PHONE_NUMBER_ID = "1272560265946003";

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
                to: '919898860145',
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
