import React, { useState, useRef, useEffect } from 'react';
import {
    Upload, X, Image as ImageIcon, Sparkles, Wand2,
    Maximize, Smartphone, Monitor, RectangleVertical, Square,
    User, Download, Layers, RefreshCcw, Loader2, Camera,
    Sun, Moon, Zap, Palette, Aperture, Film, Play, Edit3,
    Briefcase, MapPin, Shirt, Package, Type, ChevronRight, AlertTriangle
} from 'lucide-react';
import { analyzeSpecialistIdentity, generateImageFromText, analyzeStyleReference } from '../services/geminiService';
import { ImageReference, AspectRatio } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import Login from './auth/Login';
import { InsufficientCreditsModal } from './InsufficientCreditsModal';

interface UltraGenViewProps {
    onNavigate?: (view: any) => void;
}

export const UltraGenView: React.FC<UltraGenViewProps> = ({ onNavigate }) => {
    // --- State Management ---
    const [specialistImages, setSpecialistImages] = useState<ImageReference[]>([]);
    const [referenceImages, setReferenceImages] = useState<ImageReference[]>([]);
    const [showCreditModal, setShowCreditModal] = useState(false);

    // Modes
    type CreationMode = 'visual' | 'prompt' | 'ultra';
    const [activeMode, setActiveMode] = useState<CreationMode>('visual');

    // Simple Mode Input
    const [prompt, setPrompt] = useState('');

    // Ultra Mode Inputs
    const [niche, setNiche] = useState('');
    const [environment, setEnvironment] = useState('');
    const [description, setDescription] = useState(''); // Pose, outfit, style
    const [cameraShot, setCameraShot] = useState('');
    const [cameraAngle, setCameraAngle] = useState('');
    const [hasObjectImage, setHasObjectImage] = useState(false);
    const [objectImagePreview, setObjectImagePreview] = useState<string | null>(null);
    const [objectImageFile, setObjectImageFile] = useState<File | null>(null);
    const [objectDetails, setObjectDetails] = useState('');

    // Edit & Settings
    const [editPrompt, setEditPrompt] = useState('');
    const [ratio, setRatio] = useState<AspectRatio>('4:5');
    const [isHighRes, setIsHighRes] = useState(false);

    // Execution State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [generatedPrompt, setGeneratedPrompt] = useState(''); // Stores the full prompt used

    // Identity Cache
    const [specialistDescription, setSpecialistDescription] = useState('');

    // Refs
    const specialistInputRef = useRef<HTMLInputElement>(null);
    const referenceInputRef = useRef<HTMLInputElement>(null);
    const objectImageInputRef = useRef<HTMLInputElement>(null);

    const ratios = [
        { id: '1:1', icon: Square, label: '1:1' },
        { id: '4:5', icon: RectangleVertical, label: '4:5' },
        { id: '16:9', icon: Monitor, label: '16:9' },
        { id: '9:16', icon: Smartphone, label: '9:16' },
    ];

    // --- Handlers ---
    const handleSpecialistUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const spacesLeft = 6 - specialistImages.length;
            const newFiles = Array.from(e.target.files).slice(0, spacesLeft).map((file: File) => ({
                file,
                previewUrl: URL.createObjectURL(file)
            }));
            setSpecialistImages(prev => [...prev, ...newFiles]);
            setSpecialistDescription(''); // Reset cache when images change
        }
    };

    const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map((file: File) => ({
                file,
                previewUrl: URL.createObjectURL(file)
            }));
            setReferenceImages(prev => [...prev, ...newFiles]);
        }
    };

    const handleObjectImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setObjectImagePreview(URL.createObjectURL(file));
            setObjectImageFile(file);
            setHasObjectImage(true);
        }
    };

    const removeSpecialistImage = (index: number) => {
        setSpecialistImages(prev => {
            const newImages = [...prev];
            URL.revokeObjectURL(newImages[index].previewUrl);
            newImages.splice(index, 1);
            return newImages;
        });
        setSpecialistDescription('');
    };

    const removeReferenceImage = (index: number) => {
        setReferenceImages(prev => {
            const newImages = [...prev];
            URL.revokeObjectURL(newImages[index].previewUrl);
            newImages.splice(index, 1);
            return newImages;
        });
    };

    const getDimensions = (r: AspectRatio) => {
        switch (r) {
            case '16:9': return '&width=1280&height=720';
            case '9:16': return '&width=720&height=1280';
            case '4:5': return '&width=816&height=1024';
            case '1:1': default: return '&width=1024&height=1024';
        }
    };

    // --- Core Logic ---

    // Helper to process & optimize images for AI (Resizing + Format Conversion)
    const processImageForAI = (file: File): Promise<{ base64: string, mimeType: string }> => {
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

                    // Resize logic: Max 1024px on longest side to avoid API limits/timeouts and improve iOS memory usage
                    const MAX_SIZE = 1024;
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error("Canvas context failed"));
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to JPEG (handles HEIC/transparency/size)
                    const mimeType = 'image/jpeg';
                    const dataUrl = canvas.toDataURL(mimeType, 0.85); // 85% quality
                    const base64 = dataUrl.split(',')[1];
                    resolve({ base64, mimeType });
                };
                img.onerror = () => reject(new Error("Falha ao processar imagem. Tente outra foto."));
            };
            reader.onerror = () => reject(new Error("Erro ao ler arquivo."));
        });
    };

    // --- Auth & Credits ---
    const { user, credits, refreshCredits } = useAuth();


    // ... inside UltraGenView component

    // Valid values for photo style
    type PhotoStyle = 'professional' | 'iphone' | 'selfie' | 'ultra_mode';
    const [photoStyle, setPhotoStyle] = useState<PhotoStyle>('professional');

    // ... existing state

    const handleGenerate = async (isEdit: boolean) => {
        // 1. Validation Checks
        if ((credits || 0) <= 0) {
            setShowCreditModal(true);
            return;
        }

        if (activeMode === 'visual' && referenceImages.length === 0 && specialistImages.length === 0) {
            alert("Adicione pelo menos uma imagem de referência ou especialista.");
            return;
        }

        if (activeMode === 'prompt' && !prompt.trim()) {
            alert("Digite um prompt para gerar a imagem.");
            return;
        }

        if (activeMode === 'ultra' && !description.trim()) {
            alert("Descreva a pose e o estilo da imagem.");
            return;
        }

        setIsGenerating(true);
        setStatusMessage(isEdit ? "Aplicando edições..." : "Iniciando processo criativo...");

        try {
            let finalPromptToUse = "";
            let referenceImagesPayload: Array<{ data: string, mimeType: string }> = [];


            // 1. Prepare Reference Images Logic
            // MODE: VISUAL (Needs Style/Pose + Identity)
            if (activeMode === 'visual') {
                // Image 1: Style/Pose Reference (from 'referenceImages')
                if (referenceImages.length > 0) {
                    setStatusMessage("Otimizando imagem de referência...");
                    const processed = await processImageForAI(referenceImages[0].file);
                    referenceImagesPayload.push({ data: processed.base64, mimeType: processed.mimeType });
                }

                // Image 2: Identity Reference (from 'specialistImages')
                if (specialistImages.length > 0) {
                    setStatusMessage("Otimizando foto do especialista...");
                    const processed = await processImageForAI(specialistImages[0].file);
                    referenceImagesPayload.push({ data: processed.base64, mimeType: processed.mimeType });
                }
            }
            // MODE: PROMPT / ULTRA (Needs Identity Only)
            else {
                if (specialistImages.length > 0) {
                    setStatusMessage("Otimizando foto do especialista...");
                    const processed = await processImageForAI(specialistImages[0].file);
                    referenceImagesPayload.push({ data: processed.base64, mimeType: processed.mimeType });
                }

                // ULTRA MODE: Add Object Image if exists
                if (activeMode === 'ultra' && hasObjectImage && objectImageFile) {
                    setStatusMessage("Otimizando imagem do objeto...");
                    const processed = await processImageForAI(objectImageFile);
                    referenceImagesPayload.push({ data: processed.base64, mimeType: processed.mimeType });
                }
            }

            if (isEdit) {
                finalPromptToUse = `${generatedPrompt}. Modification: ${editPrompt}. Maintain identity.`;
            } else {
                // CREATION MODE
                let currentSpecialistDesc = specialistDescription;

                // Analyze Identity Text Description 
                if (specialistImages.length > 0 && !currentSpecialistDesc) {
                    setIsAnalyzing(true);
                    setStatusMessage("Analisando identidade do especialista (IA)...");
                    try {
                        const files = specialistImages.map(img => img.file);
                        currentSpecialistDesc = await analyzeSpecialistIdentity(files);
                        setSpecialistDescription(currentSpecialistDesc);
                    } catch (e) {
                        console.error("Identity Analysis Failed", e);
                        currentSpecialistDesc = "Person";
                    } finally {
                        setIsAnalyzing(false);
                    }
                }

                // 2. Build Prompt Structure
                const parts = [];

                // --- PHOTOGRAPHY STYLE INJECTION ---
                let photoStylePrompt = "";
                if (photoStyle === 'professional') {
                    photoStylePrompt = "Shot on Sony A7R IV, 85mm lens, f/1.8, professional studio lighting, extremely detailed, sharp focus, 8k, highly aesthetic.";
                } else if (photoStyle === 'iphone') {
                    photoStylePrompt = "Shot on iPhone 15 Standard Lens (12MP). Natural daylight, raw photo aesthetic, slight digital noise, authentic texture. NOT A SELFIE. Subject is being photographed by someone else. Casual snapshot style, not processed.";
                } else if (photoStyle === 'selfie') {
                    photoStylePrompt = "TRUE SELFIE POV (8MP Front Camera Quality). Subject's arm is extended forward. Perspective distortion typical of wide-angle front camera. Slight digital noise/grain, imperfect lighting, authentic selfie look. Subject looking DIRECTLY into lens. One arm extended out of frame to hold the camera.";
                } else if (photoStyle === 'ultra_mode') {
                    photoStylePrompt = "HIGH FIDELITY SCENE RECREATION. The lighting, composition, and surrounding elements MUST match the reference image exactly. No extra artistic filters. REALISTIC RAW STYLE. Focus on merging the subject identity seamlessly into this EXACT scene.";
                }

                // Append Identity ALWAYS if available
                if (currentSpecialistDesc) {
                    // STRICT IDENTITY INSTRUCTIONS
                    parts.push(`SUBJECT IDENTITY (STRICT): The main subject IS ${currentSpecialistDesc}.`);
                    parts.push(`IMPORTANT: PRESERVE EXACT AGE AND SKIN TEXTURE. DO NOT ADD WRINKLES OR AGING EFFECTS unless present in the identity. DO NOT CHANGE HAIR LENGTH.`);
                    parts.push(`You MUST preserve facial features, tattoos, and scars exactly as described.`);
                }

                if (activeMode === 'visual') {
                    let styleDetail = "";
                    if (referenceImages.length > 0) {
                        setStatusMessage("Analisando estilo da referência visual (IA)...");
                        try {
                            styleDetail = await analyzeStyleReference(referenceImages[0].file);
                        } catch (e) {
                            styleDetail = "Professional photography.";
                        }
                        parts.push(`STYLE REFERENCE DESCRIPTION: ${styleDetail}`);

                        if (photoStyle === 'ultra_mode') {
                            parts.push(`TASK: COPY the pose, lighting, background, and objects from the 'Reference Image' PIXEL-PERFECTLY.`);
                            parts.push(`ACTION: SWAP the person in the reference with 'SUBJECT IDENTITY'.`);
                            parts.push(`CONSTRAINT: The final image must look exactly like the reference context, but with the specialist's face and body usage.`);
                            parts.push(`CRITICAL: DO NOT MIRROR OR FLIP. Left side of reference MUST be Left side of output. Maintain Viewer's perspective.`);
                        } else {
                            parts.push(`TASK: COPY the pose, lighting, and composition from the 'STYLE REFERENCE' but SWAP the person with 'SUBJECT IDENTITY'.`);
                        }
                    } else {
                        parts.push(`TASK: specific portrait of 'SUBJECT IDENTITY'.`);
                    }
                } else if (activeMode === 'prompt') {
                    parts.push(`SCENARIO: ${prompt}`);
                    parts.push(`TASK: Place 'SUBJECT IDENTITY' into 'SCENARIO'.`);
                } else if (activeMode === 'ultra') {
                    parts.push(`ROLE: Professional ${niche || 'Portrait'}.`);
                    parts.push(`ACTION/POSE: ${description}.`);
                    if (environment) parts.push(`ENVIRONMENT: ${environment}.`);

                    // Object Integration - Prompt Injection
                    if (objectImageFile) {
                        const objDesc = objectDetails ? objectDetails : "the object provided in the reference image";
                        const imgRefText = specialistImages.length > 0 ? "2nd image" : "reference image";
                        parts.push(`OBJECT INTEGRATION: The image MUST include ${objDesc}. Use the pinned ${imgRefText} as the EXACT visual source for this object. The object must look EXACTLY like the reference.`);
                    }
                    parts.push(`TASK: Generate 'SUBJECT IDENTITY' in this role.`);
                }

                parts.push(`PHOTOGRAPHY STYLE: ${photoStylePrompt}`);
                if (photoStyle === 'selfie') {
                    parts.push("IMPORTANT: The subject must look directly into the camera lens as if taking a selfie.");
                }
                parts.push("QUALITY: masterpiece, best quality, ultra-detailed.");

                finalPromptToUse = parts.join(" ");
            }

            setGeneratedPrompt(finalPromptToUse);
            setStatusMessage("Gerando imagem de alta fidelidade...");

            const baseUrl = await generateImageFromText(finalPromptToUse, {
                aspectRatio: ratio,
                referenceImages: referenceImagesPayload,
                highRes: isHighRes
            });

            // ... same finishing logic
            let finalUrl = baseUrl;
            if (user) {
                await supabase.from('profiles').update({ credits: credits - 1 }).eq('id', user.id);
                refreshCredits();
            }

            const img = new Image();
            img.onload = () => { setGeneratedImage(finalUrl); setIsGenerating(false); setStatusMessage(""); if (isEdit) setEditPrompt(""); };
            img.onerror = () => { setGeneratedImage(finalUrl); setIsGenerating(false); setStatusMessage(""); };
            img.src = finalUrl;

        } catch (err: any) {
            console.error(err);
            let msg = err.message || "Falha na geração";

            // Detect Google Instability
            if (msg.includes("503") || msg.includes("Unavailable") || msg.includes("Overloaded") || msg.includes("high demand")) {
                msg = "⚠️ Instabilidade nos servidores do Google AI (Alta Demanda). Por favor, aguarde 1 ou 2 minutos e tente novamente. O problema não é no App.";
            } else if (msg.includes("Timeout") || msg.includes("demorou muito")) {
                msg = "⚠️ O Google demorou para responder. Tente novamente.";
            }

            setStatusMessage(msg);
            // Clear message after 10s
            setTimeout(() => setStatusMessage(""), 10000);

            setIsGenerating(false);
        }
    };

    // ... UI Render ...

    // In Sidebar, add Style Selector
    /*
    // ... previous JSX ...
    // ...
    */

    /*
                     {/* PHOTO STYLE SELECTOR *\}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-orange-500 flex items-center gap-2">
                                <Camera size={16} /> Estilo de Foto
                            </label>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setPhotoStyle('professional')} className={`flex-1 py-3 px-2 rounded-xl border flex flex-col items-center gap-2 transition-all ${photoStyle === 'professional' ? 'bg-zinc-800 border-orange-500/50 text-white' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                                <Camera size={20} />
                                <span className="text-[10px] font-bold uppercase">ULTRA CAM</span>
                            </button>
                            <button onClick={() => setPhotoStyle('iphone')} className={`flex-1 py-3 px-2 rounded-xl border flex flex-col items-center gap-2 transition-all ${photoStyle === 'iphone' ? 'bg-zinc-800 border-orange-500/50 text-white' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                                <Smartphone size={20} />
                                <span className="text-[10px] font-bold uppercase">IPHONE CAM</span>
                            </button>
                             <button onClick={() => setPhotoStyle('selfie')} className={`flex-1 py-3 px-2 rounded-xl border flex flex-col items-center gap-2 transition-all ${photoStyle === 'selfie' ? 'bg-zinc-800 border-orange-500/50 text-white' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                                <User size={20} />
                                <span className="text-[10px] font-bold uppercase">MODO SELFIE</span>
                            </button>
                        </div>
                    </div>
    */

    // ... UI Render ...

    // In Sidebar, add Style Selector
    /*
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
                         <label className="text-sm font-bold text-orange-500 flex items-center gap-2">
                            <Camera size={16} /> Estilo de Foto
                         </label>
                         <div className="flex gap-2">
                             <button onClick={() => setPhotoStyle('professional')} className={`flex-1 py-3 px-2 rounded-xl border flex flex-col items-center gap-2 transition-all ${photoStyle === 'professional' ? 'bg-zinc-800 border-orange-500/50 text-white' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                                 <Camera size={20} />
                                 <span className="text-[10px] font-bold uppercase">ULTRA CAM</span>
                             </button>
                             <button onClick={() => setPhotoStyle('iphone')} className={`flex-1 py-3 px-2 rounded-xl border flex flex-col items-center gap-2 transition-all ${photoStyle === 'iphone' ? 'bg-zinc-800 border-orange-500/50 text-white' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                                 <Smartphone size={20} />
                                 <span className="text-[10px] font-bold uppercase">IPHONE CAM</span>
                             </button>
                         </div>
                    </div>
    */

    // In Preview Area, add Download Options




    if (!user) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-8rem)] w-full animate-in fade-in duration-500">
                <Login />
            </div>
        );
    }

    return (
        <>
            {/* --- GLOBAL STATUS POPUP --- */}
            {statusMessage && (statusMessage.startsWith("⚠️") || statusMessage.startsWith("Erro:")) && (
                <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-xl backdrop-blur-md shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 max-w-lg border text-sm font-medium ${statusMessage.startsWith("⚠️")
                    ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-200"
                    : "bg-red-500/10 border-red-500/50 text-red-200"
                    }`}>
                    <AlertTriangle className={`shrink-0 ${statusMessage.startsWith("⚠️") ? "text-yellow-500" : "text-red-500"}`} size={24} />
                    <div className="flex-1">
                        <p>{statusMessage}</p>
                    </div>
                    <button onClick={() => setStatusMessage("")} className="shrink-0 p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X size={16} />
                    </button>
                </div>
            )}

            <InsufficientCreditsModal
                isOpen={showCreditModal}
                onClose={() => setShowCreditModal(false)}
                onUpgrade={() => {
                    setShowCreditModal(false);
                    if (onNavigate) onNavigate('pricing');
                }}
            />
            <div className="flex flex-col xl:flex-row gap-6 xl:h-[calc(100vh-8rem)] h-auto min-h-[800px] animate-in fade-in duration-500 text-zinc-100 pb-20 xl:pb-0">

                {/* --- LEFT SIDEBAR: CONTROLS --- */}
                <div className="w-full xl:w-[480px] flex flex-col gap-4 xl:overflow-y-auto pr-2 custom-scrollbar xl:pb-20">

                    {/* 1. SPECIALIST IDENTITY (ALWAYS VISIBLE) */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-orange-500 flex items-center gap-2">
                                <User size={16} /> Identidade do Especialista
                            </label>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{specialistImages.length}/6 FOTOS</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {specialistImages.map((img, i) => (
                                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-700 bg-zinc-950">
                                    <img src={img.previewUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    <button onClick={() => removeSpecialistImage(i)} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-all text-white"><X size={12} /></button>
                                </div>
                            ))}
                            {specialistImages.length < 6 && (
                                <button onClick={() => specialistInputRef.current?.click()} className="aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30 hover:bg-zinc-800 hover:border-orange-500/50 transition-all group">
                                    <User size={20} className="text-zinc-600 group-hover:text-orange-500 transition-colors" />
                                    <span className="text-[9px] text-zinc-500">Adicionar</span>
                                </button>
                            )}
                            <input type="file" ref={specialistInputRef} className="hidden" accept="image/*" multiple onChange={(e) => { handleSpecialistUpload(e); e.target.value = ''; }} />
                        </div>
                        <p className="text-xs text-zinc-500">
                            Para maior fidelidade aos detalhes do rosto, adicione até 6 fotos variadas (ângulos e iluminação diferentes).
                        </p>
                    </div>


                    {/* PHOTO STYLE SELECTOR */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-orange-500 flex items-center gap-2">
                                <Camera size={16} /> Estilo de Foto
                            </label>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setPhotoStyle('ultra_mode')} className={`flex-1 py-3 px-2 rounded-xl border flex flex-col items-center gap-2 transition-all ${photoStyle === 'ultra_mode' ? 'bg-zinc-800 border-orange-500/50 text-white' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                                <Sparkles size={20} />
                                <span className="text-[10px] font-bold uppercase">ULTRA FIDEL</span>
                            </button>
                            <button onClick={() => setPhotoStyle('professional')} className={`flex-1 py-3 px-2 rounded-xl border flex flex-col items-center gap-2 transition-all ${photoStyle === 'professional' ? 'bg-zinc-800 border-orange-500/50 text-white' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                                <Camera size={20} />
                                <span className="text-[10px] font-bold uppercase">ULTRA CAM</span>
                            </button>
                            <button onClick={() => setPhotoStyle('iphone')} className={`flex-1 py-3 px-2 rounded-xl border flex flex-col items-center gap-2 transition-all ${photoStyle === 'iphone' ? 'bg-zinc-800 border-orange-500/50 text-white' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                                <Smartphone size={20} />
                                <span className="text-[10px] font-bold uppercase">IPHONE CAM</span>
                            </button>
                            <button onClick={() => setPhotoStyle('selfie')} className={`flex-1 py-3 px-2 rounded-xl border flex flex-col items-center gap-2 transition-all ${photoStyle === 'selfie' ? 'bg-zinc-800 border-orange-500/50 text-white' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                                <User size={20} />
                                <span className="text-[10px] font-bold uppercase">MODO SELFIE</span>
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500 min-h-[2.5em] pt-2 border-t border-zinc-800/50 mt-2">
                            {photoStyle === 'ultra_mode' && "Copia EXATAMENTE a cena, luz e pose da referência visual carregada abaixo. Use quando a fidelidade for prioridade."}
                            {photoStyle === 'professional' && "Estilo de câmera profissional (Sony A7R), com iluminação de estúdio controlada, foco nítido e fundo desfocado (bokeh)."}
                            {photoStyle === 'iphone' && "Estilo casual e autêntico de câmera de celular. Textura natural, leve granulação e iluminação do dia a dia."}
                            {photoStyle === 'selfie' && "Simula uma selfie real tirada com a câmera frontal. Ângulo, distorção de lente e pose típicos de autorretrato."}
                        </p>
                    </div>



                    {/* RESOLUTION SELECTOR */}
                    <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
                        <button onClick={() => setIsHighRes(false)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${!isHighRes ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>
                            <Zap size={14} /> 1k (Padrão)
                        </button>
                        <button onClick={() => setIsHighRes(true)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${isHighRes ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>
                            <Zap size={14} className="text-orange-500 fill-orange-500" /> 2k (Ultra)
                        </button>
                    </div>

                    {/* 2. RATIO (MOVED HERE) */}
                    <div className="flex justify-between gap-1">
                        {ratios.map(r => (
                            <button key={r.id} onClick={() => setRatio(r.id as AspectRatio)} className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-1 transition-all ${ratio === r.id ? 'bg-white text-black border-white' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>
                                <r.icon size={12} /> <span className="text-[10px] font-bold">{r.label}</span>
                            </button>
                        ))}
                    </div>


                    {/* 3. MODE SELECTOR */}
                    <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800">
                        <button onClick={() => setActiveMode('visual')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeMode === 'visual' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                            Referência Visual
                        </button>
                        <button onClick={() => setActiveMode('prompt')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeMode === 'prompt' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                            Criar via Prompt
                        </button>
                        <button onClick={() => setActiveMode('ultra')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeMode === 'ultra' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                            Modo Ultra
                        </button>
                    </div>


                    {/* 4. DYNAMIC CONTENT AREA */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4 flex-1 min-h-[300px]">

                        {/* MODE: VISUAL REFERENCE */}
                        {activeMode === 'visual' && (
                            <div className="animate-in fade-in slide-in-from-left-2 duration-300 space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-bold text-orange-500 flex items-center gap-2">
                                        <ImageIcon size={16} /> Referência de Estilo/Pose
                                    </label>
                                </div>
                                <div className="flex gap-2 pb-1 custom-scrollbar flex-wrap">
                                    <button onClick={() => referenceInputRef.current?.click()} className="w-20 h-20 shrink-0 flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30 hover:bg-zinc-800 transition-all text-zinc-500 hover:text-orange-500">
                                        <Upload size={16} />
                                        <span className="text-[9px]">Upload</span>
                                    </button>
                                    {referenceImages.map((img, i) => (
                                        <div key={i} className="w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-zinc-700 relative group">
                                            <img src={img.previewUrl} className="w-full h-full object-cover" />
                                            <button onClick={() => removeReferenceImage(i)} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-all text-white hover:bg-black/80 hover:text-red-500">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    <input type="file" ref={referenceInputRef} className="hidden" accept="image/*" multiple onChange={(e) => { handleReferenceUpload(e); e.target.value = ''; }} />
                                </div>
                                <p className="text-xs text-zinc-500">
                                    Use esta opção para gerar imagens que imitem o estilo ou a pose das referências acima.
                                </p>
                            </div>
                        )}

                        {/* MODE: PROMPT */}
                        {activeMode === 'prompt' && (
                            <div className="animate-in fade-in slide-in-from-left-2 duration-300 space-y-3">
                                <label className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                                    <Type size={16} className="text-orange-500" />
                                    Prompt Livre
                                </label>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    className="w-full h-64 bg-black/40 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500/50 resize-none font-light"
                                    placeholder="Descreva sua imagem detalhadamente..."
                                />
                            </div>
                        )}

                        {/* MODE: ULTRA */}
                        {activeMode === 'ultra' && (
                            <div className="animate-in fade-in slide-in-from-left-2 duration-300 space-y-3">
                                <label className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                                    <Sparkles size={16} className="text-orange-500" />
                                    Detalhes Ultra
                                </label>

                                {/* Unified Single Block */}
                                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-5">

                                    {/* SECTION 1: CONTEXT */}
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <Briefcase size={14} className="absolute left-3 top-3 text-zinc-500" />
                                            <input
                                                type="text"
                                                value={niche}
                                                onChange={(e) => setNiche(e.target.value)}
                                                placeholder="Nicho (Ex: Odontologia, Marketing...)"
                                                className="w-full bg-black/40 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
                                            />
                                        </div>
                                        <div className="relative">
                                            <MapPin size={14} className="absolute left-3 top-3 text-zinc-500" />
                                            <input
                                                type="text"
                                                value={environment}
                                                onChange={(e) => setEnvironment(e.target.value)}
                                                placeholder="Ambiente (Opcional)..."
                                                className="w-full bg-black/40 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
                                            />
                                        </div>
                                        <div className="relative">
                                            <Shirt size={14} className="absolute left-3 top-3 z-10 text-zinc-500" />
                                            <textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                className="w-full h-24 bg-black/40 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-orange-500/50 resize-none custom-scrollbar"
                                                placeholder="Pose, roupa e estilo..."
                                            />
                                        </div>
                                    </div>

                                    <div className="h-px bg-zinc-800/50 w-full" />

                                    {/* SECTION 2: CAMERA */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 flex flex-col">
                                            <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 ml-1">Enquadramento</label>
                                            <div className="relative">
                                                <select
                                                    value={cameraShot}
                                                    onChange={(e) => setCameraShot(e.target.value)}
                                                    className="w-full bg-black/40 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-orange-500/50 text-zinc-300 appearance-none cursor-pointer"
                                                >
                                                    <option value="">Padrão (Automático)</option>
                                                    <option value="Extreme Close-Up">Plano Detalhe</option>
                                                    <option value="Close-Up">Close-Up (Rosto)</option>
                                                    <option value="Medium Shot">Plano Médio</option>
                                                    <option value="Cowboy Shot">Plano Americano</option>
                                                    <option value="Full Shot">Plano Geral</option>
                                                    <option value="Wide Shot">Plano Aberto</option>
                                                </select>
                                                <ChevronRight className="absolute right-3 top-3 text-zinc-600 rotate-90 pointer-events-none" size={14} />
                                            </div>
                                        </div>
                                        <div className="space-y-2 flex flex-col">
                                            <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 ml-1">Ângulo</label>
                                            <div className="relative">
                                                <select
                                                    value={cameraAngle}
                                                    onChange={(e) => setCameraAngle(e.target.value)}
                                                    className="w-full bg-black/40 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-orange-500/50 text-zinc-300 appearance-none cursor-pointer"
                                                >
                                                    <option value="">Padrão (Nível Olhos)</option>
                                                    <option value="Eye Level">Nível dos Olhos</option>
                                                    <option value="High Angle">Plongée (Alto)</option>
                                                    <option value="Low Angle">Contra-Plongée (Baixo)</option>
                                                    <option value="Dutch Angle">Inclinado</option>
                                                    <option value="Over The Shoulder">Sobre o Ombro</option>
                                                </select>
                                                <ChevronRight className="absolute right-3 top-3 text-zinc-600 rotate-90 pointer-events-none" size={14} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Objeto/Logo */}
                                <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/50">
                                    <label className="text-xs font-bold text-zinc-400 mb-2 flex items-center gap-2">
                                        <Package size={12} /> Adicionar Objeto ou Logo
                                    </label>

                                    <div className="flex gap-3 items-start">
                                        <div
                                            onClick={() => objectImageInputRef.current?.click()}
                                            className="w-20 h-20 shrink-0 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors relative overflow-hidden"
                                        >
                                            {objectImagePreview ? (
                                                <img src={objectImagePreview} className="w-full h-full object-cover" />
                                            ) : (
                                                <Upload size={14} className="text-zinc-500" />
                                            )}
                                            {!objectImagePreview && <span className="text-[8px] text-zinc-500">Upload Imagem</span>}
                                        </div>
                                        <input type="file" ref={objectImageInputRef} className="hidden" accept="image/*" onChange={handleObjectImageUpload} />

                                        <textarea
                                            value={objectDetails}
                                            onChange={(e) => setObjectDetails(e.target.value)}
                                            placeholder="Como aplicar este objeto? (Ex: Segurando na mão esquerda, estampado na camisa...)"
                                            className="flex-1 h-20 bg-black/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-orange-500/50 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}


                        <button
                            type="button"
                            onClick={() => handleGenerate(false)}
                            disabled={isGenerating || isAnalyzing}
                            className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg mt-4 ${isGenerating ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-orange-900/20'}`}
                        >
                            {isGenerating || isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                            {isGenerating || isAnalyzing ? "Gerando imagem..." : "Gerar Imagem"}
                        </button>
                    </div>

                </div>

                {/* --- RIGHT: PREVIEW & EDIT --- */}
                <div className="flex-1 bg-black/40 border border-zinc-800/50 rounded-3xl overflow-hidden relative group flex flex-col min-h-[500px] xl:min-h-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-900/10 via-transparent to-transparent opacity-50 pointer-events-none"></div>

                    {generatedImage ? (
                        <>
                            <div className="flex-1 relative flex items-center justify-center p-8 bg-zinc-950/30">
                                <img src={generatedImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl shadow-black" />

                                <div className="absolute top-6 right-6 flex gap-2">
                                    <a href={generatedImage} download={`ultragen_${Date.now()}_hq.jpg`} className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur text-white rounded-lg border border-white/10 hover:bg-white hover:text-black transition-colors font-bold text-xs shadow-lg">
                                        <Download size={16} /> Baixar Imagem
                                    </a>
                                </div>
                            </div>

                            {/* EDIT SECTION */}
                            <div className="p-4 bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 flex flex-col gap-2 relative z-20">
                                <label className="text-xs font-bold text-zinc-400 flex items-center gap-2">
                                    <RefreshCcw size={12} /> MODO DE EDIÇÃO
                                </label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={editPrompt}
                                            onChange={(e) => setEditPrompt(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleGenerate(true)}
                                            placeholder="Descreva o que mudar (Ex: adicionar óculos escuros, mudar fundo para floresta...)"
                                            className="w-full bg-black/60 border border-zinc-700 rounded-lg py-3 pl-4 pr-10 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                                        />
                                        <Edit3 size={14} className="absolute right-3 top-3.5 text-zinc-500" />
                                    </div>
                                    <button
                                        onClick={() => handleGenerate(true)}
                                        disabled={!editPrompt || isGenerating}
                                        className="px-6 rounded-lg bg-zinc-100 text-black font-bold text-xs uppercase tracking-wide hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Aplicar
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 opacity-50 space-y-4">
                            <div className="w-24 h-24 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                <Zap size={40} />
                            </div>
                            <p className="text-sm font-medium">Preencha os detalhes e clique em Gerar</p>
                        </div>
                    )}
                </div>
            </div >
        </>
    );
};
