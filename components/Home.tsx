import React from 'react';
import { ScanFace, Zap, ArrowRight, Sparkles } from 'lucide-react';

interface HomeProps {
    onNavigate: (view: 'ultraprompt' | 'ultragen') => void;
}

const GALLERY_IMAGES = [
    "/gallery/UltraPrompt%20%281%29.webp",
    "/gallery/UltraPrompt%20%282%29.webp",
    "/gallery/UltraPrompt%20%283%29.webp",
    "/gallery/UltraPrompt%20%284%29.webp",
    "/gallery/UltraPrompt%20%285%29.webp",
    "/gallery/UltraPrompt%20%286%29.webp",
    "/gallery/UltraPrompt%20%287%29.webp"
];

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
    return (
        <div className="w-full max-w-7xl mx-auto space-y-16 animate-in fade-in duration-700 py-10">

            {/* Hero Section */}
            <div className="text-center space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-medium text-zinc-400">
                    <Sparkles size={10} className="text-white" />
                    <span>Versão 2.0 Disponível</span>
                </div>

                <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tighter">
                    Bem-vindo ao <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Ultra</span>
                </h1>

                <p className="text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed font-medium">
                    Seu espaço criativo com inteligência artificial. Crie prompts perfeitos e gere imagens hiper-realistas em segundos.
                </p>
            </div>

            {/* Main Actions - Neutral Monochrome Design */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto px-4">
                {/* UltraPrompt Card */}
                <button
                    onClick={() => onNavigate('ultraprompt')}
                    className="group relative overflow-hidden rounded-[1.25rem] bg-zinc-900/50 border border-zinc-800 p-6 text-left transition-all hover:bg-zinc-900 hover:border-zinc-700 hover:scale-[1.01] duration-300"
                >
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div className="space-y-3">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-xl shadow-white/5 text-black mb-2 group-hover:scale-110 transition-transform duration-500">
                                <ScanFace strokeWidth={1.5} className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">UltraPrompt</h2>
                            <p className="text-zinc-400 text-sm font-light leading-relaxed">
                                Agente especializado em descrições anatômicas e espaciais.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-medium text-white/90 group-hover:text-white group-hover:translate-x-1 transition-all">
                            Começar agora <ArrowRight size={14} />
                        </div>
                    </div>

                    {/* Subtle gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                </button>

                {/* UltraGen Card */}
                <button
                    onClick={() => onNavigate('ultragen')}
                    className="group relative overflow-hidden rounded-[1.25rem] bg-zinc-900/50 border border-zinc-800 p-6 text-left transition-all hover:bg-zinc-900 hover:border-zinc-700 hover:scale-[1.01] duration-300"
                >
                    <div className="absolute top-4 right-4 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-wider">
                        NOVO
                    </div>

                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div className="space-y-3">
                            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center shadow-inner text-white mb-2 group-hover:bg-zinc-700 transition-colors duration-500">
                                <Zap strokeWidth={1.5} className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">UltraGen</h2>
                            <p className="text-zinc-400 text-sm font-light leading-relaxed">
                                Crie imagens impressionantes com nossa IA de última geração.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-medium text-white/90 group-hover:text-white group-hover:translate-x-1 transition-all">
                            Explorar ferramenta <ArrowRight size={14} />
                        </div>
                    </div>
                    {/* Subtle gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                </button>
            </div>

            {/* Community Gallery - Infinite Carousel */}
            <div className="space-y-8 pt-10 border-t border-zinc-800/50">
                <div className="px-4 text-center">
                    <h3 className="text-xl font-bold text-white uppercase tracking-widest">Galeria da Comunidade</h3>
                </div>

                <div className="relative w-full overflow-hidden mask-gradient">
                    {/* Gradient Masks for fade effect on edges */}
                    <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none"></div>
                    <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none"></div>

                    <div className="flex gap-4 animate-scroll whitespace-nowrap py-4">
                        {/* Original Set */}
                        {GALLERY_IMAGES.map((src, index) => (
                            <GalleryItem key={`orig-${index}`} src={src} />
                        ))}
                        {/* Duplicate Set for Loop */}
                        {GALLERY_IMAGES.map((src, index) => (
                            <GalleryItem key={`dup-${index}`} src={src} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const GalleryItem: React.FC<{ src: string }> = ({ src }) => (
    <div className="relative w-64 h-96 shrink-0 rounded-2xl overflow-hidden hover:opacity-80 transition-opacity duration-300 group cursor-pointer">
        <img
            src={src}
            alt="Gallery Item"
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </div>
);
