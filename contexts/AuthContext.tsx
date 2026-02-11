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

    const refreshCredits = async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('profiles')
            .select('credits, subscription_tier, has_lifetime_prompt')
            .eq('id', user.id)
            .single();

        if (data && !error) {
            setCredits(data.credits);
            setPlan(data.subscription_tier || 'free');
            setHasLifetimePrompt(!!data.has_lifetime_prompt);
        }
    };

    useEffect(() => {
        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                refreshCredits();
            }
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                await refreshCredits();
            } else {
                setCredits(0);
                setPlan('free');
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, credits, plan, hasLifetimePrompt, refreshCredits }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
