import { describe, it, expect } from "vitest";
import { debtorKey, planDebtMerge } from "./debtMerge";

describe("debtorKey", () => {
  it("ignora maiúsculas/minúsculas e espaços extras", () => {
    expect(debtorKey("12 01", "MARIA JOSE  DA SILVA")).toBe(
      debtorKey("12 01", "maria jose da silva")
    );
  });

  it("diferencia unidades diferentes com o mesmo nome", () => {
    expect(debtorKey("12 01", "JOÃO")).not.toBe(debtorKey("13 01", "JOÃO"));
  });
});

describe("planDebtMerge", () => {
  const atuais = [
    { unidade: "12 01", nome: "MARIA JOSE DA SILVA", total: 300 },
    { unidade: "13 01", nome: "CAIQUE VIEIRA", total: 11466.24 },
  ];

  it("sobrescreve as dívidas existentes e cria apenas as novas", () => {
    const novos = [
      { unidade: "12 01", nome: "maria jose da silva", total: 450 },
      { unidade: "14 01", nome: "PAULO GOMES", total: 172.91 },
    ];

    const plano = planDebtMerge(atuais, novos);

    expect(plano.atualizados).toHaveLength(1);
    expect(plano.atualizados[0].anterior.total).toBe(300);
    expect(plano.atualizados[0].novo.total).toBe(450);

    expect(plano.criados).toHaveLength(1);
    expect(plano.criados[0].nome).toBe("PAULO GOMES");

    // Dívida que não existe mais no novo PDF é removida.
    expect(plano.removidos).toHaveLength(1);
    expect(plano.removidos[0].nome).toBe("CAIQUE VIEIRA");
  });

  it("não cria duplicata quando o PDF traz o mesmo morador duas vezes", () => {
    const novos = [
      { unidade: "12 01", nome: "MARIA JOSE DA SILVA", total: 300 },
      { unidade: "12 01", nome: "MARIA JOSE DA SILVA", total: 300 },
    ];

    const plano = planDebtMerge(atuais, novos);

    expect(plano.atualizados).toHaveLength(1);
    expect(plano.criados).toHaveLength(0);
    expect(plano.removidos).toHaveLength(1);
    expect(plano.removidos[0].nome).toBe("CAIQUE VIEIRA");
  });

  it("não marca nada quando o novo PDF é igual ao anterior", () => {
    const plano = planDebtMerge(atuais, [
      { unidade: "12 01", nome: "MARIA JOSE DA SILVA", total: 300 },
      { unidade: "13 01", nome: "CAIQUE VIEIRA", total: 11466.24 },
    ]);

    expect(plano.criados).toHaveLength(0);
    expect(plano.removidos).toHaveLength(0);
    expect(plano.atualizados).toHaveLength(2);
  });
});
