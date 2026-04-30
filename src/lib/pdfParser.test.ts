import { describe, it, expect } from "vitest";
import { parseDebtors, parseBRL } from "./pdfParser";

describe("parseBRL", () => {
  it("converte valores BR", () => {
    expect(parseBRL("1.234,56")).toBe(1234.56);
    expect(parseBRL("99,90")).toBe(99.9);
  });
});

describe("parseDebtors", () => {
  it("extrai unidade, nome e total", () => {
    const text = `
12 01
João da Silva Souza
Vencimento 10/01/2026 Valor 500,00
Juros 20,00
Total 1.520,00

03 02
Maria Aparecida Pereira
Vencimento 10/01/2026 Valor 800,00
Total 890,50
`;
    const result = parseDebtors(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      unidade: "12 01",
      nome: "João da Silva Souza",
      total: 1520,
    });
    expect(result[1].nome).toBe("Maria Aparecida Pereira");
    expect(result[1].total).toBe(890.5);
  });
});
