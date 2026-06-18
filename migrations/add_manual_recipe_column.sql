-- Migration: Add manual recipe instructions to menu items
-- Run this in Supabase SQL Editor

ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS manual_recipe text DEFAULT '';

COMMENT ON COLUMN public.menu_items.manual_recipe IS 'Freeform manual recipe steps/instructions for baristas';
