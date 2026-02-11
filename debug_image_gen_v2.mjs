import fetch from 'node-fetch';

const apiKey = 'AIzaSyAkZSd983wzyKhaJdHHYVg0syjSVPjIZdU';
const model = 'gemini-2.0-flash';

async function testGenerateContent() {
    console.log(`\nTesting Model: ${model} (generateContent) for IMAGE`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{
            parts: [{ text: "Generate a photorealistic image of a futuristic city with flying cars." }]
        }],
        // Note: For Gemini 2.0, we might need specific tools config or just ask in text.
        // But if it's natively multimodal output, we just ask.
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        console.log(`Status: ${response.status} ${response.statusText}`);

        const data = await response.json();

        if (!response.ok) {
            console.error("Error Response:", JSON.stringify(data, null, 2));
        } else {
            console.log("Success Response Received.");
            // Check for image data in candidates
            const parts = data.candidates?.[0]?.content?.parts || [];
            parts.forEach((part, i) => {
                if (part.inlineData) {
                    console.log(`Part ${i}: Image Received! Mime: ${part.inlineData.mimeType}, Data Len: ${part.inlineData.data.length}`);
                } else if (part.text) {
                    console.log(`Part ${i}: Text: ${part.text.substring(0, 100)}...`);
                } else {
                    console.log(`Part ${i}: Unknown type`, Object.keys(part));
                }
            });
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testGenerateContent();
