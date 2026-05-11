-- Add payment_method to transactions for sorting & icons
DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('checking','pix','cash','card','invoice');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_method public.payment_method NOT NULL DEFAULT 'checking';

-- Backfill: card-linked txs => 'card', others stay 'checking'
UPDATE public.transactions SET payment_method = 'card' WHERE card_id IS NOT NULL AND payment_method = 'checking';