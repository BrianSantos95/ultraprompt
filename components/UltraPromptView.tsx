import React, { useState, useRef } from 'react';
import {
    Upload, Zap, Copy, Check, Sparkles,
    Aperture, Sun, ScanFace, Palette, Camera,
    AlertCircle, Loader2, X
} from 'lucide-react';
import { generatePromptFromImage } from '../services/geminiService';
import { PromptSettings, AnalysisState, Language, DetailLevel } from '../types';

import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import Login from './auth/Login';
import { InsufficientCreditsModal } from './InsufficientCreditsModal';

interface UltraPromptViewProps {
    onNavigate?: (view: any) => void;
}

export const UltraPromptView: React.FC<UltraPromptViewProps> = ({ onNavigate }) => {
    // --- State ---
    const { user, credits, refreshCredits } = useAuth();
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showCreditModal, setShowCreditModal] = useState(false);

    // Default Settings (High Realism Hardcoded internally, but toggles available regarding focus)
    const [settings, setSettings] = useState<PromptSettings>({
        realismLevel: 100, // Hidden & Maxed out
        language: Language.EN, // Default EN for best results
        detailLevel: DetailLevel.EXTREME,
        focusSkin: true,
        focusLighting: true,
        focusCamera: true,
        focusStyle: false,
    });

    const [analysisResult, setAnalysisResult] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Handlers ---
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setAnalysisResult("");
            setError(null);
        }
    };

    const handleClearImage = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setImageFile(null);
        setPreviewUrl(null);
        setAnalysisResult("");
        setError(null);
    };

    const handleGenerate = async () => {
        if (!imageFile) return;

        if (credits <= 0) {
            setShowCreditModal(true);
            return;
        }

        setIsAnalyzing(true);
        setError(null);

        try {
            // We force realism to 100 in the settings sent to service
            const finalSettings = { ...settings, realismLevel: 100 };
            const result = await generatePromptFromImage(imageFile, finalSettings);

            if (result && result.prompt) {
                setAnalysisResult(result.prompt);

                // Deduct credit
                if (user) {
                    const { error: creditError } = await supabase
                        .from('profiles')
                        .update({ credits: credits - 1 })
                        .eq('id', user.id);
                    if (!creditError) refreshCredits();
                }
            } else {
                throw new Error("No prompt generated.");
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to analyze image.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const copyToClipboard = () => {
        if (!analysisResult) return;
        navigator.clipboard.writeText(analysisResult);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleSetting = (key: keyof PromptSettings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
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
            <div className="flex flex-col xl:flex-row gap-6 h-auto xl:h-[calc(100vh-8rem)] min-h-[800px] animate-in fade-in duration-500 text-zinc-100">

                {/* --- LEFT SIDEBAR: CONTROLS --- */}
                <div className="w-full xl:w-[480px] flex flex-col gap-4 xl:overflow-y-auto pr-2 custom-scrollbar pb-20">

                    {/* Header Description (Restored Here) */}
                    <div className="mb-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-white rounded-xl shadow-lg shadow-black/20">
                                <ScanFace className="w-6 h-6 text-black" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white tracking-tight leading-none">
                                    UltraPrompt <span className="font-light text-zinc-500 mx-2">|</span> <span className="font-light text-zinc-400">Bem vindo ao Ultra</span>
                                </h1>
                                <span className="text-xs text-zinc-400 font-medium tracking-wider uppercase">Agente Anatômico</span>
                            </div>
                        </div>
                        <p className="text-zinc-400 text-sm leading-relaxed border-l-2 border-zinc-700 pl-3">
                            Gere prompts com descrição anatômica e espacial exata. Preservação rigorosa de identidade e pose.
                        </p>
                    </div>

                    {/* 1. IMAGE UPLOAD AREA */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-orange-500 flex items-center gap-2">
                                <Upload size={16} /> Imagem de Referência
                            </label>
                        </div>

                        {previewUrl ? (
                            <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden border border-zinc-700 bg-zinc-950 group">
                                <img src={previewUrl} className="w-full h-full object-contain" alt="Reference" />
                                <button
                                    onClick={handleClearImage}
                                    className="absolute top-2 right-2 p-2 bg-black/60 rounded-full hover:bg-red-500/80 transition-all text-white backdrop-blur-sm"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/30 hover:bg-zinc-800/50 hover:border-orange-500/50 transition-all flex flex-col items-center justify-center gap-3 group"
                            >
                                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Upload size={20} className="text-zinc-400 group-hover:text-orange-500" />
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="text-sm font-medium text-zinc-300">Clique para upload</p>
                                    <p className="text-xs text-zinc-500">JPG, PNG, WEBP (Max 10MB)</p>
                                </div>
                            </button>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                    </div>

                    {/* 2. LANGUAGE & FOCUS SETTINGS */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4">

                        {/* Language Selector */}
                        <div>
                            <label className="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-2">
                                <span className="text-xs uppercase tracking-wider text-zinc-500">Idioma do Resultado</span>
                            </label>
                            <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                                <button
                                    onClick={() => setSettings(prev => ({ ...prev, language: Language.EN }))}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${settings.language === Language.EN ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    English
                                </button>
                                <button
                                    onClick={() => setSettings(prev => ({ ...prev, language: Language.PT }))}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${settings.language === Language.PT ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Português
                                </button>
                            </div>
                        </div>

                        <div className="h-px bg-zinc-800/50 w-full" />

                        {/* Focus Grid */}
                        {/* Focus Grid */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                                <Aperture size={16} className="text-orange-500" /> Foco da Análise
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => toggleSetting('focusSkin')}
                                    className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all ${settings.focusSkin ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                                >
                                    <ScanFace size={14} /> Pele & Textura
                                </button>
                                <button
                                    onClick={() => toggleSetting('focusLighting')}
                                    className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all ${settings.focusLighting ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                                >
                                    <Sun size={14} /> Iluminação
                                </button>
                                <button
                                    onClick={() => toggleSetting('focusCamera')}
                                    className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all ${settings.focusCamera ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                                >
                                    <Camera size={14} /> Câmera/Lente
                                </button>
                                <button
                                    onClick={() => toggleSetting('focusStyle')}
                                    className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all ${settings.focusStyle ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                                >
                                    <Palette size={14} /> Estilo Artístico
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 3. GENERATE BUTTON */}
                    <button
                        onClick={handleGenerate}
                        disabled={!imageFile || isAnalyzing}
                        className="w-full py-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-orange-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Analisando Imagem...
                            </>
                        ) : (
                            <>
                                <Sparkles size={18} />
                                Gerar Ultra Prompt
                            </>
                        )}
                    </button>
                </div>


                {/* --- RIGHT PANEL: OUTPUT --- */}
                <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl p-6 relative flex flex-col min-h-[500px]">



                    {/* Result Header */}
                    <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Zap className="text-orange-500" size={20} /> Resultado do Prompt
                        </h2>
                        {analysisResult && (
                            <button
                                onClick={copyToClipboard}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? "Copiado!" : "Copiar"}
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                        {analysisResult ? (
                            <div className="font-mono text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                {analysisResult}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4 opacity-50">
                                <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                    <Sparkles size={24} />
                                </div>
                                <p className="text-sm">Faça o upload e clique em Gerar para ver o prompt técnico.</p>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="absolute bottom-6 left-6 right-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 text-sm animate-in slide-in-from-bottom-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                </div>

            </div>
        </>
    );
};
