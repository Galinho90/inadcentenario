-- Tabela para rastrear processos judiciais por morador (persiste entre relatórios)
CREATE TABLE public.processos_judiciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade text NOT NULL,
  nome text NOT NULL,
  numero_processo text NOT NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unidade, nome)
);

ALTER TABLE public.processos_judiciais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read processos_judiciais"
  ON public.processos_judiciais FOR SELECT USING (true);

CREATE POLICY "Public can insert processos_judiciais"
  ON public.processos_judiciais FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update processos_judiciais"
  ON public.processos_judiciais FOR UPDATE USING (true);

CREATE POLICY "Public can delete processos_judiciais"
  ON public.processos_judiciais FOR DELETE USING (true);

CREATE TRIGGER trg_processos_judiciais_updated_at
  BEFORE UPDATE ON public.processos_judiciais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_processos_judiciais_unidade_nome
  ON public.processos_judiciais (unidade, nome);
