-- Tarif gaji per hari kerja per orang (hari kerja = hari ada minimal satu transaksi yang dibuat orang itu).
-- Diubah admin di halaman Kinerja Karyawan; dipakai Laporan Laba. Default 0 = belum diisi.
alter table public.profiles add column if not exists daily_wage integer not null default 0;
alter table public.profiles drop constraint if exists profiles_daily_wage_range;
alter table public.profiles add constraint profiles_daily_wage_range check (daily_wage between 0 and 1000000);
