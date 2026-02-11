import fetch from 'node-fetch';

const apiKey = 'AIzaSyAkZSd983wzyKhaJdHHYVg0syjSVPjIZdU';
const models = [
    'imagen-4.0-generate-001',
    'imagen-4.0-ultra-generate-001'
];

async function testPredict(modelName) {
    console.log(`\nTesting Model: ${modelName} (predict)`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;

    const payload = {
        instances: [{ prompt: "A futuristic city." }],
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
            console.log("Success Response Received.");
            if (data.predictions && data.predictions[0].bytesBase64Encoded) {
                console.log("Image Data Received!");
            } else {
                console.log("Structure:", Object.keys(data));
            }
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

async function run() {
    for (const m of models) {
        await testPredict(m);
    }
}

run();
