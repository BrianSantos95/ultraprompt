import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PromptSettings, PromptResult, Language, DetailLevel } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const processImageForGemini = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1536;

        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl.split(',')[1]);
        } else {
          reject(new Error("Failed to get canvas context"));
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (error) => reject(error);
  });
};

const generateWithRetry = async <T>(operation: () => Promise<T>, retries = 2): Promise<T> => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      console.warn(`Attempt ${i + 1} failed:`, err);
      // If it's a 500 or network error, wait and retry. If it's a 400 (client error), maybe don't retry? 
      // For now, we retry everything except explicit refusals if we could detect them.
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential-ish backoff
    }
  }
  throw lastError;
};

export const generatePromptFromImage = async (
  imageFile: File,
  settings: PromptSettings
): Promise<PromptResult> => {
  try {
    const base64Data = await processImageForGemini(imageFile);

    const languageInstruction = settings.language === Language.PT
      ? "OUTPUT LANGUAGE: PORTUGUESE (BR)."
      : "OUTPUT LANGUAGE: ENGLISH.";

    // Logic for Detail Level
    let detailInstruction = "";
    switch (settings.detailLevel) {
      case DetailLevel.HIGH:
        detailInstruction = "High precision description of body, pose, and hands. All anatomical elements must be technically correct.";
        break;
      case DetailLevel.EXTREME:
        detailInstruction = "EXTREME anatomical detail. Describe specific finger positions, weight distribution on feet, exact shoulder tilt, and muscle tension.";
        break;
      case DetailLevel.SCIENTIFIC:
        detailInstruction = "SCIENTIFIC/FORENSIC detail. Use anatomical terms (e.g., 'distal phalanges flexion', 'sternocleidomastoid tension'). Map the spatial geometry in degrees. OBJECTIVE ONLY.";
        break;
    }

    const realismKeywords = settings.realismLevel > 80
      ? "Surreal Hyper-Realistic, 8k, UHD, Raw Photo, Fujifilm, Unreal Engine 5 render, Micro-details, Pore-level detail, Anatomically accurate, Physically correct lighting"
      : settings.realismLevel > 50
        ? "Photorealistic, High Quality, Detailed, Sharp focus, Accurate anatomy"
        : "Realistic, Balanced, Digital Art style, Correct proportions";

    let focusInstructions = "Analyze the image deeply.";
    if (settings.focusSkin) focusInstructions += " PRIORITY 1: EXTREME SKIN TEXTURE. Analyze pores, micro-imperfections, subsurface scattering, vellus hair, moisture, translucency, moles, and freckles with clinical precision.";
    if (settings.focusLighting) focusInstructions += " PRIORITY 2: LIGHTING PRESERVATION. Map the exact light sources, direction (key, fill, rim), hardness, color temperature, and shadow falloff.";
    if (settings.focusCamera) focusInstructions += " PRIORITY 3: SPATIAL & CAMERA. Analyze camera height (low/eye/high), angle, focal length, and the subject's 3D orientation relative to the lens.";
    if (settings.focusStyle) focusInstructions += " PRIORITY 4: VISUAL STYLE. Identify if it is cinematic, editorial, candid, studio photography, or baroque.";

    const systemPrompt = `
      You are an elite Forensic Image Analyst and Technical Prompt Engineer.
      
      CRITICAL MISSION: You are a human photocopier. Generate a prompt that creates a PIXEL-PERFECT COPY of the reference image's composition, pose, lighting, and camera angle.
      
      ${languageInstruction}
      
      STRICT RULES (NON-NEGOTIABLE):
      1. **NO CREATIVITY**: Do not invent details. Do not stylize. Do not interpret emotions subjectively. Use purely descriptive, technical, and objective language.
      2. **FREEZE ANATOMY & POSE**: The pose, finger placement, head tilt, and spine curvature must be described with geometrical precision.
      3. **ABSOLUTE ANONYMITY (CRITICAL)**: You MUST NOT describe the person's physical appearance features.
         - **FORBIDDEN**: Hair color, eye color, skin tone, age, beard, mustache, tattoos, scars, makeup, specific facial structures.
         - **ALLOWED**: Gender ("Man", "Woman"), body type (if relevant to pose), and clothing.
         - **REASON**: This prompt will be used to apply a DIFFERENT face/identity. Describing the current face will ruin the generation.
      4. **FREEZE EXPRESSION**: Describe the expression via muscle states (contracted/relaxed) but keep it transferable (e.g., "lips corners slightly raised", "eyebrows furrowed").
      5. **CAMERA LOCK**: You must describe the exact camera angle, focal length estimate, and distance from subject.
      6. **COMPLETENESS**: Scan the image from top to bottom. Do not miss accessories, background details, or subtle posture nuances.

      PRIORITY: LIGHTING & ATMOSPHERE
      - You must obsessively describe lighting physics: "fresnel effect", "specular highlights on skin", "subtle shadows in crevices", "volumetric lighting".
      - Describe skin QUALITY (e.g., "realistic skin texture", "subsurface scattering") but WITHOUT specific imperfections like pimples or unique rugosity of the reference.

      CONFIGURATION:
      - Precision: ${settings.detailLevel} (${detailInstruction})
      - Realism Target: ${settings.realismLevel}/100 (Keywords: ${realismKeywords})
      - Focus Areas: ${focusInstructions}

      STRUCTURE OF THE PROMPT:
      0.  VALIDATION: Check if a body or face is detected. If not, set 'bodyDetected' to false.
      1.  **SUBJECT & POSE**: "[Gender], [Body Type], [Exact Pose Description - Spine/Shoulders/Hips], [Hand/Finger Details], [Foot/Stance Details]". (DO NOT mention hair, beard, age, or ethnicity).
      2.  **EXPRESSION**: "[facial muscle state], [gaze direction]".
      3.  **SKIN & TEXTURE**: "[Realistic skin texture], [Subsurface Scattering], [Moisture]". (No specific scars/blemishes).
      4.  **CLOTHING & DRAPE**: "[Material Physics], [Fabric Weight], [Folds/Tension based on pose]".
      5.  **SPATIAL & LIGHT**: "[Camera Angle], [Focal Length], [Lighting Direction/Hardness/Color], [Environment/Background]".
      6.  **NEGATIVE PROMPT**: Must explicitly include: "specific face, likeness, wrinkles, blemishes, tattoos, beard, long hair, hair color, eye color, incorrect anatomy, extra fingers, missing limbs, distorted hands".

      The output 'prompt' must be a comma-separated list of highly descriptive tags and technical sentences.
    `;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        prompt: {
          type: Type.STRING,
          description: "The highly detailed positive prompt for image generation.",
        },
        negativePrompt: {
          type: Type.STRING,
          description: "Terms to exclude to maintain high quality and prevent changes to pose/identity.",
        },
        bodyDetected: {
          type: Type.BOOLEAN,
          description: "True if a human body or face is clearly detected.",
        },
        poseType: {
          type: Type.STRING,
          description: "Type of pose detected (e.g., 'full-body', 'half-body', 'close-up').",
        }
      },
      required: ["prompt", "negativePrompt", "bodyDetected", "poseType"],
    };

    return await generateWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Data } },
            { text: systemPrompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");

      const json = JSON.parse(text);

      if (json.bodyDetected === false) {
        throw new Error("Erro: corpo ou pose não detectados com precisão suficiente.");
      }

      return {
        prompt: json.prompt,
        negativePrompt: json.negativePrompt
      };
    });

  } catch (error: any) {
    console.error("Error generating prompt:", error);
    throw new Error(error.message || "Falha ao gerar o prompt.");
  }
};


