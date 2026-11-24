-- Bucket menu-images: baca publik, tulis hanya admin (sebelumnya semua user login, termasuk akun
-- yang daftar sendiri), batasi ukuran & tipe file.
drop policy if exists "Allow authenticated deletes to menu-images" on storage.objects;
drop policy if exists "Allow authenticated updates to menu-images" on storage.objects;
drop policy if exists "Allow authenticated uploads to menu-images" on storage.objects;
drop policy if exists "Give public access to menu-images" on storage.objects;

create policy "menu-images public read" on storage.objects
    for select to anon, authenticated using (bucket_id = 'menu-images');
create policy "menu-images admin insert" on storage.objects
    for insert to authenticated with check (bucket_id = 'menu-images' and public.is_admin());
create policy "menu-images admin update" on storage.objects
    for update to authenticated using (bucket_id = 'menu-images' and public.is_admin()) with check (bucket_id = 'menu-images' and public.is_admin());
create policy "menu-images admin delete" on storage.objects
    for delete to authenticated using (bucket_id = 'menu-images' and public.is_admin());

update storage.buckets
   set file_size_limit = 2097152,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
 where id = 'menu-images';
