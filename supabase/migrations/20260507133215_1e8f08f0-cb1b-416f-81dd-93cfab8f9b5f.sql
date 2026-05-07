-- Add tipo column to distinguish judicial vs extrajudicial
ALTER TABLE public.processos_judiciais 
ADD COLUMN tipo text NOT NULL DEFAULT 'judicial' 
CHECK (tipo IN ('judicial', 'extrajudicial'));