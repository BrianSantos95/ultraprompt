import React from 'react';
import { ScanFace } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <div className="mb-6">
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
  );
};