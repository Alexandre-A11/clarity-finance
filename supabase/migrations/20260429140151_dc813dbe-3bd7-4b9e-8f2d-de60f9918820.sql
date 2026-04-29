
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.tx_kind AS ENUM ('income', 'expense');
CREATE TYPE public.account_type AS ENUM ('checking', 'savings', 'wallet', 'other');
CREATE TYPE public.receivable_status AS ENUM ('pending', 'paid', 'overdue');
CREATE TYPE public.asset_kind AS ENUM ('stock', 'fii');
CREATE TYPE public.dividend_type AS ENUM ('dividend', 'jcp', 'rendimento');

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  -- seed default categories
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
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- CATEGORIES
-- =========================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind public.tx_kind NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT NOT NULL DEFAULT 'circle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_user ON public.categories(user_id);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_all_own" ON public.categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- ACCOUNTS
-- =========================================================
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.account_type NOT NULL DEFAULT 'checking',
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_accounts_user ON public.accounts(user_id);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts_all_own" ON public.accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- CREDIT CARDS
-- =========================================================
CREATE TABLE public.credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  limit_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  closing_day SMALLINT NOT NULL DEFAULT 1,
  due_day SMALLINT NOT NULL DEFAULT 10,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cards_user ON public.credit_cards(user_id);
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cards_all_own" ON public.credit_cards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- INSTALLMENT PURCHASES
-- =========================================================
CREATE TABLE public.installment_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL,
  installments_total SMALLINT NOT NULL,
  first_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_installments_user ON public.installment_purchases(user_id);
ALTER TABLE public.installment_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "installments_all_own" ON public.installment_purchases FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- TRANSACTIONS
-- =========================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  kind public.tx_kind NOT NULL,
  description TEXT,
  is_installment BOOLEAN NOT NULL DEFAULT FALSE,
  installment_purchase_id UUID REFERENCES public.installment_purchases(id) ON DELETE CASCADE,
  installment_index SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tx_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX idx_tx_card ON public.transactions(card_id) WHERE card_id IS NOT NULL;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx_all_own" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- ONGOING EXPENSES (financiamentos, consórcios)
-- =========================================================
CREATE TABLE public.ongoing_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  months_total SMALLINT NOT NULL,
  months_paid SMALLINT NOT NULL DEFAULT 0,
  monthly_value NUMERIC(14,2) NOT NULL,
  start_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ongoing_user ON public.ongoing_expenses(user_id);
ALTER TABLE public.ongoing_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ongoing_all_own" ON public.ongoing_expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- RECEIVABLES (a receber)
-- =========================================================
CREATE TABLE public.receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debtor_name TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  due_date DATE,
  status public.receivable_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_receivables_user ON public.receivables(user_id);
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receivables_all_own" ON public.receivables FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- ASSETS (catálogo público de ações/FIIs)
-- =========================================================
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL UNIQUE,
  kind public.asset_kind NOT NULL,
  name TEXT NOT NULL,
  cnpj TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets_select_all" ON public.assets FOR SELECT USING (true);

INSERT INTO public.assets (ticker, kind, name, cnpj) VALUES
  ('BBAS3', 'stock', 'Banco do Brasil', '00.000.000/0001-91'),
  ('SAPR4', 'stock', 'Sanepar', '76.484.013/0001-45'),
  ('KLBN4', 'stock', 'Klabin', '89.637.490/0001-45'),
  ('PETR4', 'stock', 'Petrobras', '33.000.167/0001-01'),
  ('VALE3', 'stock', 'Vale', '33.592.510/0001-54'),
  ('ITUB4', 'stock', 'Itaú Unibanco', '60.872.504/0001-23'),
  ('BBDC4', 'stock', 'Bradesco', '60.746.948/0001-12'),
  ('TAEE11', 'stock', 'Taesa', '07.859.971/0001-30'),
  ('MXRF11', 'fii', 'Maxi Renda FII', '97.521.225/0001-25'),
  ('VGIR11', 'fii', 'Valora CRI Recebíveis', '28.737.771/0001-85'),
  ('VGHF11', 'fii', 'Valora Hedge Fund', '36.502.617/0001-08'),
  ('HGLG11', 'fii', 'CSHG Logística', '11.728.688/0001-47'),
  ('KNRI11', 'fii', 'Kinea Renda Imobiliária', '12.005.956/0001-65'),
  ('XPML11', 'fii', 'XP Malls', '28.757.546/0001-00'),
  ('BCFF11', 'fii', 'BTG Pactual Fundo de Fundos', '11.026.627/0001-38');

-- =========================================================
-- HOLDINGS LOTS (lotes de compra)
-- =========================================================
CREATE TABLE public.holdings_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  broker TEXT,
  date DATE NOT NULL,
  quantity NUMERIC(14,4) NOT NULL,
  unit_price NUMERIC(14,4) NOT NULL,
  fees NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lots_user_asset ON public.holdings_lots(user_id, asset_id);
ALTER TABLE public.holdings_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lots_all_own" ON public.holdings_lots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- DIVIDENDS
-- =========================================================
CREATE TABLE public.dividends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  broker TEXT,
  payment_date DATE NOT NULL,
  type public.dividend_type NOT NULL DEFAULT 'dividend',
  gross NUMERIC(14,2) NOT NULL,
  net NUMERIC(14,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_div_user_date ON public.dividends(user_id, payment_date DESC);
ALTER TABLE public.dividends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "div_all_own" ON public.dividends FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- QUOTES CACHE
-- =========================================================
CREATE TABLE public.quotes_cache (
  ticker TEXT PRIMARY KEY,
  price NUMERIC(14,4) NOT NULL,
  change_pct NUMERIC(8,4),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quotes_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes_select_all" ON public.quotes_cache FOR SELECT USING (true);

-- =========================================================
-- REALTIME
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.holdings_lots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dividends;
ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.installment_purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.receivables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ongoing_expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
