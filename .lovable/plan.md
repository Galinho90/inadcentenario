
# Integração DataJud (CNJ) — Status automático de processos

Buscar a **fase atual** de cada processo judicial automaticamente via API pública do CNJ (DataJud), com sincronização diária e botão manual.

## 1. Banco de dados (migração)

Adicionar colunas em `processos_judiciais`:

- `fase_atual` (text, nullable) — última movimentação descritiva, ex: "Conclusos para sentença"
- `tribunal` (text, nullable) — sigla detectada do número CNJ, ex: "TJSP"
- `ultima_consulta` (timestamptz, nullable) — quando foi a última sincronização
- `consulta_status` (text, nullable) — `ok`, `nao_encontrado`, `erro`
- `consulta_erro` (text, nullable) — mensagem em caso de erro

## 2. Secret necessária

- `DATAJUD_API_KEY` — chave pública do CNJ (o usuário obtém em https://datajud-wiki.cnj.jus.br/api-publica/acesso). Vou solicitar via `add_secret` após aprovação.

## 3. Edge function `consultar-processo`

Endpoint POST que recebe `{ numero_processo, unidade, nome }`:

1. Limpa o número (mantém só dígitos, valida 20 dígitos no formato CNJ).
2. Identifica o tribunal pelos dígitos `J.TR` do número (ex: `8.26` → TJSP, `8.19` → TJRJ, `8.13` → TJMG, `5.03` → TRF3, etc.). Mapeamento via tabela interna.
3. Faz `POST` para `https://api-publica.datajud.cnj.jus.br/api_publica_{tribunal}/_search` com header `Authorization: APIKey {DATAJUD_API_KEY}` e body de busca pelo `numeroProcesso`.
4. Extrai do retorno: última movimentação (`movimentos[].nome` mais recente por `dataHora`) → grava em `fase_atual`.
5. Atualiza `processos_judiciais` com `fase_atual`, `tribunal`, `ultima_consulta`, `consulta_status`.
6. Retorna o registro atualizado.

Validação com Zod, CORS habilitado, sem JWT obrigatório.

## 4. Edge function `consultar-processos-batch`

Itera por todos os processos em `processos_judiciais` e chama a lógica de consulta para cada um (com pequeno delay para não estourar rate limit do DataJud). Retorna resumo `{ atualizados, erros }`.

## 5. Cron diário (pg_cron + pg_net)

Habilitar `pg_cron` e `pg_net` e agendar chamada para `consultar-processos-batch` **uma vez por dia às 06:00**:

```sql
select cron.schedule(
  'sync-processos-diario',
  '0 6 * * *',
  $$ select net.http_post(
       url:='https://zwngrpxfrrocpdsicinb.supabase.co/functions/v1/consultar-processos-batch',
       headers:='{"Content-Type":"application/json","apikey":"<ANON_KEY>"}'::jsonb,
       body:='{}'::jsonb
     ); $$
);
```

## 6. UI

**`src/lib/processosRepo.ts`**
- Estender `ProcessoJudicial` com os novos campos.
- Adicionar `consultarProcesso(unidade, nome, numero)` e `consultarTodos()` que chamam as edge functions via `supabase.functions.invoke`.

**`src/components/DebtorsTable.tsx`** (linha do devedor com processo)
- Ao lado do número do processo, mostrar badge cinza com `fase_atual` (ex: "Em execução"). Se `null`, mostrar "—".
- Tooltip com "Atualizado há X dias" baseado em `ultima_consulta`.

**Modal de detalhes do devedor** (seção judicial vermelha)
- Mostrar bloco "Status processual":
  - Fase atual
  - Tribunal detectado
  - Última consulta (data formatada)
- Botão **"Atualizar status"** que chama `consultarProcesso` e recarrega.

**`src/components/DashboardOverview.tsx`** (header da página ou área de ações)
- Botão **"Sincronizar processos agora"** que chama `consultarTodos()` e mostra toast com resumo.

## 7. Mapeamento de tribunais (interno na edge)

Tabela com os endpoints públicos do DataJud, ex:
- Justiça Estadual: `api_publica_tjsp`, `api_publica_tjrj`, `api_publica_tjmg`, `api_publica_tjpr`, `api_publica_tjrs`, etc. (cobre todos os 27 TJs)
- Justiça Federal: `api_publica_trf1` a `api_publica_trf6`
- Justiça do Trabalho: `api_publica_trt1` a `api_publica_trt24` + `api_publica_tst`
- Justiça Eleitoral, Militar e Superiores conforme necessário.

A sigla é derivada do segmento `J.TR` do número CNJ padrão.

## Observações

- O DataJud não é em tempo real — atualização típica de algumas horas a 1-2 dias. Para a maioria dos casos de cobrança é suficiente.
- Rate limit do DataJud é generoso para uso público, mas adicionamos delay de ~200ms entre chamadas no batch.
- Nenhuma alteração nos componentes existentes além das listadas; histórico, dashboard e fluxo de PDF ficam intactos.

## Próximos passos após sua aprovação

1. Criar migração com as novas colunas.
2. Pedir a chave `DATAJUD_API_KEY` (via add_secret).
3. Criar as duas edge functions.
4. Habilitar `pg_cron`/`pg_net` e agendar o job diário.
5. Atualizar `processosRepo.ts`, `DebtorsTable.tsx` e `DashboardOverview.tsx`.
