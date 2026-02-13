import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { X, User, Lock, CreditCard, Upload, Camera, Loader2, LogOut } from 'lucide-react';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { user, fullName, avatarUrl, plan, refreshCredits } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'subscription'>('profile');

    // Form States
    const [name, setName] = useState(fullName);
    const [avatarPreview, setAvatarPreview] = useState(avatarUrl);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Password States
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync initial state when modal opens
    useEffect(() => {
        if (isOpen) {
            setName(fullName);
            setAvatarPreview(avatarUrl);
            setPasswordMessage(null);
            setNewPassword('');
            setConfirmPassword('');
        }
    }, [isOpen, fullName, avatarUrl]);

    if (!isOpen || !user) return null;

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        setIsUploading(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Create 'avatars' bucket if logic allows, or assume it exists.
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setAvatarPreview(publicUrl);

            // Auto-save avatar to profile
            await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
            refreshCredits(); // Refresh context

        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            alert('Erro ao fazer upload da imagem. Verifique se o bucket "avatars" existe e é público.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: name })
                .eq('id', user.id);

            if (error) throw error;
            await refreshCredits();
            onClose();
        } catch (error) {
            console.error('Error saving profile:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setPasswordMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setPasswordMessage({ type: 'error', text: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelPlan = async () => {
        if (confirm("Tem certeza que deseja cancelar seu plano? Você perderá acesso aos benefícios premium ao final do ciclo.")) {
            setIsSaving(true);
            try {
                // Determine logic based on Stripe integration or simple DB update
                // Assuming simple DB update for now as specified in context
                const { error } = await supabase
                    .from('profiles')
                    .update({ subscription_tier: 'free' }) // Or 'cancelled' depending on logic
                    .eq('id', user.id);

                if (error) throw error;
                await refreshCredits();
                alert('Plano cancelado com sucesso.');
            } catch (error: any) {
                console.error('Error cancelling plan:', error);
                alert('Erro ao cancelar plano.');
            } finally {
                setIsSaving(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[600px] md:h-auto">

                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 bg-zinc-950/50 border-b md:border-b-0 md:border-r border-zinc-800 p-4 flex flex-col gap-2">
                    <h2 className="text-xl font-bold text-white mb-6 px-2">Configurações</h2>

                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-white text-black font-medium' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
                    >
                        <User size={18} /> Perfil
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'security' ? 'bg-white text-black font-medium' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
                    >
                        <Lock size={18} /> Segurança
                    </button>
                    <button
                        onClick={() => setActiveTab('subscription')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'subscription' ? 'bg-white text-black font-medium' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
                    >
                        <CreditCard size={18} /> Assinatura
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 md:p-8 bg-zinc-900 overflow-y-auto custom-scrollbar relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>

                    {activeTab === 'profile' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-bold text-white mb-4">Informações Pessoais</h3>

                            <div className="flex items-center gap-6">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-full bg-zinc-800 overflow-hidden border-2 border-zinc-700 group-hover:border-orange-500 transition-colors">
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                                <User size={32} />
                                            </div>
                                        )}
                                        {isUploading && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <Loader2 size={24} className="text-white animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute bottom-0 right-0 p-2 bg-orange-500 rounded-full text-white shadow-lg hover:bg-orange-600 transition-colors"
                                    >
                                        <Camera size={14} />
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                    />
                                </div>
                                <div>
                                    <h4 className="font-medium text-white">Foto de Perfil</h4>
                                    <p className="text-xs text-zinc-500 mt-1">Recomendado: Square JPG, PNG</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1">Nome Completo</label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                                        placeholder="Seu nome"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
                                    <input
                                        value={user.email}
                                        disabled
                                        className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-lg p-3 text-zinc-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-zinc-800 flex justify-end">
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                    className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-bold text-white mb-4">Alterar Senha</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1">Nova Senha</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1">Confirmar Senha</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {passwordMessage && (
                                <div className={`p-3 rounded-lg text-sm ${passwordMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                    {passwordMessage.text}
                                </div>
                            )}

                            <div className="pt-4 border-t border-zinc-800 flex justify-end">
                                <button
                                    onClick={handleChangePassword}
                                    disabled={isSaving}
                                    className="px-6 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-500 transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? 'Alterando...' : 'Alterar Senha'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'subscription' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-bold text-white mb-4">Gerenciar Assinatura</h3>

                            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Plano Atual</p>
                                        <h4 className="text-2xl font-bold text-white capitalize mt-1">{plan === 'pro' ? 'Ultra Pro' : 'Gratuito'}</h4>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${plan === 'pro' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-zinc-800 text-zinc-400'}`}>
                                        {plan === 'pro' ? 'ATIVO' : 'FREE'}
                                    </div>
                                </div>

                                {plan !== 'free' ? (
                                    <div className="space-y-4">
                                        <p className="text-sm text-zinc-400">
                                            Seu plano renova automaticamente. Você pode cancelar a qualquer momento.
                                        </p>
                                        <button
                                            onClick={handleCancelPlan}
                                            disabled={isSaving}
                                            className="w-full py-3 border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg font-medium transition-colors text-sm"
                                        >
                                            {isSaving ? 'Cancelando...' : 'Cancelar Assinatura'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-sm text-zinc-400">
                                            Faça o upgrade para desbloquear recursos exclusivos e gerações ilimitadas.
                                        </p>
                                        <button className="w-full py-3 bg-white text-black hover:bg-zinc-200 rounded-lg font-medium transition-colors text-sm">
                                            Ver Planos
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
