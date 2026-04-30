-- Função utilitária para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Tabela: relatorios
CREATE TABLE public.relatorios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_arquivo TEXT NOT NULL,
  total_geral NUMERIC(14,2) NOT NULL DEFAULT 0,
  quantidade_inadimplentes INTEGER NOT NULL DEFAULT 0,
  processado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.relatorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read relatorios"
  ON public.relatorios FOR SELECT USING (true);
CREATE POLICY "Public can insert relatorios"
  ON public.relatorios FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can delete relatorios"
  ON public.relatorios FOR DELETE USING (true);

CREATE TRIGGER update_relatorios_updated_at
BEFORE UPDATE ON public.relatorios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_relatorios_processado_em ON public.relatorios(processado_em DESC);

-- Tabela: inadimplentes
CREATE TABLE public.inadimplentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  relatorio_id UUID NOT NULL REFERENCES public.relatorios(id) ON DELETE CASCADE,
  unidade TEXT NOT NULL,
  nome TEXT NOT NULL,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inadimplentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read inadimplentes"
  ON public.inadimplentes FOR SELECT USING (true);
CREATE POLICY "Public can insert inadimplentes"
  ON public.inadimplentes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can delete inadimplentes"
  ON public.inadimplentes FOR DELETE USING (true);

CREATE INDEX idx_inadimplentes_relatorio_id ON public.inadimplentes(relatorio_id);
CREATE INDEX idx_inadimplentes_total ON public.inadimplentes(total DESC);

-- Tabela: boletos
CREATE TABLE public.boletos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inadimplente_id UUID NOT NULL REFERENCES public.inadimplentes(id) ON DELETE CASCADE,
  vencimento TEXT NOT NULL,
  atraso INTEGER NOT NULL DEFAULT 0,
  codigo TEXT,
  principal NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read boletos"
  ON public.boletos FOR SELECT USING (true);
CREATE POLICY "Public can insert boletos"
  ON public.boletos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can delete boletos"
  ON public.boletos FOR DELETE USING (true);

CREATE INDEX idx_boletos_inadimplente_id ON public.boletos(inadimplente_id);