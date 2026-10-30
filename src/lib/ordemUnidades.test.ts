import { describe, expect, it } from "vitest";
import {
  compararUnidades,
  ordenarPorUnidade,
  partesUnidade,
} from "./ordemUnidades";

describe("partesUnidade", () => {
  it("separa apartamento e bloco no padrão 'NN NN'", () => {
    expect(partesUnidade("04 09")).toEqual({ apartamento: 4, bloco: 9, valida: true });
  });

  it("aceita separadores alternativos", () => {
    expect(partesUnidade("12-01")).toEqual({ apartamento: 12, bloco: 1, valida: true });
  });

  it("interpreta unidade com 4 dígitos sem separador", () => {
    expect(partesUnidade("0409")).toEqual({ apartamento: 4, bloco: 9, valida: true });
  });

  it("trata número solto como bloco sem apartamento", () => {
    expect(partesUnidade("09")).toEqual({ apartamento: 0, bloco: 9, valida: true });
  });

  it("marca como inválida unidade sem dígitos", () => {
    expect(partesUnidade("").valida).toBe(false);
    expect(partesUnidade("sem numero").valida).toBe(false);
  });
});

describe("compararUnidades", () => {
  it("ordena pelo bloco antes do apartamento", () => {
    // "21 02" (bloco 02) vem antes de "01 09" (bloco 09)
    expect(compararUnidades("21 02", "01 09")).toBeLessThan(0);
  });

  it("dentro do mesmo bloco ordena pelo apartamento", () => {
    expect(compararUnidades("01 03", "04 03")).toBeLessThan(0);
    expect(compararUnidades("04 03", "01 03")).toBeGreaterThan(0);
  });

  it("trata unidades iguais como equivalentes", () => {
    expect(compararUnidades("04 09", "04 09")).toBe(0);
  });
});

describe("ordenarPorUnidade", () => {
  it("ordena por bloco e depois por apartamento", () => {
    const lista = [
      { unidade: "04 09" },
      { unidade: "01 02" },
      { unidade: "22 02" },
      { unidade: "04 02" },
      { unidade: "01 09" },
    ];

    expect(ordenarPorUnidade(lista).map((d) => d.unidade)).toEqual([
      "01 02",
      "04 02",
      "22 02",
      "01 09",
      "04 09",
    ]);
  });

  it("mantém o bloco 15 depois do 01", () => {
    const lista = [{ unidade: "01 15" }, { unidade: "05 01" }];
    expect(ordenarPorUnidade(lista).map((d) => d.unidade)).toEqual(["05 01", "01 15"]);
  });

  it("não descarta unidades inválidas e as coloca no fim", () => {
    const lista = [{ unidade: "invalida" }, { unidade: "01 02" }];
    const resultado = ordenarPorUnidade(lista).map((d) => d.unidade);
    expect(resultado).toHaveLength(2);
    expect(resultado[0]).toBe("01 02");
    expect(resultado[1]).toBe("invalida");
  });

  it("não altera o array original", () => {
    const lista = [{ unidade: "04 09" }, { unidade: "01 02" }];
    ordenarPorUnidade(lista);
    expect(lista.map((d) => d.unidade)).toEqual(["04 09", "01 02"]);
  });
});
