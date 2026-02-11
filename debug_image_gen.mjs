import fetch from 'node-fetch';

const apiKey = 'AIzaSyAkZSd983wzyKhaJdHHYVg0syjSVPjIZdU'; // Hardcoded for test script only
const models = ['gemini-3-pro-image-preview', 'imagen-3.0-generate-001'];

async function testModel(modelName) {
    console.log(`\nTesting Model: ${modelName}`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;

    const payload = {
        instances: [{ prompt: "A futuristic city with flying cars, cinematic lighting" }],
        parameters: { sampleCount: 1 }
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
            console.log("Success! Image generated.");
            if (data.predictions && data.predictions[0].bytesBase64Encoded) {
                console.log("Base64 received (truncated):", data.predictions[0].bytesBase64Encoded.substring(0, 50) + "...");
            } else {
                console.log("Unexpected success response structure:", Object.keys(data));
            }
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

async function run() {
    for (const m of models) {
        await testModel(m);
    }
}

run();
