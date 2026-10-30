DELETE FROM processos_judiciais p
WHERE p.nome ~* '\d+\s*(°|º|ª|o|a)?\s*notif'
  AND EXISTS (
    SELECT 1
    FROM processos_judiciais t
    WHERE t.unidade = p.unidade
      AND t.nome = trim(regexp_replace(p.nome, '\s*\d+\s*(°|º|ª|o|a)?\s*notif(ic(a(ção|cao))?)?\.?.*$', '', 'i'))
  );

UPDATE processos_judiciais
SET nome = trim(regexp_replace(nome, '\s*\d+\s*(°|º|ª|o|a)?\s*notif(ic(a(ção|cao))?)?\.?.*$', '', 'i'))
WHERE nome ~* '\d+\s*(°|º|ª|o|a)?\s*notif';
