import React from 'react';
import { PromptSettings, Language, DetailLevel } from '../types';
import { Sliders, Eye, Sun, Camera, Palette, Globe, Wand2, Lock, Microscope } from 'lucide-react';

interface ControlsProps {
  settings: PromptSettings;
  onChange: (newSettings: PromptSettings) => void;
  disabled: boolean;
  onGenerate: () => void;
  isGenerating: boolean;
  hasReference: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  settings,
  onChange,
  disabled,
  onGenerate,
  isGenerating,
  hasReference
}) => {

  const updateSetting = (key: keyof PromptSettings, value: any) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-8 h-full flex flex-col">

      {/* Anatomical Lock Indicator */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 backdrop-blur-md">
        <div className="p-2.5 bg-white rounded-full text-black shadow-lg shadow-white/10">
          <Lock size={18} />
        </div>
        <div>
          <span className="block text-sm font-bold text-white uppercase tracking-wide">
            Bloqueio Anatômico
          </span>
          <p className="text-xs text-zinc-400">
            Identidade, Pose e Mãos fixos
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Realism Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <Sliders size={16} className="text-white" />
              Intensidade de Realismo
            </label>
            <span className="text-xs font-mono text-white bg-white/10 px-2 py-1 rounded border border-white/10">
              {settings.realismLevel}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.realismLevel}
            disabled={disabled}
            onChange={(e) => updateSetting('realismLevel', parseInt(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Detail Level Toggle */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-200 flex items-center gap-2">
            <Microscope size={16} className="text-white" />
            Nível de Precisão
          </label>
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 backdrop-blur-sm">
            {Object.values(DetailLevel).map((level) => {
              let tooltipText = "";
              switch (level) {
                case DetailLevel.HIGH: tooltipText = "Equilíbrio ideal. Gera descrições técnicas sem excesso de geometria."; break;
                case DetailLevel.EXTREME: tooltipText = "Precisão máxima. Descreve ângulos, geometria corporal e tensão muscular."; break;
                case DetailLevel.SCIENTIFIC: tooltipText = "Modo Forense. Usa termos médicos e anatômicos complexos para rigging."; break;
              }

              return (
                <div key={level} className="flex-1">
                  <Tooltip text={tooltipText}>
                    <button
                      onClick={() => updateSetting('detailLevel', level)}
                      disabled={disabled}
                      className={`w-full py-2.5 text-[10px] sm:text-xs font-medium rounded-lg transition-all uppercase tracking-wide ${settings.detailLevel === level
                          ? 'bg-white text-black shadow-lg shadow-black/20'
                          : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                      {level}
                    </button>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </div>

        {/* Focus Toggles */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-200 block">Foco da Análise</label>
          <div className="grid grid-cols-2 gap-3">
            <ToggleButton
              active={settings.focusSkin}
              onClick={() => updateSetting('focusSkin', !settings.focusSkin)}
              icon={<Eye size={16} />}
              label="Pele"
              disabled={disabled}
              tooltip="Analisa profundamente poros, textura, imperfeições e vilosidades."
            />
            <ToggleButton
              active={settings.focusLighting}
              onClick={() => updateSetting('focusLighting', !settings.focusLighting)}
              icon={<Sun size={16} />}
              label="Luz"
              disabled={disabled}
              tooltip="Mapeia direção da luz (key/fill/rim), temperatura e dureza das sombras."
            />
            <ToggleButton
              active={settings.focusCamera}
              onClick={() => updateSetting('focusCamera', !settings.focusCamera)}
              icon={<Camera size={16} />}
              label="Câmera"
              disabled={disabled}
              tooltip="Estima a distância focal (mm), abertura e ângulo da câmera."
            />
            <ToggleButton
              active={settings.focusStyle}
              onClick={() => updateSetting('focusStyle', !settings.focusStyle)}
              icon={<Palette size={16} />}
              label="Estilo"
              disabled={disabled}
              tooltip="Identifica a estética visual, paleta de cores e direção artística."
            />
          </div>
        </div>

        {/* Language */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-200 flex items-center gap-2">
            <Globe size={16} className="text-white" />
            Idioma
          </label>
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 backdrop-blur-sm gap-1">
            <div className="flex-1">
              <Tooltip text="Gera o prompt em Inglês. Recomendado para maior fidelidade no Midjourney/Flux.">
                <button
                  onClick={() => updateSetting('language', Language.EN)}
                  disabled={disabled}
                  className={`w-full py-2.5 text-xs font-medium rounded-lg transition-all ${settings.language === Language.EN
                    ? 'bg-white text-black shadow-lg shadow-black/20'
                    : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                  English
                </button>
              </Tooltip>
            </div>
            <div className="flex-1">
              <Tooltip text="Gera o prompt em Português. Útil para modelos locais ou específicos.">
                <button
                  onClick={() => updateSetting('language', Language.PT)}
                  disabled={disabled}
                  className={`w-full py-2.5 text-xs font-medium rounded-lg transition-all ${settings.language === Language.PT
                    ? 'bg-white text-black shadow-lg shadow-black/20'
                    : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                  Português
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Generate Button - Moved here */}
        <button
          onClick={onGenerate}
          disabled={!hasReference || isGenerating}
          className={`
            w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] shadow-xl mt-4
            ${!hasReference || isGenerating
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
              : 'bg-white text-black hover:bg-zinc-200 shadow-white/10'}
          `}
        >
          <Wand2 size={20} className={isGenerating ? 'animate-spin' : ''} />
          {isGenerating ? 'Processando...' : 'Gerar Prompt'}
        </button>
      </div>

    </div>
  );
};

const ToggleButton = ({ active, onClick, icon, label, disabled, tooltip }: any) => (
  <Tooltip text={tooltip}>
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-xs font-medium transition-all backdrop-blur-sm
        ${active
          ? 'bg-white text-black border-white'
          : 'bg-black/20 border-white/5 text-zinc-400 hover:bg-black/40 hover:text-zinc-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {icon}
      {label}
    </button>
  </Tooltip>
);

const Tooltip = ({ text, children }: { text: string, children: React.ReactNode }) => (
  <div className="group relative w-full flex justify-center">
    {children}
    <div className="absolute bottom-full mb-2 px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-300 text-[11px] leading-relaxed rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl w-48 text-center backdrop-blur-md">
      {text}
      <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-zinc-950"></div>
    </div>
  </div>
);