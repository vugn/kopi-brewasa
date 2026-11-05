import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
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

    // User yang profilnya sudah termuat. Dipakai supaya event auth berulang
    // (TOKEN_REFRESHED / SIGNED_IN saat tab difokuskan lagi) tidak memicu
    // layar "Memuat profil..." yang meng-unmount seluruh panel admin.
    const loadedUserId = useRef<string | null>(null);

    const loadProfile = useCallback(async (userId: string, email?: string | null, opts?: { silent?: boolean }) => {
        if (!opts?.silent) setLoadingProfile(true);

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

        loadedUserId.current = userId;
        setLoadingProfile(false);
    }, []);

    const refreshProfile = useCallback(async () => {
        if (session?.user?.id) await loadProfile(session.user.id, session.user.email, { silent: true });
    }, [session?.user?.id, session?.user?.email, loadProfile]);

    useEffect(() => {
        let mounted = true;

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return;
            setSession(session);
            if (session?.user?.id) {
                loadProfile(session.user.id, session.user.email);
            } else {
                loadedUserId.current = null;
                setProfile(null);
                setLoadingProfile(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (!mounted) return;
            const nextId = nextSession?.user?.id ?? null;

            if (nextId) {
                // Hanya simpan session baru kalau memang berubah, agar tidak re-render berantai.
                setSession((prev: any) => (prev?.access_token === nextSession?.access_token ? prev : nextSession));
                // User yang sama sudah termuat -> refresh token saja, jangan muat ulang profil.
                if (loadedUserId.current === nextId) return;
                loadProfile(nextId, nextSession!.user.email);
            } else {
                loadedUserId.current = null;
                setSession(null);
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
        loadedUserId.current = null;
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
