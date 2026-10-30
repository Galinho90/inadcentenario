import { describe, expect, it } from "vitest";
import {
  chavePeriodo,
  listarPeriodos,
  recortarPorPeriodo,
  rotuloPeriodo,
} from "./periodoFilter";
import type { Debtor } from "./pdfParser";

function devedor(
  nome: string,
  boletos: Array<{ vencimento: string; total: number }>
): Debtor {
  return {
    unidade: "12 01",
    nome,
    total: boletos.reduce((acc, b) => acc + b.total, 0),
    boletos: boletos.map((b) => ({
      vencimento: b.vencimento,
      atraso: 10,
      codigo: "123",
      principal: b.total,
      total: b.total,
    })),
  };
}

describe("chavePeriodo", () => {
  it("converte DD/MM/AA em AAAA-MM", () => {
    expect(chavePeriodo("25/12/25")).toBe("2025-12");
    expect(chavePeriodo("05/01/24")).toBe("2024-01");
    expect(chavePeriodo("01/06/2023")).toBe("2023-06");
  });

  it("devolve null para datas inválidas", () => {
    expect(chavePeriodo("")).toBeNull();
    expect(chavePeriodo("31/13/25")).toBeNull();
    expect(chavePeriodo("sem data")).toBeNull();
  });
});

describe("rotuloPeriodo", () => {
  it("formata o mês em português", () => {
    expect(rotuloPeriodo("2025-05")).toBe("Maio/2025");
    expect(rotuloPeriodo("2025-01")).toBe("Janeiro/2025");
  });
});

describe("listarPeriodos", () => {
  it("lista os meses do mais recente para o mais antigo com total e quantidade", () => {
    const periodos = listarPeriodos([
      devedor("A", [{ vencimento: "10/05/25", total: 100 }]),
      devedor("B", [
        { vencimento: "10/05/25", total: 50 },
        { vencimento: "10/06/25", total: 70 },
      ]),
    ]);

    expect(periodos.map((p) => p.chave)).toEqual(["2025-06", "2025-05"]);
    expect(periodos[1].boletos).toBe(2);
    expect(periodos[1].total).toBe(150);
  });
});

describe("recortarPorPeriodo", () => {
  const base = [
    devedor("A", [
      { vencimento: "10/05/25", total: 100 },
      { vencimento: "10/06/25", total: 70 },
    ]),
    devedor("B", [{ vencimento: "10/06/25", total: 30 }]),
  ];

  it("mantém apenas as taxas vencidas no mês escolhido", () => {
    const r = recortarPorPeriodo(base, "2025-05");

    expect(r.debtors).toHaveLength(1);
    expect(r.debtors[0].nome).toBe("A");
    expect(r.debtors[0].boletos).toHaveLength(1);
    expect(r.debtors[0].total).toBe(100);
    expect(r.total).toBe(100);
    expect(r.boletos).toBe(1);
  });

  it("sem filtro devolve a base inteira", () => {
    const r = recortarPorPeriodo(base, null);

    expect(r.debtors).toHaveLength(2);
    expect(r.total).toBe(200);
    expect(r.periodos).toHaveLength(2);
  });

  it("devolve recorte vazio quando o mês não existe na base", () => {
    const r = recortarPorPeriodo(base, "2024-01");

    expect(r.debtors).toHaveLength(0);
    expect(r.total).toBe(0);
  });
});
