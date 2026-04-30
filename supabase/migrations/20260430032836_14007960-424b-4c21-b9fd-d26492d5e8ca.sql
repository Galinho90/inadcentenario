ALTER TABLE public.processos_judiciais
  ADD COLUMN IF NOT EXISTS fase_atual text,
  ADD COLUMN IF NOT EXISTS tribunal text,
  ADD COLUMN IF NOT EXISTS ultima_consulta timestamptz,
  ADD COLUMN IF NOT EXISTS consulta_status text,
  ADD COLUMN IF NOT EXISTS consulta_erro text;