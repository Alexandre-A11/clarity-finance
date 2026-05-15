
-- Create enum for ongoing expense payment methods
DO $$ BEGIN
  CREATE TYPE public.ongoing_payment_method AS ENUM ('debito_automatico', 'boleto', 'credito', 'pix');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.ongoing_expenses
  ADD COLUMN IF NOT EXISTS payment_method public.ongoing_payment_method NOT NULL DEFAULT 'boleto',
  ADD COLUMN IF NOT EXISTS credit_card_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_ongoing_expenses_credit_card_id ON public.ongoing_expenses(credit_card_id);
