DROP POLICY IF EXISTS assets_insert_authenticated ON public.assets;

CREATE POLICY assets_insert_authenticated ON public.assets
  FOR INSERT TO authenticated
  WITH CHECK (
    length(trim(ticker)) BETWEEN 4 AND 10
    AND length(trim(name)) > 0
    AND kind IN ('stock', 'fii')
  );