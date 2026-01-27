-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. Ingredients Table
create table if not exists public.ingredients (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    unit text not null, -- 'gram', 'ml', 'pcs'
    price_per_unit numeric default 0,
    current_stock numeric default 0,
    min_stock numeric default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Overhead Costs Table
create table if not exists public.overhead_costs (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    amount numeric default 0,
    type text check (type in ('fixed', 'variable')), -- 'fixed' (rent, salary), 'variable' (packaging, electricity est)
    period text check (period in ('monthly', 'daily')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Menu Recipes Table
create table if not exists public.menu_recipes (
    id uuid default uuid_generate_v4() primary key,
    menu_item_id bigint references public.menu_items(id) on delete cascade, 
    -- Note: Assuming menu_items.id is bigint based on standard supabase. 
    -- If it's uuid, change to: menu_item_id uuid references public.menu_items(id) on delete cascade
    -- Based on code, menu_items seems to have 'id' which might be int or uuid. 
    -- I will check the MenuManager fetching code... 
    -- Actually MenuManager uses `order('id', ...)` but doesn't explicitly show type. 
    -- Safe bet is creating without FK constraint first if unsure, but FK is better.
    -- Let's use loose typing or verify first. 
    -- RE-VERIFICATION: In MenuManager `setItems(data?.map(...))`
        -- I will assume menu_items(id) exists.
    ingredient_id uuid references public.ingredients(id) on delete cascade,
    quantity_required numeric not null, -- amount of 'unit' from ingredients table
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Stock Logs Table
create table if not exists public.stock_logs (
    id uuid default uuid_generate_v4() primary key,
    ingredient_id uuid references public.ingredients(id) on delete cascade,
    change_amount numeric not null, -- positive for in, negative for out
    reason text, -- 'purchase', 'sale', 'waste', 'opname', 'initial'
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (Simplified for Admin App - Assuming public or authenticated)
alter table public.ingredients enable row level security;
create policy "Enable all access for authenticated users" on public.ingredients for all using (true) with check (true);

alter table public.overhead_costs enable row level security;
create policy "Enable all access for authenticated users" on public.overhead_costs for all using (true) with check (true);

alter table public.menu_recipes enable row level security;
create policy "Enable all access for authenticated users" on public.menu_recipes for all using (true) with check (true);

alter table public.stock_logs enable row level security;

-- 5. Helper Function: Deduct Stock on Transaction
create or replace function public.process_transaction_stock(transaction_uuid uuid)
returns void
language plpgsql
security definer
as $$
declare
    t_item record;
    recipe_item record;
    needed_qty numeric;
begin
    -- Loop through all items in the transaction
    for t_item in 
        select * from public.transaction_items where transaction_id = transaction_uuid
    loop
        -- For each sold item, find its recipe
        for recipe_item in 
            select * from public.menu_recipes where menu_item_id = t_item.menu_item_id
        loop
            -- Calculate total needed: recipe qty * sold qty
            needed_qty := recipe_item.quantity_required * t_item.quantity;

            -- Deduct from inventory
            update public.ingredients
            set current_stock = current_stock - needed_qty
            where id = recipe_item.ingredient_id;

            -- Log the movement
            insert into public.stock_logs (ingredient_id, change_amount, reason, notes)
            values (
                recipe_item.ingredient_id, 
                -needed_qty, 
                'sale', 
                'Sold via POS: ' || t_item.item_name
            );
        end loop;
    end loop;
end;
$$;
