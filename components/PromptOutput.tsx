import React, { useState } from 'react';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { PromptResult } from '../types';

interface PromptOutputProps {
  result: PromptResult | null;
  loading: boolean;
  error: string | null;
}

export const PromptOutput: React.FC<PromptOutputProps> = ({ result, loading, error }) => {
  const [copiedPositive, setCopiedPositive] = useState(false);
  const [copiedNegative, setCopiedNegative] = useState(false);

  const copyToClipboard = async (text: string, isNegative: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isNegative) {
        setCopiedNegative(true);
        setTimeout(() => setCopiedNegative(false), 2000);
      } else {
        setCopiedPositive(true);
        setTimeout(() => setCopiedPositive(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  if (loading) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 border-4 border-orange-500/20 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 border-t-4 border-orange-500 rounded-full animate-spin"></div>
        </div>
        <h3 className="text-xl font-medium text-white mb-2 animate-pulse">Processando...</h3>
        <p className="text-zinc-500 text-sm text-center max-w-sm">
          Analisando pose, anatomia, ângulo e iluminação...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-red-500/5 rounded-xl border border-red-500/20">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-red-400 mb-2">Erro na Geração</h3>
        <p className="text-red-300/70 text-sm text-center">{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-zinc-900/30 rounded-xl border border-zinc-800/50 border-dashed">
        <p className="text-zinc-600 text-sm">Os prompts gerados aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Positive Prompt */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg shadow-black/20">
        <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex justify-between items-center">
          <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Prompt Gerado</span>
          <button
            onClick={() => copyToClipboard(result.prompt, false)}
            className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-xs font-medium"
          >
            {copiedPositive ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            {copiedPositive ? 'Copiado' : 'Copiar prompt'}
          </button>
        </div>
        <div className="p-4">
          <textarea
            readOnly
            value={result.prompt}
            className="w-full h-48 bg-transparent text-zinc-300 text-sm leading-relaxed outline-none resize-none font-mono"
          />
        </div>
      </div>

      {/* Negative Prompt */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex justify-between items-center">
          <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Prompt Negativo</span>
          <button
            onClick={() => copyToClipboard(result.negativePrompt, true)}
            className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-xs font-medium"
          >
            {copiedNegative ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            {copiedNegative ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        <div className="p-4">
          <textarea
            readOnly
            value={result.negativePrompt}
            className="w-full h-24 bg-transparent text-zinc-400 text-sm leading-relaxed outline-none resize-none font-mono"
          />
        </div>
      </div>

    </div>
  );
};