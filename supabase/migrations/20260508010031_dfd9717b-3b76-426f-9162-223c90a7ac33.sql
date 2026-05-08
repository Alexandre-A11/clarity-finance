ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS paid_amount numeric;
ALTER TABLE public.holdings_lots ADD COLUMN IF NOT EXISTS purchase_date date;
UPDATE public.holdings_lots SET purchase_date = date WHERE purchase_date IS NULL;