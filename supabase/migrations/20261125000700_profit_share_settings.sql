-- Pengaturan bagi hasil yang dinamis (bukan hardcode di kode):
--  * location_partners: mitra lokasi (mis. ITS) dengan persen, dasar hitung, minimal bulanan, dan masa berlaku.
--    Boleh banyak, boleh kosong (tanpa mitra), dan bulan lama tetap memakai mitra yang berlaku saat itu.
--  * owner_shares: nama & porsi pemilik (mis. Gusti 50%, Rizan 50%).
-- Hanya admin yang bisa membaca/mengubah.
create table if not exists public.location_partners (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(name) between 1 and 60),
    basis text not null default 'LABA' check (basis in ('LABA', 'OMZET')),
    percent numeric(5, 2) not null check (percent between 0 and 100),
    min_monthly integer not null default 0 check (min_monthly >= 0),
    start_date date not null default current_date,
    end_date date,
    note text check (note is null or char_length(note) <= 300),
    created_at timestamptz not null default now(),
    check (end_date is null or end_date >= start_date)
);

create table if not exists public.owner_shares (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(name) between 1 and 60),
    share_pct numeric(5, 2) not null check (share_pct between 0 and 100),
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);

alter table public.location_partners enable row level security;
alter table public.owner_shares enable row level security;

create policy location_partners_admin on public.location_partners
    for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy owner_shares_admin on public.owner_shares
    for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.location_partners, public.owner_shares from anon;
grant select, insert, update, delete on public.location_partners, public.owner_shares to authenticated;

-- Nilai awal sesuai kesepakatan sekarang; ubah lewat halaman Laporan Laba.
insert into public.location_partners (name, basis, percent, min_monthly, start_date, note)
select 'ITS', 'LABA', 15, 0, '2026-08-25', 'Mitra lokasi (himpunan). Dasar: omzet - bahan - gaji - biaya lain.'
where not exists (select 1 from public.location_partners);

insert into public.owner_shares (name, share_pct, sort_order)
select v.name, v.share_pct, v.sort_order
from (values ('Gusti', 50, 1), ('Rizan', 50, 2)) as v(name, share_pct, sort_order)
where not exists (select 1 from public.owner_shares);
