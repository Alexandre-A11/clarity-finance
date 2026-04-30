-- 1) Despesas contínuas: separar assinaturas vs parcelamentos
DO $$ BEGIN
  CREATE TYPE public.ongoing_kind AS ENUM ('subscription', 'installment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.ongoing_expenses
  ADD COLUMN IF NOT EXISTS kind public.ongoing_kind NOT NULL DEFAULT 'installment',
  ADD COLUMN IF NOT EXISTS due_day smallint;

-- Permitir nulos em campos exclusivos de parcelamento (assinaturas não usam)
ALTER TABLE public.ongoing_expenses
  ALTER COLUMN total_amount DROP NOT NULL,
  ALTER COLUMN months_total DROP NOT NULL;

-- 2) A receber: pagamentos parciais
ALTER TABLE public.receivables
  ADD COLUMN IF NOT EXISTS received_amount numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.receivable_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  receivable_id uuid NOT NULL REFERENCES public.receivables(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  paid_at date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.receivable_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rp_all_own ON public.receivable_payments;
CREATE POLICY rp_all_own ON public.receivable_payments
  FOR ALL TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.receivable_payments;

-- 3) Vencimentos
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT true;

ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS next_due_date date;

-- 4) Permitir usuário inserir novos assets (catálogo aberto)
DROP POLICY IF EXISTS assets_insert_authenticated ON public.assets;
CREATE POLICY assets_insert_authenticated ON public.assets
  FOR INSERT TO authenticated
  WITH CHECK (true);