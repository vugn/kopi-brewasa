-- Migration: Create Admin Notes Table
-- Run this in Supabase SQL Editor

create table if not exists public.admin_notes (
    id uuid default uuid_generate_v4() primary key,
    content text not null,
    is_pinned boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.admin_notes enable row level security;

-- Create Policies
create policy "Enable ALL access for authenticated users on admin_notes"
on public.admin_notes
for all
to authenticated
using (true)
with check (true);
