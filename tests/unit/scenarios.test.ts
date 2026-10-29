import { describe, expect, it } from "vitest";
import type { DiagnosticResult } from "@/domain/diagnostic/types";
import { add, type Rational } from "@/domain/money/rational";
import type { ScenarioAssumptions } from "@/domain/scenarios/types";
import { simulateScenarios } from "@/domain/scenarios/simulate-scenarios";
import { validateScenarioInput } from "@/domain/scenarios/validate-scenario-input";

const rational = (numerator: number, denominator = 1): Rational => ({
  numerator: BigInt(numerator),
  denominator: BigInt(denominator),
});

const allValidChecks = () => ({
  dailySchedule: "valid" as const,
  weeklyRest: "valid" as const,
  interShiftRest: "valid" as const,
  mealBreaks: "valid" as const,
  salaryPreservation: "valid" as const,
});

const scenarioDiagnostic = (
  deficit = rational(12),
  employeeCount = 4,
  hourlyCost = rational(10),
): DiagnosticResult => ({
  referenceDate: "2026-12-16",
  legalParameterVersion: "hypothetical-ec141-test",
  stages: [{
    stageId: "phase-1",
    weeklyLimitHours: rational(42),
    availableHours: rational(168),
    requiredPersonHours: add(rational(168), deficit),
    deficitPersonHours: deficit,
    hourlyCostByLocalId: Object.fromEntries(
      Array.from({ length: employeeCount }, (_, index) => [
        `person-${index + 1}`,
        hourlyCost,
      ]),
    ),
  }],
});

const validAssumptions = (): ScenarioAssumptions => ({
  replacementSalary: rational(2100),
  employerChargesRate: rational(3, 5),
  monthlyRevenueLoss: rational(1500),
  checksByStage: { "phase-1": allValidChecks() },
});

const errorFor = (field: string, message: string) => ({
  ok: false,
  error: [{ field, message }],
});

