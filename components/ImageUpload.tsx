import React, { useCallback, useState } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { ImageReference } from '../types';

interface ImageUploadProps {
  imageReference: ImageReference | null;
  onImageSelect: (file: File) => void;
  onClear: () => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ imageReference, onImageSelect, onClear }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }, [onImageSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Formato não suportado. Use JPEG, PNG ou WEBP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 10MB.');
      return;
    }
    onImageSelect(file);
  };

  if (imageReference) {
    return (
      <div className="relative w-full h-full min-h-[300px] rounded-2xl overflow-hidden bg-[#121215] border border-zinc-800 group">
        <img 
          src={imageReference.previewUrl} 
          alt="Reference" 
          className="w-full h-full object-contain p-4"
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
          <p className="text-zinc-300 font-medium">Imagem selecionada</p>
          <button 
            onClick={onClear}
            className="bg-zinc-100 hover:bg-white text-black px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm transition-colors shadow-xl"
          >
            <X size={16} />
            Remover
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        w-full h-full min-h-[300px] rounded-2xl border transition-all duration-200 ease-in-out flex flex-col items-center justify-center text-center cursor-pointer relative overflow-hidden
        ${isDragging 
          ? 'border-white/40 bg-white/5' 
          : 'border-zinc-800 bg-[#121215] hover:border-zinc-700 hover:bg-[#18181b]'}
      `}
    >
      <input 
        type="file" 
        className="hidden" 
        id="image-upload"
        accept="image/jpeg, image/png, image/webp"
        onChange={handleFileChange}
      />
      <label htmlFor="image-upload" className="flex flex-col items-center cursor-pointer w-full h-full justify-center p-8 z-10">
        <div className={`p-4 rounded-2xl mb-4 transition-colors ${isDragging ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500'}`}>
          <ImageIcon size={32} />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">
          Upload da Referência
        </h3>
        <p className="text-zinc-500 text-sm max-w-[200px]">
          Arraste sua imagem ou clique para buscar
        </p>
      </label>
    </div>
  );
};