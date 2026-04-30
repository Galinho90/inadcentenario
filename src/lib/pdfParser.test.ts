import { describe, it, expect } from "vitest";
import { parseDebtors, parseBRL } from "./pdfParser";

describe("parseBRL", () => {
  it("converte valores BR", () => {
    expect(parseBRL("1.234,56")).toBe(1234.56);
    expect(parseBRL("99,90")).toBe(99.9);
    expect(parseBRL("11.466,24")).toBe(11466.24);
  });
});

describe("parseDebtors (formato Controller Condomínios)", () => {
  it("extrai unidades, nomes e totais", () => {
    const text = `
Inadimplentes
Posição em 12/01/2026
12 01 - MARIA JOSE DA SILVA
Vencimento Atraso Código Principal Total
25/12/25 18 131180 180,00 180,00
10/01/26 2 134433 120,00 120,00
Total 300,00 300,00
13 01 - CAIQUE VIEIRA DA SILVA
Vencimento Atraso Código Principal Total
24/05/25 233 75070 1.343,28 1.343,28
Total 11.466,24 11.466,24
14 01 - PAULO GOMES DA SILVA
Vencimento Atraso Código Principal Total
22/12/25 21 98596 172,91 172,91
Total 172,91 172,91
`;
    const result = parseDebtors(text);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      unidade: "12 01",
      nome: "MARIA JOSE DA SILVA",
      total: 300,
    });
    expect(result[1].nome).toBe("CAIQUE VIEIRA DA SILVA");
    expect(result[1].total).toBe(11466.24);
    expect(result[2].total).toBe(172.91);
  });

  it("ignora cabeçalhos sem nome válido", () => {
    const text = `12 01 - X\nTotal 100,00 100,00\n`;
    expect(parseDebtors(text)).toHaveLength(0);
  });
});
