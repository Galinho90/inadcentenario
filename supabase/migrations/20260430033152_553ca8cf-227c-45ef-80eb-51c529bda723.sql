CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- remove job anterior se existir
DO $$
BEGIN
  PERFORM cron.unschedule('sync-processos-diario');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sync-processos-diario',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url:='https://zwngrpxfrrocpdsicinb.supabase.co/functions/v1/consultar-processos-batch',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3bmdycHhmcnJvY3Bkc2ljaW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTU1NjIsImV4cCI6MjA5MzA3MTU2Mn0.BZeo2qUquR50q4n7Y724X-meLrwnbLLZwx_kmlB5hBI"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);