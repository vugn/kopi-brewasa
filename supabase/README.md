# Supabase migrations

Urutan (jalankan di SQL Editor, atau `supabase db push` kalau CLI sudah di-link):

1. `20260101000000_baseline.sql` — snapshot skema produksi. **Jangan dijalankan di produksi** (sudah ada); tandai applied:
   `supabase migration repair --status applied 20260101000000`. Dipakai untuk membangun database baru/lokal.
2. `20261125000100_harden_rls.sql` — kunci RLS: akses ditentukan baris di `profiles` (admin/karyawan), bukan `true` / email hardcode.
3. `20261125000200_integrity_and_rpc.sql` — constraint, `create_sale`, `add_items_to_bill`, `edit_transaction_items`, `increment_likes`, `top_spenders`, trigger audit.
4. `20261125000300_storage_menu_images.sql` — bucket `menu-images` hanya admin yang bisa menulis. Kalau gagal karena kepemilikan `storage.objects`, jalankan lewat dashboard Storage > Policies.

Berkas lama di `/migrations` adalah SQL ad-hoc sebelum folder ini; sudah tercermin di baseline.

## Urutan deploy yang aman
Migration 2-3 dulu (kompatibel dengan klien lama), baru deploy kode yang memanggil RPC baru
(`create_sale`, `add_items_to_bill`, `edit_transaction_items`, `top_spenders`).

## Server env (Vercel)
`GEMINI_API_KEY` (tanpa awalan `VITE_`) dipakai `api/barista.ts`. Jangan taruh kunci di variabel `VITE_*` — itu ikut ke browser.
