import { describe, expect, it } from "vitest";
import {
  chaveMorador,
  normalizarTexto,
  removerSufixoNotificacao,
} from "./chaveMorador";

describe("removerSufixoNotificacao", () => {
  it("remove o sufixo de notificação", () => {
    expect(removerSufixoNotificacao("JANAINA CABRAL DE SOUZA   3° Notificação")).toBe(
      "JANAINA CABRAL DE SOUZA"
    );
  });

  it("remove sufixos com 1o/2ª/Notif.", () => {
    expect(removerSufixoNotificacao("MARIA  1o Notif.")).toBe("MARIA");
    expect(removerSufixoNotificacao("MARIA 2ª notificação")).toBe("MARIA");
  });

  it("mantém nomes sem sufixo", () => {
    expect(removerSufixoNotificacao("MARIA JOSE DA SILVA")).toBe("MARIA JOSE DA SILVA");
  });
});

describe("normalizarTexto", () => {
  it("remove acentos e normaliza espaços", () => {
    expect(normalizarTexto("  Iara  Araújo de Brito ")).toBe("iara araujo de brito");
  });
});

describe("chaveMorador", () => {
  it("ignora caixa, acentos, espaços extras e sufixo de notificação", () => {
    const esperado = chaveMorador("01 14", "JANAINA CABRAL DE SOUZA");
    expect(chaveMorador("01 14", "janaína cabral de souza")).toBe(esperado);
    expect(chaveMorador("01 14", "JANAINA  CABRAL DE SOUZA")).toBe(esperado);
    expect(chaveMorador("01 14", "JANAINA CABRAL DE SOUZA   3° Notificação")).toBe(esperado);
  });

  it("diferencia unidades diferentes com o mesmo nome", () => {
    expect(chaveMorador("12 01", "JOÃO")).not.toBe(chaveMorador("13 01", "JOÃO"));
  });
});
