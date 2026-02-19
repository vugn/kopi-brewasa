-- Migration: Add consignment (barang titipan) columns
-- Run this in Supabase SQL Editor

-- 1. Add consignment columns to menu_items
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS is_consignment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS consignment_cost numeric DEFAULT 0;

-- 2. Add consignment columns to transaction_items (snapshot at time of sale)
ALTER TABLE public.transaction_items
ADD COLUMN IF NOT EXISTS is_consignment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS consignment_cost numeric DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.menu_items.is_consignment IS 'True if this is a consignment/titipan item from external supplier';
COMMENT ON COLUMN public.menu_items.consignment_cost IS 'Cost/modal price from the supplier for consignment items';
COMMENT ON COLUMN public.transaction_items.is_consignment IS 'Snapshot: whether this item was consignment at time of sale';
COMMENT ON COLUMN public.transaction_items.consignment_cost IS 'Snapshot: supplier cost at time of sale for profit calculation';
