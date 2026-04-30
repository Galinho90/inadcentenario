ALTER TABLE public.processos_judiciais
  ADD COLUMN IF NOT EXISTS migrado_eproc boolean NOT NULL DEFAULT false;