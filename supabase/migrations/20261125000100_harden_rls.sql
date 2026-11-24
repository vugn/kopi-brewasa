-- Kunci akses data. Sebelumnya banyak tabel (finance_records, ingredients, menu_recipes,
-- overhead_costs, stock_logs) terbuka untuk role `public` dengan `using (true)`, artinya
-- siapa pun yang punya anon key (ikut ke browser) bisa baca/ubah/hapus tanpa login.
-- Role `authenticated` juga terlalu luas: signup Supabase terbuka, jadi orang asing bisa daftar
-- lalu lolos semua policy `authenticated`. Sekarang akses ditentukan oleh baris di `profiles`
-- (hanya admin yang bisa membuatnya).

-- ---------------------------------------------------------------------------
-- Helper role
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
    select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
    select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'karyawan'));
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_staff() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Buang semua policy lama (campur aduk, duplikat, dan terikat email hardcode)
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
    for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
        execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Hak tabel: anon hanya yang memang publik. RLS tetap lapisan utama.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
grant select on public.menu_items, public.announcements, public.stories to anon;
grant insert on public.stories to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Tabel baru ke depan tidak otomatis terbuka untuk anon.
alter default privileges for role postgres in schema public revoke all on tables from anon;

-- ---------------------------------------------------------------------------
-- Policy
-- ---------------------------------------------------------------------------
-- profiles
create policy profiles_read_own   on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_admin_read  on public.profiles for select to authenticated using (public.is_admin());
create policy profiles_admin_ins   on public.profiles for insert to authenticated with check (public.is_admin());
create policy profiles_admin_upd   on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy profiles_admin_del   on public.profiles for delete to authenticated using (public.is_admin());

-- transaksi: kasir (staff) boleh baca/buat/ubah, hanya admin yang boleh hapus
create policy transactions_staff_read on public.transactions for select to authenticated using (public.is_staff());
create policy transactions_staff_ins  on public.transactions for insert to authenticated with check (public.is_staff());
create policy transactions_staff_upd  on public.transactions for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy transactions_admin_del  on public.transactions for delete to authenticated using (public.is_admin());

create policy titems_staff_read on public.transaction_items for select to authenticated using (public.is_staff());
create policy titems_staff_ins  on public.transaction_items for insert to authenticated with check (public.is_staff());
create policy titems_staff_upd  on public.transaction_items for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy titems_admin_del  on public.transaction_items for delete to authenticated using (public.is_admin());

-- menu: publik boleh lihat, admin yang mengubah
create policy menu_public_read on public.menu_items for select to anon, authenticated using (true);
create policy menu_admin_ins   on public.menu_items for insert to authenticated with check (public.is_admin());
create policy menu_admin_upd   on public.menu_items for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy menu_admin_del   on public.menu_items for delete to authenticated using (public.is_admin());

-- pengumuman
create policy announcements_public_read on public.announcements for select to anon, authenticated using (true);
create policy announcements_admin_write on public.announcements for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- cerita pengunjung: publik boleh baca & kirim, tapi edit/hapus hanya admin. Like lewat fungsi increment_likes.
create policy stories_public_read on public.stories for select to anon, authenticated using (true);
create policy stories_public_ins  on public.stories for insert to anon, authenticated with check (true);
create policy stories_admin_upd   on public.stories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy stories_admin_del   on public.stories for delete to authenticated using (public.is_admin());

-- data internal: admin saja
create policy finance_admin_all   on public.finance_records for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy ingredients_admin   on public.ingredients     for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy recipes_admin       on public.menu_recipes    for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy overhead_admin      on public.overhead_costs  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy stock_logs_admin    on public.stock_logs      for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_notes_admin   on public.admin_notes     for all to authenticated using (public.is_admin()) with check (public.is_admin());
