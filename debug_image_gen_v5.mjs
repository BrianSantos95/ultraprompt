import fetch from 'node-fetch';

const apiKey = process.env.VITE_GEMINI_API_KEY || 'AIzaSyAkZSd983wzyKhaJdHHYVg0syjSVPjIZdU'; // Use the hardcoded one for consistency with previous scripts if env var fails
const model = 'gemini-3-pro-image-preview';

async function testGemini3ImageGen() {
    console.log(`\nTesting Model: ${model} (generateContent)`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
        contents: [
            {
                parts: [{ text: "A futuristic city with flying cars" }]
            }
        ],
        generationConfig: {
            responseMimeType: "image/jpeg"
        }
    };

    console.log("Payload:", JSON.stringify(payload, null, 2));

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
            console.log(JSON.stringify(data, null, 2).substring(0, 500)); // Log detailed success structure
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testGemini3ImageGen();
