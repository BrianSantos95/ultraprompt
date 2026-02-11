import fetch from 'node-fetch';

const apiKey = 'AIzaSyAkZSd983wzyKhaJdHHYVg0syjSVPjIZdU';
const models = [
    'gemini-2.0-flash-exp-image-generation',
    'imagen-3.0-generate-001'
];

async function testGenerateContent(modelName) {
    console.log(`\nTesting Model: ${modelName} (generateContent)`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{
            parts: [{ text: "Generate a photorealistic image of a futuristic city." }]
        }]
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
            // Check for image data
            const candidates = data.candidates || [];
            if (candidates.length > 0) {
                const parts = candidates[0].content?.parts || [];
                parts.forEach((part, i) => {
                    if (part.inlineData) {
                        console.log(`Part ${i}: Image Received! Mime: ${part.inlineData.mimeType}`);
                    } else {
                        console.log(`Part ${i}: Text/Other`);
                    }
                });
            } else {
                console.log("No candidates returned.");
            }
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

async function run() {
    for (const m of models) {
        await testGenerateContent(m);
    }
}

run();
