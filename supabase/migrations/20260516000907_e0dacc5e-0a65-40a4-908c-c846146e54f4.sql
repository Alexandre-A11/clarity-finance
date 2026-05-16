ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS purchase_group_id uuid;

CREATE INDEX IF NOT EXISTS idx_transactions_purchase_group
ON public.transactions (purchase_group_id)
WHERE purchase_group_id IS NOT NULL;