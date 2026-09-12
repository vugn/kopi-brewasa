import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

export type UserRole = 'admin' | 'karyawan';

export const KARYAWAN_EMAIL_DOMAIN = 'brewasa.com';

export interface Profile {
    id: string;
    username: string;
    role: UserRole;
    created_at?: string;
}

interface AuthContextValue {
    session: any | null;
    profile: Profile | null;
    role: UserRole | null;
    isAdmin: boolean;
    isKaryawan: boolean;
    loadingProfile: boolean;
    login: (username: string, password: string) => Promise<{ error: string | null }>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Username login -> Supabase Auth email identity.
// "budi" -> "budi@brewasa.local". Email asli (admin lama) diteruskan apa adanya.
export const usernameToEmail = (username: string) => {
    const clean = username.trim().toLowerCase();
    if (clean.includes('@')) return clean;
    return `${clean}@${KARYAWAN_EMAIL_DOMAIN}`;
};

export const emailToUsername = (email?: string | null) => {
    if (!email) return '';
    const suffix = `@${KARYAWAN_EMAIL_DOMAIN}`;
    return email.endsWith(suffix) ? email.slice(0, -suffix.length) : email;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<any | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    const loadProfile = useCallback(async (userId: string, email?: string | null) => {
        setLoadingProfile(true);

        const { data } = await supabase
            .from('profiles')
            .select('id, username, role, created_at')
            .eq('id', userId)
            .maybeSingle();

        if (data) {
            setProfile({
                id: data.id,
                username: data.username,
                role: (data.role as UserRole) || 'karyawan',
                created_at: data.created_at,
            });
        } else {
            // Fallback kalau tabel profiles belum ada / row belum dibuat.
            // Akun email asli (legacy) => admin. Sisanya role paling aman.
            const isLegacyAdmin = !!email && !email.endsWith(`@${KARYAWAN_EMAIL_DOMAIN}`);
            setProfile({
                id: userId,
                username: emailToUsername(email) || 'unknown',
                role: isLegacyAdmin ? 'admin' : 'karyawan',
            });
        }

        setLoadingProfile(false);
    }, []);

    const refreshProfile = useCallback(async () => {
        if (session?.user?.id) await loadProfile(session.user.id, session.user.email);
    }, [session?.user?.id, session?.user?.email, loadProfile]);

    useEffect(() => {
        let mounted = true;

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return;
            setSession(session);
            if (session?.user?.id) {
                loadProfile(session.user.id, session.user.email);
            } else {
                setProfile(null);
                setLoadingProfile(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (!mounted) return;
            setSession(nextSession);
            if (nextSession?.user?.id) {
                loadProfile(nextSession.user.id, nextSession.user.email);
            } else {
                setProfile(null);
                setLoadingProfile(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [loadProfile]);

    const login = useCallback(async (username: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: usernameToEmail(username),
            password,
        });

        if (error) return { error: error.message };
        if (!data.session) return { error: 'Login berhasil tapi sesi tidak ditemukan. Coba refresh.' };

        setSession(data.session);
        if (data.session.user?.id) await loadProfile(data.session.user.id, data.session.user.email);
        return { error: null };
    }, [loadProfile]);

    const logout = useCallback(async () => {
        await supabase.auth.signOut();
        setProfile(null);
    }, []);

    const role = profile?.role ?? null;

    const value: AuthContextValue = {
        session,
        profile,
        role,
        isAdmin: role === 'admin',
        isKaryawan: role === 'karyawan',
        loadingProfile,
        login,
        logout,
        refreshProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
};
