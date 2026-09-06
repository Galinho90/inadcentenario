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
