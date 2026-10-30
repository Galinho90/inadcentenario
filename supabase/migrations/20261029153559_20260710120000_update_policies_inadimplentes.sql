CREATE POLICY "Auth update inadimplentes"
  ON public.inadimplentes FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Auth update boletos"
  ON public.boletos FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Auth update relatorios"
  ON public.relatorios FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_inadimplentes_relatorio_unidade
  ON public.inadimplentes(relatorio_id, unidade);
