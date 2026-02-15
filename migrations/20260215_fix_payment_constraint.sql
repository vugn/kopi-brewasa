-- Migration: Fix payment_method constraint to allow OPEN_BILL

-- 1. Drop existing constraint if it exists
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;

-- 2. Add new constraint including OPEN_BILL
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_payment_method_check 
CHECK (payment_method IN ('CASH', 'QRIS', 'TRANSFER', 'OPEN_BILL'));
