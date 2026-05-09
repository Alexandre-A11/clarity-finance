-- 1. Credit card new columns
ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS card_holder_name text,
  ADD COLUMN IF NOT EXISTS last_four_digits text;

ALTER TABLE public.credit_cards
  DROP CONSTRAINT IF EXISTS credit_cards_last_four_digits_check;
ALTER TABLE public.credit_cards
  ADD CONSTRAINT credit_cards_last_four_digits_check
  CHECK (last_four_digits IS NULL OR last_four_digits ~ '^[0-9]{4}$');

-- 2. Foreign keys for referential integrity
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_card_id_fkey;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_card_id_fkey
  FOREIGN KEY (card_id) REFERENCES public.credit_cards(id) ON DELETE SET NULL;

ALTER TABLE public.installment_purchases
  DROP CONSTRAINT IF EXISTS installment_purchases_card_id_fkey;
ALTER TABLE public.installment_purchases
  ADD CONSTRAINT installment_purchases_card_id_fkey
  FOREIGN KEY (card_id) REFERENCES public.credit_cards(id) ON DELETE CASCADE;

-- 3. Replace handle_new_user trigger to assign role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  -- First user -> admin, others -> user
  IF (SELECT count(*) FROM public.user_roles) = 0 THEN
    v_role := 'admin';
  ELSE
    v_role := 'user';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.categories (user_id, name, kind, color, icon) VALUES
    (NEW.id, 'Alimentação', 'expense', '#f59e0b', 'utensils'),
    (NEW.id, 'Aluguel', 'expense', '#8b5cf6', 'home'),
    (NEW.id, 'Internet', 'expense', '#06b6d4', 'wifi'),
    (NEW.id, 'Cartão de Crédito', 'expense', '#ef4444', 'credit-card'),
    (NEW.id, 'Transporte', 'expense', '#10b981', 'car'),
    (NEW.id, 'Lazer', 'expense', '#ec4899', 'gamepad-2'),
    (NEW.id, 'Saúde', 'expense', '#14b8a6', 'heart'),
    (NEW.id, 'Extras', 'expense', '#6b7280', 'more-horizontal'),
    (NEW.id, 'Salário', 'income', '#3b82f6', 'briefcase'),
    (NEW.id, 'Freelance', 'income', '#22c55e', 'laptop'),
    (NEW.id, 'Investimentos', 'income', '#0ea5e9', 'trending-up');
  RETURN NEW;
END;
$function$;

-- 4. Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Promote existing sole user to admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM public.profiles
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = profiles.id)
LIMIT 1;