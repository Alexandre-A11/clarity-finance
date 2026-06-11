
ALTER TYPE public.asset_kind ADD VALUE IF NOT EXISTS 'rendafixa';
ALTER TYPE public.asset_kind ADD VALUE IF NOT EXISTS 'cripto';
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS current_price numeric;
