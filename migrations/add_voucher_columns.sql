-- Migration: Add Voucher Support to Transactions
-- Run this in Supabase SQL Editor

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS voucher_notes TEXT,
ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN transactions.voucher_code IS 'Kode voucher yang digunakan (opsional)';
COMMENT ON COLUMN transactions.voucher_notes IS 'Catatan tentang voucher (opsional)';
COMMENT ON COLUMN transactions.discount_amount IS 'Nilai diskon dari voucher dalam Rupiah';
COMMENT ON COLUMN transactions.subtotal IS 'Total sebelum diskon voucher';
