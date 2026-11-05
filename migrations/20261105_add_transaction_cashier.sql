-- Migration: catat siapa (karyawan/admin) yang membuat transaksi.
-- Dipakai fitur "Kinerja Karyawan". Jalankan di Supabase SQL Editor.
-- Transaksi lama tidak punya data ini -> tampil sebagai "Tidak diketahui".

ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_by_name text;

CREATE INDEX IF NOT EXISTS idx_transactions_created_by_created_at
    ON public.transactions (created_by, created_at DESC);

COMMENT ON COLUMN public.transactions.created_by IS 'User (auth.users.id) yang membuat transaksi di POS';
COMMENT ON COLUMN public.transactions.created_by_name IS 'Username saat transaksi dibuat (denormalisasi agar tetap terbaca walau user dihapus)';
