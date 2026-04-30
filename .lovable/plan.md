
# Sistema de Leitura de PDF — Inadimplência

Aplicação web client-side que processa PDFs padronizados de relatórios de inadimplência, extrai dados via regex (sem IA) e gera dashboard e relatórios interativos.

## Escopo

- Processamento 100% no navegador (sem backend obrigatório nesta primeira versão).
- Persistência opcional via Supabase pode ser adicionada depois — a primeira entrega será apenas em sessão, para você validar a extração com o PDF real antes de integrar ao seu Supabase contratado.
- Sem exportação (CSV/PDF) por enquanto.
- Estilo claro e minimalista.

## Telas e Fluxo

### 1. Página Única (Dashboard + Upload)

```text
+--------------------------------------------------+
|  Inadimplência — Leitor de PDF                   |
+--------------------------------------------------+
|  [ Arraste o PDF aqui ou clique para enviar ]    |
|                                                  |
|  Arquivo: relatorio-out-2026.pdf  [Reprocessar]  |
+--------------------------------------------------+
|  Total geral       Inadimplentes    Ticket médio |
|  R$ 124.580,00     38               R$ 3.278,42  |
+--------------------------------------------------+
|  [ Lista Completa ] [ Ranking ]  Filtro: > R$ __ |
|                                                  |
|  Busca: [_________________]                      |
|  +----+--------+----------------------+--------+ |
|  | #  | Unid.  | Nome                 | Total  | |
|  +----+--------+----------------------+--------+ |
|  | 1  | 12 01  | João da Silva        | 5.420  | |
|  | 2  | 03 02  | Maria Souza          | 4.890  | |
|  ...                                             |
+--------------------------------------------------+
```

### 2. Estados da interface
- **Vazio**: dropzone centralizado com instruções.
- **Processando**: spinner + "Lendo PDF...".
- **Erro de parsing**: alerta amigável com mensagem ("Nenhuma unidade encontrada no padrão esperado").
- **Sucesso**: dashboard + tabela.

## Funcionalidades

1. **Upload de PDF** via dropzone (drag & drop e clique).
2. **Extração de texto** do PDF página a página.
3. **Parsing por regex** identificando blocos de:
   - Unidade (padrão `\d{2}\s\d{2}`, ex: "12 01")
   - Nome do morador (linha após a unidade ou rótulo)
   - Total (linha contendo "Total" + valor monetário BR)
4. **Estruturação** em lista de objetos `{ unidade, nome, total }`.
5. **Dashboard** com cards: Total geral, Quantidade de inadimplentes, Ticket médio.
6. **Relatórios** em abas:
   - Lista Completa (ordem do PDF)
   - Ranking (ordenado por valor desc.)
   - Filtro por valor mínimo (input numérico)
7. **Busca** por nome ou unidade na tabela.
8. **Reprocessar** o mesmo arquivo após ajuste de filtros sem reupload.

## Detalhes Técnicos

- **Stack**: React + Vite + Tailwind + shadcn/ui (já no projeto).
- **Leitura de PDF**: `pdfjs-dist` (executa no navegador, sem servidor). Usaremos `getDocument` + `getTextContent` por página, concatenando os itens em texto plano preservando quebras de linha.
- **Parser** (`src/lib/pdfParser.ts`):
  - Regex unidade: `/\b(\d{2}\s\d{2})\b/`
  - Regex valor BR: `/R?\$?\s*([\d.]+,\d{2})/`
  - Regex linha total: `/total[^\n]*?([\d.]+,\d{2})/i`
  - Estratégia: dividir o texto em blocos por unidade encontrada; dentro de cada bloco, capturar o nome (primeira linha textual após a unidade que não seja número/valor) e o valor da linha "Total".
  - Função utilitária `parseBRL(str): number` para converter "1.234,56" → 1234.56.
- **Estado**: `useState` local na página + `useMemo` para derivar ranking, totais e filtros.
- **Componentes novos**:
  - `src/components/PdfDropzone.tsx`
  - `src/components/StatsCards.tsx`
  - `src/components/DebtorsTable.tsx` (com busca, ordenação)
  - `src/lib/pdfParser.ts` (lógica pura, testável)
- **Teste**: um teste vitest em `src/lib/pdfParser.test.ts` validando parse de uma string de exemplo.
- **Tema**: paleta clara minimalista — fundo branco, cinza neutro, acento azul discreto. Tipografia Inter (system fallback).

## Sobre o PDF de Exemplo

Você indicou que vai enviar um PDF modelo. Recomendo anexá-lo logo após aprovar este plano — assim eu calibro as regex com o layout real antes de finalizar. Se o padrão for muito diferente do assumido (ex: unidade em formato "Apto 1201" ou tabela com colunas), eu ajusto o parser sem mudar a estrutura geral.

## Persistência (fase futura, fora desta entrega)

Quando o parser estiver validado, podemos conectar seu Supabase externo para:
- Salvar histórico de relatórios processados.
- Comparar inadimplência mês a mês.
- Login para múltiplos usuários do condomínio.

Isso será uma segunda etapa, depois que a extração estiver 100% precisa.
