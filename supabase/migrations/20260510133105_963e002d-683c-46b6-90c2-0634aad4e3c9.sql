-- Update handle_new_user to no longer seed a "Cartão de Crédito" category
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

-- Unlink transactions from categories named "Cartão de Crédito" or "Fatura", then delete those categories
UPDATE public.transactions t
SET category_id = NULL
FROM public.categories c
WHERE t.category_id = c.id
  AND lower(c.name) IN ('cartão de crédito', 'cartao de credito', 'fatura');

UPDATE public.installment_purchases p
SET category_id = NULL
FROM public.categories c
WHERE p.category_id = c.id
  AND lower(c.name) IN ('cartão de crédito', 'cartao de credito', 'fatura');

DELETE FROM public.categories
WHERE lower(name) IN ('cartão de crédito', 'cartao de credito', 'fatura');
