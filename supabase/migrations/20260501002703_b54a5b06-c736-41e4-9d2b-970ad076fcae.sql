DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM public.profiles
WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role);
$$;

DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_insert_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_delete_admin ON public.user_roles;

CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY user_roles_select_admin ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY user_roles_insert_admin ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY user_roles_update_admin ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY user_roles_delete_admin ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
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
END;
$function$;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;