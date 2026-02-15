import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    credits: number;
    plan: string;
    fullName: string;
    avatarUrl: string;
    hasLifetimePrompt: boolean;
    refreshCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    credits: 0,
    plan: 'free',
    fullName: '',
    avatarUrl: '',
    hasLifetimePrompt: false,
    refreshCredits: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [credits, setCredits] = useState(0);
    const [plan, setPlan] = useState('free');
    const [fullName, setFullName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [hasLifetimePrompt, setHasLifetimePrompt] = useState(false);

    const refreshCredits = async (manualUserId?: string) => {
        const targetId = manualUserId || user?.id;
        if (!targetId) return;

        try {
            console.log("DEBUG: Iniciando fetch do perfil...");
            const fetchPromise = supabase
                .from('profiles')
                .select('credits, subscription_tier, has_lifetime_prompt, is_banned, full_name, avatar_url')
                .eq('id', targetId)
                .single();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('TIMEOUT_15S: Supabase demorou muito para responder')), 15000)
            );

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

            console.log("DEBUG: Fetch retornou:", { data, error });

            if (data && !error) {
                setCredits(data.credits);
                setPlan(data.subscription_tier || 'free');
                setFullName(data.full_name || '');
                setAvatarUrl(data.avatar_url || '');
                setHasLifetimePrompt(!!data.has_lifetime_prompt);
                if (data.is_banned) {
                    console.warn("User is banned");
                }
                console.log("Credits refreshed:", data.credits);
            } else {
                console.error("DEBUG: Falha ao carregar perfil (Erro ou vazio):", error);
            }
        } catch (err: any) {
            console.error("DEBUG: Erro CRÍTICO no refreshCredits:", err);
            // alert(`Erro de Conexão: ${err.message}`);
        }
    };

    useEffect(() => {
        let mounted = true;

        // Initial Session Check with Retry Logic
        const initSession = async (attempt = 1) => {
            try {
                console.log(`Checking session (attempt ${attempt})...`);
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) throw error;

                if (mounted) {
                    if (session?.user) {
                        console.log("Session found:", session.user.id);
                        setUser(session.user);
                        await refreshCredits(session.user.id);
                    } else {
                        console.log("No active session found.");
                        setUser(null);
                        setCredits(0);
                        setPlan('free');
                    }
                }
            } catch (error: any) {
                console.error(`Session check failed (attempt ${attempt}):`, error);

                // Retry specifically on AbortError or network errors, up to 3 times
                if (mounted && attempt < 3 && (error.name === 'AbortError' || error.message.includes('fetch'))) {
                    console.log(`Retrying in ${attempt * 500}ms...`);
                    setTimeout(() => initSession(attempt + 1), attempt * 500);
                    return; // Don't set loading false yet
                }
            } finally {
                // Ensure loading is set to false only if we are done (success or max retries)
                // If we are scheduling a retry, this finally block runs, but we want to keep loading true.
                // However, since we return early in the retry block, we won't reach here if retrying?
                // Wait, 'finally' runs even after return in try/catch. 
                // So we need to check if we are retrying.
            }

            if (mounted) setLoading(false);
        };

        initSession();

        // Listen for Auth Changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`AUTH EVENT: ${event}`, session?.user?.id); // Debug Log

            if (mounted) {
                // Sempre atualizar o usuário se a sessão mudar
                setUser(session?.user ?? null);

                if (session?.user) {
                    // Se temos usuário, tenta recarregar os dados
                    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                        await refreshCredits(session.user.id);
                    }
                } else if (event === 'SIGNED_OUT') {
                    console.log("AUTH: Explicit SIGNED_OUT event received. Clearing user data.");
                    // Só limpa os dados se for explicitamente um logou
                    setCredits(0);
                    setPlan('free');
                    setFullName('');
                    setAvatarUrl('');
                }
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // Realtime subscription removed to prevent app freeze.
    // We will rely on manual updates or simpler polling if needed.

    return (
        <AuthContext.Provider value={{ user, loading, credits, plan, hasLifetimePrompt, fullName, avatarUrl, refreshCredits }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
