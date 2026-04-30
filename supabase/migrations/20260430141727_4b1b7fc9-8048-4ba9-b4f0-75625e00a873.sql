
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Backfill from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- Update handle_new_user to include email + role default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'user'
  );
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
END; $function$;
