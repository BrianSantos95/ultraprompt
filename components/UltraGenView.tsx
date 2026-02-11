import React, { useState, useRef, useEffect } from 'react';
import {
    Upload, X, Image as ImageIcon, Sparkles, Wand2,
    Maximize, Smartphone, Monitor, RectangleVertical, Square,
    User, Download, Layers, RefreshCcw, Loader2, Camera,
    Sun, Moon, Zap, Palette, Aperture, Film, Play, Edit3,
    Briefcase, MapPin, Shirt, Package, Type
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
    const [objectDetails, setObjectDetails] = useState('');

    // Edit & Settings
    const [editPrompt, setEditPrompt] = useState('');
    const [ratio, setRatio] = useState<AspectRatio>('1:1');

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

    const getDimensions = (r: AspectRatio) => {
        switch (r) {
            case '16:9': return '&width=1280&height=720';
            case '9:16': return '&width=720&height=1280';
            case '4:5': return '&width=816&height=1024';
            case '1:1': default: return '&width=1024&height=1024';
        }
    };

    // --- Core Logic ---

    // Helper to convert File to Base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    // Remove data URL prefix (e.g. "data:image/jpeg;base64,")
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                } else {
                    reject(new Error("Failed to convert file to base64"));
                }
            };
            reader.onerror = error => reject(error);
        });
    };

    // --- Auth & Credits ---
    const { user, credits, refreshCredits } = useAuth();

    const handleGenerate = async (isEdit: boolean) => {
        if (!user) {
            setStatusMessage("Erro: Você precisa estar logado para gerar imagens.");
            return;
        }
        if (credits <= 0) {
            setShowCreditModal(true);
            return;
        }

        if (!prompt && activeMode === 'prompt') return;
        if (!isEdit && activeMode === 'ultra' && !niche) return;
        if (isEdit) {
            if (!generatedImage || !editPrompt) return;
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
                    const file = referenceImages[0].file;
                    const base64 = await fileToBase64(file);
                    referenceImagesPayload.push({ data: base64, mimeType: file.type });
                }

                // Image 2: Identity Reference (from 'specialistImages')
                if (specialistImages.length > 0) {
                    const file = specialistImages[0].file;
                    const base64 = await fileToBase64(file);
                    referenceImagesPayload.push({ data: base64, mimeType: file.type });
                }
            }
            // MODE: PROMPT / ULTRA (Needs Identity Only)
            else {
                if (specialistImages.length > 0) {
                    const file = specialistImages[0].file;
                    const base64 = await fileToBase64(file);
                    referenceImagesPayload.push({ data: base64, mimeType: file.type });
                }
            }

            if (isEdit) {
                // EDIT MODE (Appending to previous prompt)
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
                        currentSpecialistDesc = "Person"; // Fallback
                    } finally {
                        setIsAnalyzing(false);
                    }
                }

                // 2. Build Prompt Structure based on MODE and Reference Images
                const parts = [];

                if (currentSpecialistDesc) {
                    parts.push(`Subject Description: ${currentSpecialistDesc}.`);
                }

                // --- MODE SPECIFIC PROMPTING ---
                if (activeMode === 'visual') {
                    // Using Reference Visual Mode
                    let styleDetail = "";

                    if (referenceImages.length > 0) {
                        setStatusMessage("Analisando estilo da referência visual (IA)...");
                        try {
                            styleDetail = await analyzeStyleReference(referenceImages[0].file);
                        } catch (e) {
                            console.error("Style Analysis Failed", e);
                            styleDetail = "Professional photography, cinematic lighting, sharp focus.";
                        }
                        parts.push(`STYLE REFERENCE DETAILS: ${styleDetail}`);
                    }

                    if (referenceImages.length > 0 && specialistImages.length > 0) {
                        // We have both Style and Identity
                        parts.push(`TASK: Generate a NEW image that combines the CHARACTER described above (Subject Description) with the POSE/STYLE described in STYLE REFERENCE DETAILS.`);
                        parts.push(`CRITICAL: The face must match the Subject Description EXACTLY. The lighting, camera angle, and pose must match the Style Reference EXACTLY.`);
                    } else if (referenceImages.length > 0) {
                        // Only Style provided
                        parts.push(`TASK: Generate a new image that matches the STYLE REFERENCE DETAILS exactly.`);
                    } else if (specialistImages.length > 0) {
                        // Only Identity provided
                        parts.push(`TASK: Generate a portrait of this person.`);
                    }
                    parts.push(`Verify lighting and shadow consistency.`);
                } else if (activeMode === 'prompt') {
                    // Using Prompt Mode
                    if (referenceImagesPayload.length > 0) {
                        parts.push(`INSTRUCTION: The image provided is the Character Reference.`);
                        parts.push(`TASK: Generate a photo of this character in the following scenario: ${prompt}`);
                        parts.push(`Ensure the face matches the reference image exactly.`);
                    } else {
                        parts.push(`Description: ${prompt}`);
                    }

                } else if (activeMode === 'ultra') {
                    // Using Ultra Mode
                    if (referenceImagesPayload.length > 0) {
                        parts.push(`INSTRUCTION: The image provided is the Character Reference. Generate this character in the specified role.`);
                        parts.push(`Ensure the face matches the reference image exactly.`);
                    }
                    parts.push(`Role/Niche: Professional ${niche || 'Portrait'}.`);
                    if (environment) parts.push(`Environment: ${environment}.`);
                    parts.push(`Action/Pose/Outfit: ${description}.`);
                    if (hasObjectImage && objectDetails) {
                        parts.push(`Specific Object/Logo Detail: ${objectDetails}. Ensure it is integrated naturally (e.g. holding it, on shirt, or in background as requested).`);
                    }
                }

                parts.push("ultra realistic, 8k, 4k resolution, 2k, photorealistic, RAW photo, highly detailed texture, cinematic lighting, sharp focus, best quality, masterpiece.");

                finalPromptToUse = parts.join(" ");
            }

            setGeneratedPrompt(finalPromptToUse); // Save for future edits
            setStatusMessage("Gerando imagem de alta fidelidade...");

            // 3. Generate via Service (Google Nano Banana Pro 3)
            // Now passing options: aspectRatio and referenceImages (plural)
            const baseUrl = await generateImageFromText(finalPromptToUse, {
                aspectRatio: ratio, // e.g. "4:5"
                referenceImages: referenceImagesPayload // Updated property name
            });

            let finalUrl = baseUrl;

            // Deduct Credit
            if (user) {
                const { error: creditError } = await supabase
                    .from('profiles')
                    .update({ credits: credits - 1 })
                    .eq('id', user.id);

                if (!creditError) {
                    refreshCredits(); // Update UI
                }
            }

            // Pre-load
            const img = new Image();
            img.onload = () => {
                setGeneratedImage(finalUrl);
                setIsGenerating(false);
                setStatusMessage("");
                if (isEdit) setEditPrompt("");
            };
            img.onerror = () => {
                setGeneratedImage(finalUrl); // Try showing anyway
                setIsGenerating(false);
                setStatusMessage("");
            };
            img.src = finalUrl;

        } catch (err: any) {
            console.error(err);
            setStatusMessage(`Erro: ${err.message || "Falha na geração"}`);
            setIsGenerating(false);
        }
    };


    if (!user) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-8rem)] w-full animate-in fade-in duration-500">
                <Login />
            </div>
        );
    }

    return (
        <>
            <InsufficientCreditsModal
                isOpen={showCreditModal}
                onClose={() => setShowCreditModal(false)}
                onUpgrade={() => {
                    setShowCreditModal(false);
                    if (onNavigate) onNavigate('pricing');
                }}
            />
            <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-8rem)] min-h-[800px] animate-in fade-in duration-500 text-zinc-100">

                {/* --- LEFT SIDEBAR: CONTROLS --- */}
                <div className="w-full xl:w-[480px] flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar pb-20">

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
                            <input type="file" ref={specialistInputRef} className="hidden" accept="image/*" multiple onChange={handleSpecialistUpload} />
                        </div>
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
                                        </div>
                                    ))}
                                    <input type="file" ref={referenceInputRef} className="hidden" accept="image/*" multiple onChange={handleReferenceUpload} />
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

                                {/* Nicho */}
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

                                {/* Ambiente */}
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

                                {/* Descrição Principal */}
                                <div className="relative">
                                    <Shirt size={14} className="absolute left-3 top-3 z-10 text-zinc-500" />
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full h-24 bg-black/40 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-orange-500/50 resize-none custom-scrollbar"
                                        placeholder="Pose, roupa e estilo..."
                                    />
                                </div>

                                {/* Camera Shot & Angle Enquadramento */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 ml-1">Enquadramento</label>
                                        <select
                                            value={cameraShot}
                                            onChange={(e) => setCameraShot(e.target.value)}
                                            className="w-full bg-black/40 border border-zinc-800 rounded-lg py-2 px-2 text-xs focus:outline-none focus:border-orange-500/50 text-zinc-300"
                                        >
                                            <option value="">Padrão (Automático)</option>
                                            <option value="Extreme Close-Up">Plano Detalhe (Olhos/Boca)</option>
                                            <option value="Close-Up">Close-Up (Rosto)</option>
                                            <option value="Medium Shot">Plano Médio (Cintura pra cima)</option>
                                            <option value="Cowboy Shot">Plano Americano (Joelho pra cima)</option>
                                            <option value="Full Shot">Plano Geral (Corpo Inteiro)</option>
                                            <option value="Wide Shot">Plano Aberto (Cenário amplo)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 ml-1">Ângulo</label>
                                        <select
                                            value={cameraAngle}
                                            onChange={(e) => setCameraAngle(e.target.value)}
                                            className="w-full bg-black/40 border border-zinc-800 rounded-lg py-2 px-2 text-xs focus:outline-none focus:border-orange-500/50 text-zinc-300"
                                        >
                                            <option value="">Padrão (Nível dos Olhos)</option>
                                            <option value="Eye Level">Nível dos Olhos</option>
                                            <option value="High Angle">Plongée (De cima pra baixo)</option>
                                            <option value="Low Angle">Contra-Plongée (De baixo pra cima)</option>
                                            <option value="Dutch Angle">Inclinado (Dutch Angle)</option>
                                            <option value="Over The Shoulder">Sobre o Ombro</option>
                                        </select>
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
                            onClick={() => handleGenerate(false)}
                            disabled={isGenerating || isAnalyzing}
                            className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg mt-4 ${isGenerating ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-orange-900/20'}`}
                        >
                            {isGenerating || isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                            {isGenerating || isAnalyzing ? "Gerando imagem..." : "Gerar Imagem"}
                        </button>
                    </div>

                </div>

                {/* --- RIGHT: PREVIEW & EDIT --- */}
                <div className="flex-1 bg-black/40 border border-zinc-800/50 rounded-3xl overflow-hidden relative group flex flex-col">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-900/10 via-transparent to-transparent opacity-50 pointer-events-none"></div>

                    {generatedImage ? (
                        <>
                            <div className="flex-1 relative flex items-center justify-center p-8 bg-zinc-950/30">
                                <img src={generatedImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl shadow-black" />

                                <div className="absolute top-6 right-6 flex gap-2">
                                    <a href={generatedImage} download="ultragen_result.png" target="_blank" className="p-2 bg-black/50 backdrop-blur text-white rounded-lg border border-white/10 hover:bg-white hover:text-black transition-colors">
                                        <Download size={20} />
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
                                <Wand2 size={40} />
                            </div>
                            <p className="text-sm font-medium">Preencha os detalhes e clique em Gerar</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