export const analyzeSpecialistIdentity = async (
  imageFiles: File[]
): Promise<string> => {
  try {
    const validFiles = imageFiles.slice(0, 6); // Limit to 6 as requested

    // Process all images
    const imageParts = await Promise.all(
      validFiles.map(async (file) => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: await processImageForGemini(file),
        },
      }))
    );

    const systemPrompt = `
      You are an expert AI photographer and visual editor.

      CRITICAL MISSION: Analyze the provided images of a "Specialist" to generate a Master Description that captures their EXACT LIKENESS.
      The goal is to allow regenerating images of THIS SPECIFIC PERSON in new contexts while maintaining their identity 100%.

      STRICT RULES:
      1. **CAPTURE IDENTITY PRECISION**: Describe specific facial bone structure, exact eye shape/color, nose bridge, jawline, skin texture, and unique identifiers (moles, scars).
      2. **CONSISTENCY**: Synthesize traits consistent across all provided images.
      3. **OBJECTIVE**: Be descriptive, precise, and visual.
      
      OUTPUT FORMAT:
      Return ONLY a single, highly detailed paragraph starting with: "A photo of [Age] [Gender] [Ethnicity], [Detailed Face Description], [Body/Hair Details]..."
    `;

    return await generateWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: {
          parts: [...imageParts, { text: systemPrompt }]
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");

      return text.trim();
    });

  } catch (error: any) {
    console.error("Error analyzing specialist identity:", error);
    throw new Error(error.message || "Falha ao analisar a identidade do especialista.");
  }
};

