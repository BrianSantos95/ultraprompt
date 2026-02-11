import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    credits: number;
    plan: string;
    hasLifetimePrompt: boolean;
    refreshCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    credits: 0,
    plan: 'free',
    hasLifetimePrompt: false,
    refreshCredits: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [credits, setCredits] = useState(0);
    const [plan, setPlan] = useState('free');
    const [hasLifetimePrompt, setHasLifetimePrompt] = useState(false);

    const refreshCredits = async (userIdStr?: string) => {
        const targetId = userIdStr || user?.id;
        if (!targetId) return;

        const { data, error } = await supabase
            .from('profiles')
            .select('credits, subscription_tier, has_lifetime_prompt, is_banned')
            .eq('id', targetId)
            .single();

        if (data && !error) {
            setCredits(data.credits);
            setPlan(data.subscription_tier || 'free');
            setHasLifetimePrompt(!!data.has_lifetime_prompt);
            // Optional: Block login if banned? 
            if (data.is_banned) {
                // For now just log, strict blocking would happen in RLS or middleware
                console.warn("User is banned");
            }
        }
    };

    useEffect(() => {
        // Initial Session Check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                refreshCredits(session.user.id);
            }
            setLoading(false);
        });

        // Listen for Auth Changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                await refreshCredits(session.user.id);
            } else {
                setCredits(0);
                setPlan('free');
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Realtime subscription removed to prevent app freeze.
    // We will rely on manual updates or simpler polling if needed.

    return (
        <AuthContext.Provider value={{ user, loading, credits, plan, hasLifetimePrompt, refreshCredits }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
