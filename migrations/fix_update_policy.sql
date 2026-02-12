-- Migration: Fix Transaction Permissions (RLS)
-- Run this in Supabase SQL Editor

-- Enable RLS (if not already)
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;

-- Create Policies for Authenticated Users (Admins)

-- 1. Policies for Transactions Table
create policy "Enable ALL access for authenticated users on transactions"
on public.transactions
for all
to authenticated
using (true)
with check (true);

-- 2. Policies for Transaction Items Table
create policy "Enable ALL access for authenticated users on transaction_items"
on public.transaction_items
for all
to authenticated
using (true)
with check (true);
