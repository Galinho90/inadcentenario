-- Remove cron job de sincronização diária (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('sync-processos-diario')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-processos-diario');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Remover colunas de sincronização da tabela processos_judiciais
ALTER TABLE public.processos_judiciais
  DROP COLUMN IF EXISTS fase_atual,
  DROP COLUMN IF EXISTS tribunal,
  DROP COLUMN IF EXISTS ultima_consulta,
  DROP COLUMN IF EXISTS consulta_status,
  DROP COLUMN IF EXISTS consulta_erro,
  DROP COLUMN IF EXISTS migrado_eproc;