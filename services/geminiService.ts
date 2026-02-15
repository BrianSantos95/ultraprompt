import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PromptSettings, PromptResult, Language, DetailLevel } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || 'dummy_key_to_prevent_crash' });

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
        const MAX_SIZE = 1024;

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
      
       STRICT RULES:
      1. **NO CREATIVITY**: Use purely descriptive, technical, and objective language.
      2. **FREEZE POSE**: Describe the pose with geometrical precision.
      3. **ANONYMITY**: Do not describe identity features (hair color, eye color, age, scars). Focus on gender, body type, and clothing.
      4. **CAMERA**: Describe exact camera angle and distance.
      5. **COMPLETENESS**: Scan from top to bottom.

      PRIORITY: LIGHTING & ATMOSPHERE. Describe lighting physics (fresnel, shadows) and skin quality (texture) without specific imperfections.

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
        model: "gemini-3-flash-preview",
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
      1. **CAPTURE IDENTITY PRECISION**: Describe specific facial bone structure, exact eye shape/color, nose bridge, jawline, skin texture.
      2. **DISTINCTIVE FEATURES (MANDATORY)**: You MUST describe any TATTOOS (location, design, color), SCARS, MOLES, or unique skin markings. If the person has face tattoos, describe them in detail.
      3. **CONSISTENCY**: Synthesize traits consistent across all provided images.
      4. **OBJECTIVE**: Be descriptive, precise, and visual.
      
      OUTPUT FORMAT:
      Return ONLY a single, highly detailed paragraph starting with: "A photo of [Age] [Gender] [Ethnicity], [Detailed Face Description], [Describe Tattoos/Markings if any], [Body/Hair Details]..."
    `;

    return await generateWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
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
      You are an elite Forensic Visual Analyst and Technical Director.
      
      CRITICAL MISSION: Deconstruct the provided image into a SURGICAL, SCIENTIFIC set of instructions for perfect reconstruction.
      
      ANALYSIS PROTOCOLS (MANDATORY):
      1. **SPATIAL & CAMERA**: Identify exact focal length (e.g., 35mm, 85mm), camera height & angle in degrees (e.g., "Low angle 30°"), distance to subject, and sensor format (e.g., "Full Frame", "Medium Format").
      2. **SURGICAL POSE RECONSTRUCTION**: Describe the pose with ANATOMICAL PRECISION. 
         - **Spine/Body**: "Torso rotated 15° left, spine erect".
         - **Limbs**: "Right arm abducted 45°, elbow flexed".
         - **HANDS/FINGERS (EXTREME PRIORITY)**: You MUST describe specific finger placement (e.g., "Index finger pointing, others curled", "Grip tension visible").
      3. **LIGHTING PHYSICS**: Map the light sources. "Key light softbox 45° left, Rim light hard 5600K right". Describe shadow falloff and contrast ratio.
      4. **SCENE & ELEMENTS**: List every background element and its spatial relationship to the subject. "Gaussian blur on background (f/1.8)".
      
      OUTPUT FORMAT (Single, dense paragraph):
      "Shot on [Camera/Lens], [Angle/Distance]. SUBJECT POSE: [Scientific Pose Description including Hand/Finger details]. LIGHTING: [Technical Lighting Setup]. SCENE: [Detailed Background & Props]. STYLE: [Visual Aesthetic keywords]."
      
      STRICTLY OBJECTIVE. NO FLUFF. USE TECHNICAL TERMINOLOGY.
    `;

    return await generateWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
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




export const generateImageFromText = async (prompt: string, options?: { aspectRatio?: string, referenceImages?: Array<{ data: string, mimeType: string }>, highRes?: boolean }): Promise<string> => {
  return await generateWithRetry(async () => {
    // Configuration for the requested model
    const config: any = {};

    if (options?.aspectRatio) {
      config.imageConfig = {
        aspectRatio: options.aspectRatio
      };
    }

    // Select model based on resolution request
    // "imagen-4.0-ultra-generate-001" is the high-fidelity model likely supporting higher res/quality
    const modelName = options?.highRes ? "imagen-4.0-ultra-generate-001" : "gemini-3-pro-image-preview";

    // Construct parts: Text prompt is mandatory
    const inputParts: any[] = [{ text: prompt }];

    // If reference images are provided (Identity or Style), add them to the input
    if (options?.referenceImages && options.referenceImages.length > 0) {
      options.referenceImages.forEach(img => {
        // Prepend images to give them context priority
        inputParts.unshift({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data
          }
        });
      });
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: inputParts
      },
      config: config
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/jpeg;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error(`O modelo ${modelName} não retornou dados de imagem.`);
  });
};