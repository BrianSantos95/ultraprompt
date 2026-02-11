import { GoogleGenAI } from "@google/genai";

const apiKey = "AIzaSyAkZSd983wzyKhaJdHHYVg0syjSVPjIZdU";

async function testModels() {
    console.log("Testing specific user request: gemini-3-pro-image-preview");

    // 1. Try generateContent (Multimodal/Standard Endpoint for Gemini 1.5+)
    console.log("\nAttempt 1: generateContent endpoint");
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Generate an image of a banana" }] }],
                generationConfig: {
                    responseMimeType: "image/jpeg"
                }
            })
        });
        const txt = await response.text();
        if (response.ok && !txt.includes("error")) console.log("✅ generateContent: SUCCESS", txt.substring(0, 100));
        else console.log("❌ generateContent: FAILED", txt.substring(0, 200));
    } catch (e) { console.log("Error", e.message); }

    // 2. Try predict (Legacy/Imagen Endpoint)
    console.log("\nAttempt 2: predict endpoint");
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:predict?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                instances: [{ prompt: "A banana" }],
                parameters: { sampleCount: 1 }
            })
        });
        const txt = await response.text();
        if (response.ok && !txt.includes("error")) console.log("✅ predict: SUCCESS", txt.substring(0, 100));
        else console.log("❌ predict: FAILED", txt.substring(0, 200));
    } catch (e) { console.log("Error", e.message); }

}

testModels();