export const analyzeStyleReference = async (imageFile: File): Promise<string> => {
  try {
    const base64 = await processImageForGemini(imageFile);

    const systemPrompt = `
      You are an expert Director of Photography and Art Director.
      
      MISSION: Analyze the provided image to create a Technical Style & Pose Description.
      
      OUTPUT STRICTLY IN THIS FORMAT (Comma separated):
      "Medium Shot, Low Angle, Dramatic Lighting (Cyan/Orange), Cyberpunk Aesthetic, Subject posing with arms crossed, intense expression, city background with bokeh"
      
      RULES:
      1. IGNORE the identity of the person (do not describe face details).
      2. FOCUS on: Camera Angle, Lighting, Color Palette, Pose, Composition, Background style.
      3. Be concise and technical.
    `;

    return await generateWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: {
          parts: [{ inlineData: { mimeType: "image/jpeg", data: base64 } }, { text: systemPrompt }]
        }
      });
      return response.text?.trim() || "";
    });

  } catch (error: any) {
    console.error("Error analyzing style:", error);
    return "Cinematic shot, professional lighting, realistic texture."; // Fallback
  }
};


export const generateImageFromText = async (prompt: string, options?: { aspectRatio?: string, referenceImages?: Array<{ data: string, mimeType: string }> }): Promise<string> => {
  try {
    // Determine Aspect Ratio for Imagen/Gemini (usually accepts "1:1", "16:9", etc directly)
    // or we might need to map to specific strings if the model is strict.
    // For now, passing the string directly or default '1:1'.
    const aspect = options?.aspectRatio || "1:1";

    const modelId = "nano-banana-pro-3"; // User specified model

    // Construct the request
    // Note: If using a custom finetuned model, the ID might be 'models/nano-banana-pro-3' or similar.
    // We try the bare ID first.

    return await generateWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          // If this is an Imagen-class model accessed via generateContent:
          responseMimeType: "image/jpeg",
        }
      });

      // Check for inline data (Base64)
      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
          }
        }
      }

      // If no inline data, check properly...
      // Some older endpoints returned predictions.

      throw new Error("A IA não retornou imagem. Verifique se o modelo suporta geração de imagem.");
    });

  } catch (error: any) {
    console.error("Gemini Image Gen Error:", error);
    // Fallback/Error Message
    throw new Error(`Falha na geração com ${"nano-banana-pro-3"}: ${error.message}`);
  }
};