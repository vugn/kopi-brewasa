-- Migration: profiles table for admin/karyawan RBAC (UI guard)
-- Jalankan di Supabase SQL Editor (project kopi-brewasa).

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE NOT NULL,
    role text NOT NULL DEFAULT 'karyawan' CHECK (role IN ('admin', 'karyawan')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users on profiles" ON public.profiles;
CREATE POLICY "Enable all access for authenticated users on profiles"
ON public.profiles
FOR ALL
USING (true)
WITH CHECK (true);

COMMENT ON TABLE public.profiles IS 'App users with UI-guard roles: admin (full) vs karyawan (POS + cancel only)';
