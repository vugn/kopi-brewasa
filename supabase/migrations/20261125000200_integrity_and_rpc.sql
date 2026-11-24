-- Integritas data + fungsi transaksional.
-- Masalah yang diperbaiki:
--  * Checkout POS = 3 panggilan terpisah dari browser (transaksi, item, stok). Kalau satu gagal,
--    ada transaksi tanpa item yang tetap dihitung sebagai omzet. Sekarang satu fungsi atomik.
--  * Tambah item ke open bill & edit item tidak mengubah stok, dan edit item menghapus lalu
--    insert ulang tanpa transaksi (bisa kehilangan item kalau gagal di tengah).
--  * process_transaction_stock bisa memotong stok dua kali dan bisa dipanggil siapa saja (termasuk anon).
--  * increment_likes dipanggil aplikasi tapi tidak pernah ada di database.
--  * Hall of Fame di beranda membaca tabel transaksi langsung (diblokir RLS untuk pengunjung).

-- ---------------------------------------------------------------------------
-- Skema & constraint
-- ---------------------------------------------------------------------------
alter table public.transaction_items add column if not exists stock_deducted boolean not null default false;
-- Item lama dianggap sudah diproses; kalau tidak, panggilan stok berikutnya memotong ulang.
update public.transaction_items set stock_deducted = true where not stock_deducted;

alter table public.transactions drop constraint if exists transactions_status_check;
alter table public.transactions add constraint transactions_status_check
    check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'));
-- NOT VALID: ada satu baris lama (batal) bertotal negatif; baris baru tetap divalidasi.
alter table public.transactions drop constraint if exists transactions_total_nonneg;
alter table public.transactions add constraint transactions_total_nonneg check (total_amount >= 0) not valid;

alter table public.transaction_items drop constraint if exists transaction_items_qty_pos;
alter table public.transaction_items add constraint transaction_items_qty_pos check (quantity > 0);
alter table public.transaction_items drop constraint if exists transaction_items_price_nonneg;
alter table public.transaction_items add constraint transaction_items_price_nonneg check (price >= 0);

alter table public.stories drop constraint if exists stories_message_len;
alter table public.stories add constraint stories_message_len check (char_length(message) between 1 and 500);
alter table public.stories drop constraint if exists stories_name_len;
alter table public.stories add constraint stories_name_len check (name is null or char_length(name) <= 50);

-- ---------------------------------------------------------------------------
-- Helper internal
-- ---------------------------------------------------------------------------
create or replace function public._sale_items(p_items jsonb)
returns table (menu_item_id bigint, item_name text, quantity integer, price numeric, is_consignment boolean, consignment_cost numeric)
language plpgsql stable
set search_path = public, pg_temp
as $$
declare e jsonb;
begin
    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 100 then
        raise exception 'Daftar item tidak valid' using errcode = '22023';
    end if;
    for e in select * from jsonb_array_elements(p_items) loop
        menu_item_id := nullif(e ->> 'menu_item_id', '')::bigint;
        item_name := btrim(coalesce(e ->> 'item_name', ''));
        quantity := (e ->> 'quantity')::integer;
        price := (e ->> 'price')::numeric;
        is_consignment := coalesce((e ->> 'is_consignment')::boolean, false);
        consignment_cost := case when is_consignment then coalesce((e ->> 'consignment_cost')::numeric, 0) else 0 end;
        if item_name = '' or quantity is null or quantity not between 1 and 999
           or price is null or price not between 0 and 10000000 or consignment_cost < 0 then
            raise exception 'Item tidak valid: %', coalesce(nullif(item_name, ''), '(tanpa nama)') using errcode = '22023';
        end if;
        return next;
    end loop;
end;
$$;

create or replace function public._restore_stock(p_transaction uuid, p_note text)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare t_item record; r record; q numeric;
begin
    for t_item in select * from public.transaction_items where transaction_id = p_transaction and stock_deducted loop
        for r in select * from public.menu_recipes where menu_item_id = t_item.menu_item_id loop
            q := r.quantity_required * t_item.quantity;
            update public.ingredients set current_stock = current_stock + q where id = r.ingredient_id;
            insert into public.stock_logs (ingredient_id, change_amount, reason, notes)
            values (r.ingredient_id, q, 'void', p_note || ': ' || t_item.item_name);
        end loop;
    end loop;
end;
$$;

