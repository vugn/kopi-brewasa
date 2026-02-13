-- Migration: support for Addons, Visibility, Order Notes, and Percentage Vouchers
-- Run this in Supabase SQL Editor

-- 1. Updates to menu_items
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'MAIN', -- 'MAIN', 'ADDON', 'SPECIAL'
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN menu_items.category IS 'Kategori menu: MAIN, ADDON, atau SPECIAL';
COMMENT ON COLUMN menu_items.is_available IS 'Status ketersediaan menu untuk ditampilkan di POS';

-- 2. Updates to transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS notes TEXT, -- Untuk catatan pesanan (e.g. "Jangan pedes", "Es dikit")
ADD COLUMN IF NOT EXISTS voucher_discount_type VARCHAR(10) DEFAULT 'FIXED', -- 'FIXED' or 'PERCENT'
ADD COLUMN IF NOT EXISTS voucher_discount_value INTEGER DEFAULT 0; -- Raw value (e.g. 10 for 10% or 5000 for 5000 IDR)

COMMENT ON COLUMN transactions.notes IS 'Catatan khusus untuk pesanan ini';
COMMENT ON COLUMN transactions.voucher_discount_type IS 'Tipe diskon voucher: FIXED atau PERCENT';
COMMENT ON COLUMN transactions.voucher_discount_value IS 'Nilai diskon mentah (persen atau nominal)';
