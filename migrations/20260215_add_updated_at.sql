-- Migration: Add updated_at column to transactions table

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());
