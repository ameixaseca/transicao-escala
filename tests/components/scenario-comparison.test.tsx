import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ScenarioFormValues } from "@/features/scenarios/form-values";
import { ScenarioComparison } from "@/features/scenarios/scenario-comparison";
import type {
  ScenarioCheckId,
  ScenarioCheckStatus,
  ScenarioStageResult,
} from "@/domain/scenarios/types";

afterEach(cleanup);

const values: ScenarioFormValues = {
  replacementSalary: "2.200,50",
  employerChargesPercent: "20",
  monthlyRevenueLoss: "1.234,56",
};

const scenarioIds = [
  "hire-full-time",
  "hire-part-time",
  "overtime",
  "reduce-hours",
] as const;

const makeResults = (): ScenarioStageResult[] => [{
  stageId: "phase-1",
  recommendedScenarioId: "overtime",
  scenarios: [
    {
      id: scenarioIds[0],
      monthlyCost: { numerator: BigInt(1000), denominator: BigInt(1) },
      feasibility: "incomplete",
      reasons: ["Verificação pendente: repouso semanal."],
      recommended: false,
      weeklyOvertimeHours: { numerator: BigInt(0), denominator: BigInt(1) },
    },
    {
      id: scenarioIds[1],
      monthlyCost: { numerator: BigInt(2000), denominator: BigInt(1) },
      feasibility: "infeasible",
      reasons: ["A contratação parcial não cobre o déficit semanal de horas da etapa."],
      recommended: false,
      weeklyOvertimeHours: { numerator: BigInt(0), denominator: BigInt(1) },
    },
    {
      id: scenarioIds[2],
      monthlyCost: { numerator: BigInt(1500), denominator: BigInt(1) },
      feasibility: "feasible",
      reasons: [],
      recommended: true,
      weeklyOvertimeHours: { numerator: BigInt(0), denominator: BigInt(1) },
    },
    {
      id: scenarioIds[3],
      monthlyCost: { numerator: BigInt(0), denominator: BigInt(1) },
      feasibility: "not-needed",
      reasons: [],
      recommended: false,
      weeklyOvertimeHours: { numerator: BigInt(0), denominator: BigInt(1) },
    },
  ],
}];

describe("ScenarioComparison", () => {
  it("renders five controlled check groups per stage with unknown selected by default", () => {
    const onCheckChange = vi.fn();
    render(
      <ScenarioComparison
        values={values}
        stageIds={["phase-1", "phase-2"]}
        checksByStage={{ "phase-1": {}, "phase-2": {} }}
        results={null}
        errors={[]}
        onValuesChange={vi.fn()}
        onCheckChange={onCheckChange}
      />,
    );

    const stage = screen.getByRole("group", { name: "Verificações — Etapa 1" });
    const checkLabels = [
      "Jornada diária",
      "Repouso semanal",
      "Intervalo entre jornadas",
      "Intervalo intrajornada",
      "Preservação salarial",
    ];
    expect(within(stage).getAllByRole("group")).toHaveLength(5);
    for (const stageId of ["phase-1", "phase-2"]) {
      const stageChecks = screen.getByRole("group", {
        name: `Verificações — Etapa ${stageId.slice(-1)}`,
      });
      for (const label of checkLabels) {
        const group = within(stageChecks).getByRole("group", { name: label });
        expect(within(group).getByLabelText("Válido")).not.toBeChecked();
        expect(within(group).getByLabelText("Inválido")).not.toBeChecked();
        expect(within(group).getByLabelText("Não verificado")).toBeChecked();
      }
    }

    fireEvent.click(
      within(
        within(screen.getByRole("group", { name: "Verificações — Etapa 1" }))
          .getByRole("group", { name: "Jornada diária" }),
      )
        .getByLabelText("Inválido", { selector: "input" }),
    );
    expect(onCheckChange).toHaveBeenCalledWith(
      "phase-1",
      "dailySchedule",
      "invalid",
    );
  }, 15_000);

  it("reports financial input changes and displays parser and domain field errors", () => {
    const onValuesChange = vi.fn();
    render(
      <ScenarioComparison
        values={values}
        checksByStage={{}}
        results={null}
        errors={[
          {
            field: "replacementSalary",
            message: "Informe um número no formato brasileiro.",
          },
          {
            field: "assumptions.employerChargesRate",
            message: "A taxa de encargos não pode ser negativa.",
          },
        ]}
        onValuesChange={onValuesChange}
        onCheckChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Salário mensal de reposição"), {
      target: { value: "2.500,00" },
    });
    expect(onValuesChange).toHaveBeenCalledWith({
      ...values,
      replacementSalary: "2.500,00",
    });
    expect(screen.getByText("Informe um número no formato brasileiro.")).toBeInTheDocument();
    expect(screen.getByText("A taxa de encargos não pode ser negativa.")).toBeInTheDocument();
  });

  it("renders all four domain scenarios, exact displayed costs, reasons, feasibility, and only the recommended flag", () => {
    render(
      <ScenarioComparison
        values={values}
        stageIds={["phase-1"]}
        checksByStage={{
          "phase-1": {
            dailySchedule: "valid",
            weeklyRest: "unknown",
            interShiftRest: "valid",
            mealBreaks: "valid",
            salaryPreservation: "valid",
          },
        }}
        results={makeResults()}
        errors={[]}
        onValuesChange={vi.fn()}
        onCheckChange={vi.fn()}
      />,
    );

    const results = screen.getByRole("region", { name: "Resultados — Etapa 1" });
    for (const title of [
      "Contratar em tempo integral",
      "Contratar em tempo parcial",
      "Pagar horas extras",
      "Reduzir horas de operação",
    ]) {
      expect(within(results).getByText(title)).toBeInTheDocument();
    }
    for (const cost of ["R$ 1.000,00", "R$ 2.000,00", "R$ 1.500,00", "R$ 0,00"]) {
      expect(within(results).getByText(cost)).toBeInTheDocument();
    }
    for (const feasibility of ["Viável", "Inviável", "Incompleto", "Não necessário"]) {
      expect(within(results).getByText(feasibility)).toBeInTheDocument();
    }
    expect(
      within(results).getByText(
        "A contratação parcial não cobre o déficit semanal de horas da etapa.",
      ),
    ).toBeInTheDocument();
    expect(
      within(results).getByText("Verificação pendente: repouso semanal."),
    ).toBeInTheDocument();
    expect(within(results).getAllByText(/Recomendado/)).toHaveLength(1);
    expect(within(results).getByText("Pagar horas extras").closest("article"))
      .toHaveTextContent("Recomendado");
  });

  it("shows pending results without stage checks until a valid diagnostic is available", () => {
    render(
      <ScenarioComparison
        values={values}
        checksByStage={{}}
        results={null}
        errors={[]}
        onValuesChange={vi.fn()}
        onCheckChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Resultados pendentes.")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /Verificações/ })).not.toBeInTheDocument();
  });

  it("does not render a recommendation for incomplete results", () => {
    const results = makeResults();
    results[0].recommendedScenarioId = null;
    results[0].scenarios.forEach((scenario) => {
      scenario.recommended = false;
      scenario.feasibility = "incomplete";
    });

    render(
      <ScenarioComparison
        values={values}
        stageIds={["phase-1"]}
        checksByStage={{ "phase-1": {} }}
        results={results}
        errors={[]}
        onValuesChange={vi.fn()}
        onCheckChange={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Recomendado/)).not.toBeInTheDocument();
  });
});