-- Potong stok hanya untuk item yang belum diproses (aman dipanggil berulang).
create or replace function public.process_transaction_stock(transaction_uuid uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare t_item record; r record; q numeric;
begin
    if coalesce(auth.role(), '') <> 'service_role' and not public.is_staff() then
        raise exception 'Tidak punya akses.' using errcode = '42501';
    end if;

    for t_item in
        select * from public.transaction_items where transaction_id = transaction_uuid and not stock_deducted for update
    loop
        for r in select * from public.menu_recipes where menu_item_id = t_item.menu_item_id loop
            q := r.quantity_required * t_item.quantity;
            update public.ingredients set current_stock = current_stock - q where id = r.ingredient_id;
            insert into public.stock_logs (ingredient_id, change_amount, reason, notes)
            values (r.ingredient_id, -q, 'sale', 'Sold via POS: ' || t_item.item_name);
        end loop;
        update public.transaction_items set stock_deducted = true where id = t_item.id;
    end loop;
end;
$$;

-- Kegagalan stok tidak boleh membatalkan penjualan (perilaku lama): dicatat sebagai warning.
create or replace function public._deduct_stock_quietly(p_transaction uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
    perform public.process_transaction_stock(p_transaction);
exception when others then
    raise warning 'Stok transaksi % gagal dipotong: %', p_transaction, sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fungsi yang dipanggil aplikasi
-- ---------------------------------------------------------------------------
create or replace function public.create_sale(p_sale jsonb, p_items jsonb)
returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
    v_id uuid;
    v_sub numeric;
    v_disc numeric;
    v_pm text := p_sale ->> 'payment_method';
    v_status text := coalesce(nullif(p_sale ->> 'status', ''), 'PENDING');
begin
    if not public.is_staff() then
        raise exception 'Tidak punya akses.' using errcode = '42501';
    end if;
    if v_pm is null or v_pm not in ('CASH', 'QRIS', 'TRANSFER', 'OPEN_BILL') then
        raise exception 'Metode pembayaran tidak valid' using errcode = '22023';
    end if;

    select coalesce(sum(price * quantity), 0) into v_sub from public._sale_items(p_items);
    v_disc := least(greatest(coalesce((p_sale ->> 'discount_amount')::numeric, 0), 0), v_sub);

    insert into public.transactions (
        total_amount, subtotal, discount_amount, payment_method, order_type, status, customer_name,
        voucher_code, voucher_notes, notes, voucher_discount_type, voucher_discount_value
    ) values (
        v_sub - v_disc, round(v_sub)::integer, round(v_disc)::integer, v_pm,
        nullif(p_sale ->> 'order_type', ''), v_status, nullif(btrim(p_sale ->> 'customer_name'), ''),
        nullif(p_sale ->> 'voucher_code', ''), nullif(p_sale ->> 'voucher_notes', ''), nullif(p_sale ->> 'notes', ''),
        coalesce(nullif(p_sale ->> 'voucher_discount_type', ''), 'FIXED'),
        coalesce((p_sale ->> 'voucher_discount_value')::integer, 0)
    ) returning id into v_id;   -- created_by/created_by_name diisi trigger dari auth.uid()

    insert into public.transaction_items (transaction_id, menu_item_id, quantity, price, item_name, is_consignment, consignment_cost)
    select v_id, menu_item_id, quantity, price, item_name, is_consignment, consignment_cost from public._sale_items(p_items);

    perform public._deduct_stock_quietly(v_id);
    return v_id;
end;
$$;

create or replace function public.add_items_to_bill(p_transaction uuid, p_items jsonb)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_add numeric;
begin
    if not public.is_staff() then
        raise exception 'Tidak punya akses.' using errcode = '42501';
    end if;
    perform 1 from public.transactions
        where id = p_transaction and status = 'PENDING' and payment_method = 'OPEN_BILL' for update;
    if not found then
        raise exception 'Bill tidak ditemukan atau sudah dibayar.' using errcode = 'P0002';
    end if;

    select coalesce(sum(price * quantity), 0) into v_add from public._sale_items(p_items);

    insert into public.transaction_items (transaction_id, menu_item_id, quantity, price, item_name, is_consignment, consignment_cost)
    select p_transaction, menu_item_id, quantity, price, item_name, is_consignment, consignment_cost from public._sale_items(p_items);

    update public.transactions
       set subtotal = coalesce(subtotal, 0) + round(v_add)::integer,
           total_amount = total_amount + v_add,
           updated_at = now()
     where id = p_transaction;

    perform public._deduct_stock_quietly(p_transaction);
end;
$$;

create or replace function public.edit_transaction_items(p_transaction uuid, p_items jsonb)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_sub numeric; v_disc integer;
begin
    if not public.is_admin() then
        raise exception 'Hanya admin yang dapat mengubah item transaksi.' using errcode = '42501';
    end if;
    select coalesce(discount_amount, 0) into v_disc from public.transactions where id = p_transaction for update;
    if not found then
        raise exception 'Transaksi tidak ditemukan.' using errcode = 'P0002';
    end if;

    select coalesce(sum(price * quantity), 0) into v_sub from public._sale_items(p_items);

    perform public._restore_stock(p_transaction, 'Item transaksi diedit');
    delete from public.transaction_items where transaction_id = p_transaction;
    insert into public.transaction_items (transaction_id, menu_item_id, quantity, price, item_name, is_consignment, consignment_cost)
    select p_transaction, menu_item_id, quantity, price, item_name, is_consignment, consignment_cost from public._sale_items(p_items);

    update public.transactions
       set subtotal = round(v_sub)::integer,
           total_amount = greatest(0, v_sub - v_disc),
           updated_at = now()
     where id = p_transaction;

    perform public._deduct_stock_quietly(p_transaction);
end;
$$;

create or replace function public.delete_transaction_with_restore(transaction_uuid uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
    if not public.is_admin() then
        raise exception 'Hanya admin yang dapat menghapus transaksi.' using errcode = '42501';
    end if;
    perform public._restore_stock(transaction_uuid, 'Transaction deleted');
    delete from public.transactions where id = transaction_uuid;
end;
$$;

create or replace function public.increment_likes(row_id bigint)
returns void
language sql security definer
set search_path = public, pg_temp
as $$
    update public.stories set likes = coalesce(likes, 0) + 1 where id = row_id;
$$;

-- Hall of Fame publik: hanya agregat (nama + total), tanpa baris transaksi mentah.
create or replace function public.top_spenders(p_period text default 'THIS_MONTH')
returns table (name text, total_spent numeric, visit_count bigint, last_visit timestamptz)
language sql stable security definer
set search_path = public, pg_temp
as $$
    select (array_agg(btrim(t.customer_name) order by t.created_at desc))[1],
           sum(t.total_amount),
           count(*),
           max(t.created_at)
      from public.transactions t
     where t.status in ('COMPLETED', 'PENDING')
       and btrim(coalesce(t.customer_name, '')) <> ''
       and lower(btrim(t.customer_name)) not in ('guest', 'tanpa nama')
       and (p_period = 'ALL'
            or t.created_at >= date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta')
     group by lower(btrim(t.customer_name))
    having sum(t.total_amount) > 0
     order by 2 desc
     limit 5;
$$;

-- ---------------------------------------------------------------------------
-- Trigger
-- ---------------------------------------------------------------------------
-- Pembuat transaksi diambil dari sesi login, bukan dari kiriman klien (anti-pemalsuan).
create or replace function public.transactions_set_creator()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
    if auth.uid() is not null then
        new.created_by := auth.uid();
        new.created_by_name := (select username from public.profiles where id = auth.uid());
    end if;
    return new;
end;
$$;
drop trigger if exists trg_transactions_set_creator on public.transactions;
create trigger trg_transactions_set_creator before insert on public.transactions
    for each row execute function public.transactions_set_creator();

-- Karyawan tidak boleh menulis ulang siapa pembuat / kapan transaksi dibuat.
create or replace function public.transactions_protect_audit()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
    if auth.uid() is not null and not public.is_admin() then
        new.created_by := old.created_by;
        new.created_by_name := old.created_by_name;
        new.created_at := old.created_at;
    end if;
    return new;
end;
$$;
drop trigger if exists trg_transactions_protect_audit on public.transactions;
create trigger trg_transactions_protect_audit before update on public.transactions
    for each row execute function public.transactions_protect_audit();

-- Jangan sampai admin terakhir terhapus / diturunkan (akan mengunci semua orang).
create or replace function public.profiles_keep_one_admin()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
    if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin')
       and not exists (select 1 from public.profiles where role = 'admin' and id <> old.id) then
        raise exception 'Minimal harus ada satu admin.' using errcode = '23514';
    end if;
    if tg_op = 'DELETE' then return old; end if;
    return new;
end;
$$;
drop trigger if exists trg_profiles_keep_one_admin on public.profiles;
create trigger trg_profiles_keep_one_admin before update or delete on public.profiles
    for each row execute function public.profiles_keep_one_admin();

-- Rem sederhana anti-banjir cerita (kuota global, bukan per orang).
create or replace function public.stories_throttle()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
    if (select count(*) from public.stories where created_at > now() - interval '1 minute') >= 20 then
        raise exception 'Terlalu banyak cerita masuk, coba lagi sebentar.' using errcode = '53400';
    end if;
    return new;
end;
$$;
drop trigger if exists trg_stories_throttle on public.stories;
create trigger trg_stories_throttle before insert on public.stories
    for each row execute function public.stories_throttle();

-- ---------------------------------------------------------------------------
-- Hak eksekusi: fungsi baru default-nya boleh dipanggil PUBLIC, tutup dulu.
-- ---------------------------------------------------------------------------
revoke all on function public._sale_items(jsonb), public._restore_stock(uuid, text), public._deduct_stock_quietly(uuid) from public, anon, authenticated;
revoke all on function public.process_transaction_stock(uuid), public.create_sale(jsonb, jsonb),
    public.add_items_to_bill(uuid, jsonb), public.edit_transaction_items(uuid, jsonb),
    public.delete_transaction_with_restore(uuid) from public, anon;
grant execute on function public.process_transaction_stock(uuid), public.create_sale(jsonb, jsonb),
    public.add_items_to_bill(uuid, jsonb), public.edit_transaction_items(uuid, jsonb),
    public.delete_transaction_with_restore(uuid) to authenticated, service_role;

revoke all on function public.increment_likes(bigint), public.top_spenders(text) from public;
grant execute on function public.increment_likes(bigint), public.top_spenders(text) to anon, authenticated;

revoke all on function public.transactions_set_creator(), public.transactions_protect_audit(),
    public.profiles_keep_one_admin(), public.stories_throttle() from public, anon, authenticated;
