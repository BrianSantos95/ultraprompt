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

        console.log("Fetching profile for:", targetId);

        const { data, error } = await supabase
            .from('profiles')
            .select('credits, subscription_tier, has_lifetime_prompt, is_banned, full_name, avatar_url')
            .eq('id', targetId)
            .single();

        if (data && !error) {
            setCredits(data.credits);
            setPlan(data.subscription_tier || 'free');
            setFullName(data.full_name || '');
            setAvatarUrl(data.avatar_url || '');
            setHasLifetimePrompt(!!data.has_lifetime_prompt);
            if (data.is_banned) {
                console.warn("User is banned");
            }
        }
    };

    useEffect(() => {
        let mounted = true;

        // Initial Session Check
        const initSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (mounted) {
                    setUser(session?.user ?? null);
                    if (session?.user) {
                        // Revertendo para await para garantir dados completos antes de liberar a tela
                        await refreshCredits(session.user.id);
                    } else {
                        setCredits(0);
                        setPlan('free');
                    }
                    setLoading(false);
                }
            } catch (error) {
                console.error("Session check failed", error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initSession();

        // Listen for Auth Changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (mounted) {
                setUser(session?.user ?? null);
                if (session?.user) {
                    await refreshCredits(session.user.id);
                } else {
                    setCredits(0);
                    setPlan('free');
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
