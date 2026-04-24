-- Migration: Create finance records table for admin cashflow tracking

CREATE TABLE IF NOT EXISTS public.finance_records (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    type text NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    amount integer NOT NULL CHECK (amount > 0),
    payment_method text NOT NULL CHECK (payment_method IN ('CASH', 'QRIS')),
    category text NOT NULL,
    note text,
    transaction_date date NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.finance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users on finance_records" ON public.finance_records;
CREATE POLICY "Enable all access for authenticated users on finance_records"
ON public.finance_records
FOR ALL
USING (true)
WITH CHECK (true);

COMMENT ON TABLE public.finance_records IS 'Manual finance ledger for income and expense tracking in admin panel';
COMMENT ON COLUMN public.finance_records.type IS 'Transaction type: INCOME or EXPENSE';
COMMENT ON COLUMN public.finance_records.amount IS 'Amount in IDR';
COMMENT ON COLUMN public.finance_records.payment_method IS 'Payment method for the transaction: CASH or QRIS';
COMMENT ON COLUMN public.finance_records.transaction_date IS 'Logical transaction date used for reporting filters';