# Inadimplencia

Crie um sistema de leitura de PDF para relatórios de inadimplência, sem uso de inteligência artificial.

Funcionalidades:

1. Upload de PDF

- Permitir envio de arquivo PDF

2. Leitura do PDF

- Extrair texto do PDF utilizando biblioteca (ex: pdf-parse)

3. Processamento de dados

- Utilizar expressões regulares (regex) para identificar:

  - Unidade (ex: 12 01)

  - Nome do morador

  - Valor total (linha com "Total")

4. Estruturação

- Criar uma lista com:

  - Nome

  - Unidade

  - Total da dívida

5. Dashboard

- Exibir:

  - Total geral da dívida

  - Quantidade de inadimplentes

6. Relatórios

- Lista completa

- Ranking dos maiores devedores

- Filtro por valor

7. Interface

- Tabela com busca

- Layout simples

Objetivo:

Transformar PDF padronizado em dados estruturados e relatórios, sem uso de IA.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://inadcentenario.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/30ac964d-92ce-4949-85d5-509ae67b7699).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

### Filtro por mês de vencimento

A aba **"Por mês"** (ao lado de *Visão atual*) permite pesquisar a inadimplência
apenas pela data de vencimento das taxas de condomínio:

- o seletor **"Vencimento (mês)"** lista os meses disponíveis no relatório atual
  (com a quantidade de boletos e o total de cada mês);
- ao escolher um mês, a lista abaixo mostra **somente** os inadimplentes com
  boleto vencido naquele mês, e o total de cada um passa a ser a soma dos
  boletos **apenas** daquele mês;
- a exportação do Excel respeita o recorte e salva como `inadimplentes-AAAA-MM.xlsx`.

A lógica fica em `src/lib/periodoFilter.ts` (pura e coberta por testes unitários) e o
componente do seletor em `src/components/PeriodoFilter.tsx`. A aba *Visão atual* continua
mostrando a lista e o dashboard completos, sem recorte.

### Ordenação da lista de inadimplentes

A lista de inadimplentes (nas abas *Visão atual* e *Por mês*) é exibida na ordem de
**bloco** e, dentro de cada bloco, de **apartamento**:

- o campo `unidade` segue o padrão `NN NN` — ex.: `04 09`, onde **04** é o apartamento
  e **09** é o bloco;
- a ordenação vai do bloco **01** ao **15** em ordem crescente; dentro de cada bloco os
  apartamentos ficam em ordem crescente (ex.: `01 02`, `04 02`, `22 02`, `01 09`, `04 09`);
- unidades fora do padrão não são descartadas: ficam no final da lista;
- a exportação do Excel respeita a mesma ordenação.

A lógica fica em `src/lib/ordemUnidades.ts` (pura e coberta por testes unitários) e é
aplicada em `src/components/DebtorsTable.tsx`.

### CORS com o Supabase em desenvolvimento

O preview/servidor local sobe em origens temporárias (ex.: `http://127.0.0.1:<porta>`) que o
projeto Supabase não autoriza via CORS, e o navegador bloqueia as chamadas
(`No 'Access-Control-Allow-Origin' header is present...`).

Por isso, em desenvolvimento (`vite dev`), o `vite.config.ts` expõe um proxy em `/supabase`
que repassa as chamadas para `https://<project-ref>.supabase.co` (mesma origem, sem CORS):

- `GET /supabase/rest/v1/...` → `https://<project-ref>.supabase.co/rest/v1/...`
- `GET /supabase/auth/v1/...` → `https://<project-ref>.supabase.co/auth/v1/...`

O `src/integrations/supabase/client.ts` usa esse proxy apenas no modo de desenvolvimento
(flag `__USE_SUPABASE_PROXY__` injetada pelo `vite.config.ts`). No build de produção o app
fala direto com o Supabase, e a origem publicada precisa estar autorizada nas configurações
de CORS do projeto Supabase.
