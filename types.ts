export enum Language {
  PT = 'PT',
  EN = 'EN'
}

export enum DetailLevel {
  HIGH = 'Alto',
  EXTREME = 'Extremo',
  SCIENTIFIC = 'Científico'
}

export interface PromptSettings {
  realismLevel: number; // 0 to 100
  language: Language;
  detailLevel: DetailLevel;
  focusSkin: boolean;
  focusLighting: boolean;
  focusCamera: boolean;
  focusStyle: boolean;
}

export interface PromptResult {
  prompt: string;
  negativePrompt: string;
}

export interface AnalysisState {
  isLoading: boolean;
  error: string | null;
  result: PromptResult | null;
}

export interface ImageReference {
  file: File;
  previewUrl: string;
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:5' | '3:2';

export interface UltraGenSettings {
  ratio: AspectRatio;
  style: string;
  lighting: string;
  prompt: string;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  settings: UltraGenSettings;
  timestamp: number;
}