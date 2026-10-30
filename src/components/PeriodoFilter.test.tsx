import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PeriodoFilter } from "./PeriodoFilter";
import type { Periodo } from "@/lib/periodoFilter";

const periodos: Periodo[] = [
  { chave: "2025-06", label: "Junho/2025", ano: 2025, mes: 6, boletos: 3, total: 300 },
  { chave: "2025-05", label: "Maio/2025", ano: 2025, mes: 5, boletos: 2, total: 150 },
];

describe("PeriodoFilter", () => {
  it("renderiza o rótulo do filtro e o seletor de vencimento", () => {
    render(
      <PeriodoFilter
        periodos={periodos}
        value={null}
        onChange={() => {}}
      />
    );

    expect(screen.getByText("Vencimento (mês)")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("mantém o valor selecionado quando há um mês escolhido", () => {
    const { rerender } = render(
      <PeriodoFilter periodos={periodos} value={null} onChange={() => {}} />
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();

    rerender(
      <PeriodoFilter periodos={periodos} value="2025-05" onChange={() => {}} />
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