describe("validateScenarioInput", () => {
  it("accepts valid scenario assumptions and diagnostic data", () => {
    expect(validateScenarioInput(scenarioDiagnostic(), validAssumptions())).toEqual({
      ok: true,
      value: undefined,
    });
  });

  describe("simulateScenarios", () => {
    it("calculates the PRD example costs with stable scenario order", () => {
      const result = simulateScenarios(scenarioDiagnostic(), validAssumptions());
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value[0].scenarios.map((scenario) => scenario.id)).toEqual([
        "hire-full-time",
        "hire-part-time",
        "overtime",
        "reduce-hours",
      ]);

      const costsById = Object.fromEntries(
        result.value[0].scenarios.map((scenario) => [scenario.id, scenario.monthlyCost]),
      );
      expect(costsById).toEqual({
        "hire-full-time": rational(3360),
        "hire-part-time": rational(960),
        overtime: rational(900),
        "reduce-hours": rational(1500),
      });
      expect(result.value[0].recommendedScenarioId).toBe("overtime");
    });

    it("keeps the part-time scenario feasible when ceil contracts cover large deficits", () => {
      const result = simulateScenarios(scenarioDiagnostic(rational(65)), validAssumptions());
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const partTime = result.value[0].scenarios.find(
        (scenario) => scenario.id === "hire-part-time",
      );
      expect(partTime).toMatchObject({
        feasibility: "feasible",
        monthlyCost: rational(5200),
      });
    });

    it("enforces the overtime daily limit boundary exactly", () => {
      const accepted = simulateScenarios(
        scenarioDiagnostic(rational(20), 2, rational(10)),
        validAssumptions(),
      );
      const rejected = simulateScenarios(
        scenarioDiagnostic(rational(30), 2, rational(10)),
        validAssumptions(),
      );

      expect(accepted.ok).toBe(true);
      expect(rejected.ok).toBe(true);
      if (!accepted.ok || !rejected.ok) return;

      const acceptedOvertime = accepted.value[0].scenarios.find(
        (scenario) => scenario.id === "overtime",
      );
      const rejectedOvertime = rejected.value[0].scenarios.find(
        (scenario) => scenario.id === "overtime",
      );

      expect(acceptedOvertime).toMatchObject({ feasibility: "feasible" });
      expect(rejectedOvertime?.feasibility).toBe("infeasible");
      expect(rejectedOvertime?.reasons).toContain(
        "Exigiria 3 horas extras por dia por funcionário; o limite é 2.",
      );
    });

    it("applies incomplete and invalid compliance states to every scenario", () => {
      const incomplete = simulateScenarios(scenarioDiagnostic(), {
        ...validAssumptions(),
        checksByStage: {},
      });
      const invalid = simulateScenarios(scenarioDiagnostic(), {
        ...validAssumptions(),
        checksByStage: {
          "phase-1": { ...allValidChecks(), weeklyRest: "invalid" },
        },
      });

      expect(incomplete.ok).toBe(true);
      expect(invalid.ok).toBe(true);
      if (!incomplete.ok || !invalid.ok) return;

      expect(incomplete.value[0].scenarios.every((scenario) => scenario.feasibility === "incomplete")).toBe(true);
      expect(
        incomplete.value[0].scenarios.every((scenario) =>
          scenario.reasons.some((reason) => reason.includes("repouso semanal")),
        ),
      ).toBe(true);
      expect(incomplete.value[0].recommendedScenarioId).toBeNull();

      expect(invalid.value[0].scenarios.every((scenario) => scenario.feasibility === "infeasible")).toBe(true);
      expect(
        invalid.value[0].scenarios.every((scenario) =>
          scenario.reasons.some((reason) => reason.includes("repouso semanal")),
        ),
      ).toBe(true);
      expect(invalid.value[0].recommendedScenarioId).toBeNull();
    });
  });

  it("accepts zero charge rate and zero monthly revenue loss", () => {
    expect(
      validateScenarioInput(scenarioDiagnostic(), {
        ...validAssumptions(),
        employerChargesRate: rational(0),
        monthlyRevenueLoss: rational(0),
      }),
    ).toEqual({ ok: true, value: undefined });
  });

  it.each([
    [rational(0), "O salário de reposição deve ser maior que zero."],
    [rational(-1), "O salário de reposição deve ser maior que zero."],
    [
      { numerator: BigInt(2100), denominator: BigInt(0) },
      "Informe um valor racional válido.",
    ],
  ])("rejects replacement salary %s", (replacementSalary, message) => {
    expect(
      validateScenarioInput(scenarioDiagnostic(), {
        ...validAssumptions(),
        replacementSalary,
      }),
    ).toEqual(errorFor("assumptions.replacementSalary", message));
  });

  it.each([
    [rational(-1), "A taxa de encargos não pode ser negativa."],
    [
      { numerator: BigInt(3), denominator: BigInt(0) },
      "Informe um valor racional válido.",
    ],
  ])("rejects employer charge rate %s", (employerChargesRate, message) => {
    expect(
      validateScenarioInput(scenarioDiagnostic(), {
        ...validAssumptions(),
        employerChargesRate,
      }),
    ).toEqual(errorFor("assumptions.employerChargesRate", message));
  });

  it.each([
    [rational(-1), "A perda de receita mensal não pode ser negativa."],
    [
      { numerator: BigInt(1500), denominator: BigInt(0) },
      "Informe um valor racional válido.",
    ],
  ])("rejects monthly revenue loss %s", (monthlyRevenueLoss, message) => {
    expect(
      validateScenarioInput(scenarioDiagnostic(), {
        ...validAssumptions(),
        monthlyRevenueLoss,
      }),
    ).toEqual(errorFor("assumptions.monthlyRevenueLoss", message));
  });

  it("rejects an empty stage list", () => {
    expect(
      validateScenarioInput({ ...scenarioDiagnostic(), stages: [] }, validAssumptions()),
    ).toEqual(
      errorFor("diagnostic.stages", "O diagnóstico deve conter ao menos uma etapa."),
    );
  });

  it.each([
    ["", 1, 0],
    ["   ", 1, 0],
    ["phase-1", 2, 1],
  ])("rejects an empty or duplicate stage ID (%s)", (stageId, count, errorIndex) => {
    const diagnostic = scenarioDiagnostic();
    const stage = { ...diagnostic.stages[0], stageId };
    const stages = Array.from({ length: count }, () => ({ ...stage }));

    expect(
      validateScenarioInput({ ...diagnostic, stages }, validAssumptions()),
    ).toEqual(
      errorFor(
        `diagnostic.stages[${errorIndex}].stageId`,
        "Cada etapa deve ter um identificador único.",
      ),
    );
  });

  it.each([
    [rational(0), "A jornada semanal da etapa deve ser maior que zero."],
    [rational(-1), "A jornada semanal da etapa deve ser maior que zero."],
    [
      { numerator: BigInt(42), denominator: BigInt(0) },
      "O dado do diagnóstico deve ser um valor racional válido.",
    ],
  ])("rejects a weekly limit %s", (weeklyLimitHours, message) => {
    const diagnostic = scenarioDiagnostic();
    const [stage] = diagnostic.stages;

    expect(
      validateScenarioInput(
        { ...diagnostic, stages: [{ ...stage, weeklyLimitHours }] },
        validAssumptions(),
      ),
    ).toEqual(errorFor("diagnostic.stages[0].weeklyLimitHours", message));
  });

  it.each([
    [rational(-1), "O déficit de horas deve ser não negativo."],
    [
      { numerator: BigInt(12), denominator: BigInt(0) },
      "O dado do diagnóstico deve ser um valor racional válido.",
    ],
  ])("rejects a deficit %s", (deficitPersonHours, message) => {
    const diagnostic = scenarioDiagnostic();
    const [stage] = diagnostic.stages;

    expect(
      validateScenarioInput(
        { ...diagnostic, stages: [{ ...stage, deficitPersonHours }] },
        validAssumptions(),
      ),
    ).toEqual(errorFor("diagnostic.stages[0].deficitPersonHours", message));
  });

  it("rejects an empty hourly-cost map", () => {
    const diagnostic = scenarioDiagnostic(rational(0), 0);

    expect(validateScenarioInput(diagnostic, validAssumptions())).toEqual(
      errorFor(
        "diagnostic.stages[0].hourlyCostByLocalId",
        "A etapa deve conter ao menos um custo-hora.",
      ),
    );
  });

  it.each([
    [rational(0), "O custo-hora deve ser maior que zero."],
    [
      { numerator: BigInt(10), denominator: BigInt(0) },
      "O dado do diagnóstico deve ser um valor racional válido.",
    ],
  ])("rejects an hourly cost %s", (hourlyCost, message) => {
    const diagnostic = scenarioDiagnostic(rational(12), 1, hourlyCost);

    expect(validateScenarioInput(diagnostic, validAssumptions())).toEqual(
      errorFor(`diagnostic.stages[0].hourlyCostByLocalId.person-1`, message),
    );
  });

  it("collects errors in stable assumption and stage order", () => {
    const diagnostic = scenarioDiagnostic();
    const secondStage = {
      ...diagnostic.stages[0],
      stageId: "phase-2",
      weeklyLimitHours: { numerator: BigInt(42), denominator: BigInt(0) },
    };

    expect(
      validateScenarioInput(
        {
          ...diagnostic,
          stages: [
            { ...diagnostic.stages[0], deficitPersonHours: rational(-1) },
            secondStage,
          ],
        },
        {
          ...validAssumptions(),
          replacementSalary: rational(0),
          employerChargesRate: rational(-1),
          monthlyRevenueLoss: rational(-1),
        },
      ),
    ).toEqual({
      ok: false,
      error: [
        {
          field: "assumptions.replacementSalary",
          message: "O salário de reposição deve ser maior que zero.",
        },
        {
          field: "assumptions.employerChargesRate",
          message: "A taxa de encargos não pode ser negativa.",
        },
        {
          field: "assumptions.monthlyRevenueLoss",
          message: "A perda de receita mensal não pode ser negativa.",
        },
        {
          field: "diagnostic.stages[0].deficitPersonHours",
          message: "O déficit de horas deve ser não negativo.",
        },
        {
          field: "diagnostic.stages[1].weeklyLimitHours",
          message: "O dado do diagnóstico deve ser um valor racional válido.",
        },
      ],
    });
  });
});
