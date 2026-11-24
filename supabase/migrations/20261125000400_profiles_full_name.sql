-- Nama asli staf, supaya admin bisa membedakan username dengan orangnya.
-- Hanya admin yang bisa melihat nama semua orang: policy profiles tidak berubah
-- (admin baca semua baris; karyawan hanya baris profilnya sendiri).
alter table public.profiles add column if not exists full_name text;
alter table public.profiles drop constraint if exists profiles_full_name_len;
alter table public.profiles add constraint profiles_full_name_len check (full_name is null or char_length(full_name) <= 100);
