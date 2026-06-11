
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_synced boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_id text;

ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS is_synced boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_id text;

CREATE TABLE IF NOT EXISTS public.bank_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_id text NOT NULL,
  bank_name text NOT NULL,
  status text NOT NULL DEFAULT 'connected',
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, bank_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_connections TO authenticated;
GRANT ALL ON public.bank_connections TO service_role;

ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_connections_all_own" ON public.bank_connections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_bank_connections
  BEFORE UPDATE ON public.bank_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
