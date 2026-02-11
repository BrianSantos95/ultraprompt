import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PromptSettings, PromptResult, Language, DetailLevel } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const generatePromptFromImage = async (
  imageFile: File,
  settings: PromptSettings
): Promise<PromptResult> => {
  try {
    const base64Data = await fileToBase64(imageFile);

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

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: imageFile.type, data: base64Data } },
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
    const imageParts = await Promise.all(
      validFiles.map(async (file) => ({
        inlineData: {
          mimeType: file.type,
          data: await fileToBase64(file),
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

    const response = await ai.models.generateContent({
      model: "nano-banana-pro-preview",
      contents: {
        parts: [...imageParts, { text: systemPrompt }]
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return text.trim();

  } catch (error: any) {
    console.error("Error analyzing specialist identity:", error);
    throw new Error(error.message || "Falha ao analisar a identidade do especialista.");
  }
};


export const generateImageFromText = async (prompt: string, options?: { aspectRatio?: string, referenceImages?: Array<{ data: string, mimeType: string }> }): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // 1. Google Gemini 3 Pro (Nano Banana Pro 3)
  // Endpoint: generateContent (not predict)
  // Model: gemini-3-pro-image-preview
  if (apiKey && !apiKey.includes('PLACEHOLDER')) {
    try {
      const model = 'gemini-3-pro-image-preview';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const parts: any[] = [{ text: prompt }];

      // Add Reference Images if provided (Multimodal)
      if (options?.referenceImages && options.referenceImages.length > 0) {
        options.referenceImages.forEach(img => {
          parts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.data
            }
          });
        });
      }

      const payload: any = {
        contents: [
          {
            parts: parts
          }
        ]
      };

      // Add Aspect Ratio if provided
      if (options?.aspectRatio) {
        payload.generationConfig = {
          imageConfig: {
            aspectRatio: options.aspectRatio
          }
        }
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn(`Gemini 3 Image Gen failed with status: ${response.status}`, errorData);
        throw new Error(`Erro na API Google: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();

      // Parse Gemini generateContent response for image
      // Typically: candidates[0].content.parts[0].inlineData.data
      const part = data.candidates?.[0]?.content?.parts?.[0];

      if (part?.inlineData?.data) {
        console.log(`Generated using Google Model: ${model}`);
        const mimeType = part.inlineData.mimeType || "image/jpeg";
        return `data:${mimeType};base64,${part.inlineData.data}`;
      } else {
        console.warn("No inlineData found in Gemini response", data);
        throw new Error("Formato de resposta inesperado da API do Google.");
      }

    } catch (e: any) {
      console.error("Google API execution error:", e);
      throw new Error(e.message || "Erro fatal na geração de imagem (Google API).");
    }
  }

  throw new Error("Chave de API inválida ou não configurada.");
};