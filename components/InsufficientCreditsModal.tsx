import React from 'react';
import { AlertCircle, Zap, ArrowLeft, ChevronRight } from 'lucide-react';

interface InsufficientCreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: () => void;
}

export const InsufficientCreditsModal: React.FC<InsufficientCreditsModalProps> = ({ isOpen, onClose, onUpgrade }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-300">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <Zap size={32} className="text-orange-500 fill-orange-500" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white tracking-tight">Créditos Esgotados</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                            Seus créditos acabaram ou expiraram. Faça um upgrade no seu plano para continuar gerando imagens de alta fidelidade e acessando recursos exclusivos.
                        </p>
                    </div>

                    <div className="w-full flex flex-col gap-2 pt-2">
                        <button
                            onClick={onUpgrade}
                            className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 group"
                        >
                            Fazer Upgrade Agora
                            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={16} />
                            Voltar
                        </button>
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-2 text-[10px] text-zinc-500 justify-center">
                    <AlertCircle size={10} />
                    <span>Dúvidas? Entre em contato com o suporte.</span>
                </div>
            </div>
        </div>
    );
};
