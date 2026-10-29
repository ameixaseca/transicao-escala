import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { calculateDiagnostic } from "@/domain/diagnostic/calculate-diagnostic";
import type { DiagnosticResult } from "@/domain/diagnostic/types";
import { PROVISIONAL_LEGAL_PARAMETERS } from "@/domain/legal/legal-parameters";
import { diagnosticCase } from "../fixtures/diagnostic-cases";
import { DiagnosticPanel } from "@/features/diagnostic/diagnostic-panel";

afterEach(cleanup);

const diagnosticResult = (): DiagnosticResult => {
  const result = calculateDiagnostic(diagnosticCase());
  if (!result.ok) throw new Error("The diagnostic fixture must be valid.");
  return result.value;
};

describe("DiagnosticPanel", () => {
  it("shows all three stage results with hours, deficits, and anonymous costs", () => {
    render(
      <DiagnosticPanel
        diagnostic={diagnosticResult()}
        legalParameters={PROVISIONAL_LEGAL_PARAMETERS}
      />,
    );

    const expectedStages = [
      {
        label: "Antes da etapa 1",
        limit: "44,00 h",
        available: "176,00 h",
        deficit: "4,00 h",
        cost: "R$ 10,00",
      },
      {
        label: "Etapa 1",
        limit: "42,00 h",
        available: "168,00 h",
        deficit: "12,00 h",
        cost: "R$ 10,48",
      },
      {
        label: "Etapa 2",
        limit: "40,00 h",
        available: "160,00 h",
        deficit: "20,00 h",
        cost: "R$ 11,00",
      },
    ];

    for (const stage of expectedStages) {
      const card = screen.getByRole("region", { name: stage.label });
      expect(within(card).getByText(stage.limit)).toBeInTheDocument();
      expect(within(card).getByText(stage.available)).toBeInTheDocument();
      expect(within(card).getByText("180,00 h")).toBeInTheDocument();
      expect(within(card).getByText(stage.deficit)).toBeInTheDocument();
      const costs = within(card).getAllByRole("listitem");
      expect(costs).toHaveLength(4);
      costs.forEach((cost, index) => {
        expect(cost.textContent?.replace(/\s+/g, " ").trim()).toBe(
          `Pessoa ${index + 1}: ${stage.cost}`,
        );
      });
      expect(card.textContent).not.toContain("person-1");
    }

    expect(
      screen.getByText(/Parâmetros legais\s+provisórios/),
    ).toBeInTheDocument();
    expect(screen.getByText(/hypothetical-ec141-test/)).toBeInTheDocument();
    expect(
      screen.getByText("GJ-04 permanece como bloqueador de lançamento."),
    ).toBeInTheDocument();
  });

  it("highlights the reference stage without hiding the other stage results", () => {
    render(
      <DiagnosticPanel
        diagnostic={diagnosticResult()}
        legalParameters={PROVISIONAL_LEGAL_PARAMETERS}
      />,
    );

    expect(
      screen.getByText("Etapa aplicável na data de referência: Antes da etapa 1"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Antes da etapa 1" }),
    ).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("region", { name: "Etapa 1" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Etapa 2" })).toBeInTheDocument();
  });

  it("shows an explicit unavailable state when the reference stage cannot be determined", () => {
    render(
      <DiagnosticPanel
        diagnostic={diagnosticResult()}
        legalParameters={{
          ...PROVISIONAL_LEGAL_PARAMETERS,
          publicationDate: null,
        }}
      />,
    );

    expect(screen.getByText("Etapa aplicável indisponível")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Antes da etapa 1" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Etapa 1" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Etapa 2" })).toBeInTheDocument();
  });

  it("shows a pending message when diagnostic data is missing", () => {
    render(
      <DiagnosticPanel
        diagnostic={null}
        legalParameters={PROVISIONAL_LEGAL_PARAMETERS}
      />,
    );

    expect(screen.getByText("Diagnóstico pendente.")).toBeInTheDocument();
  });
});
