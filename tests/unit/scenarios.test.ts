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

  it.each([
    ["null", null],
    ["array", []],
    ["string", "invalid"],
  ])("rejects a malformed top-level compliance map (%s)", (_description, checksByStage) => {
    const assumptions = {
      ...validAssumptions(),
      checksByStage,
    } as unknown as ScenarioAssumptions;

    expect(validateScenarioInput(scenarioDiagnostic(), assumptions)).toEqual(
      errorFor(
        "assumptions.checksByStage",
        "Informe um mapa válido de verificações de conformidade.",
      ),
    );
  });

  it.each([
    ["null", null],
    ["array", []],
    ["string", "invalid"],
  ])("rejects a malformed stage compliance map (%s)", (_description, stageChecks) => {
    const assumptions = {
      ...validAssumptions(),
      checksByStage: { "phase-1": stageChecks },
    } as unknown as ScenarioAssumptions;

    expect(validateScenarioInput(scenarioDiagnostic(), assumptions)).toEqual(
      errorFor(
        "assumptions.checksByStage.phase-1",
        "Informe um mapa válido de verificações de conformidade.",
      ),
    );
  });

  it.each([
    ["unsupported status", "verified", "assumptions.checksByStage.phase-1.weeklyRest"],
    ["null status", null, "assumptions.checksByStage.phase-1.weeklyRest"],
    ["unknown check key", "valid", "assumptions.checksByStage.phase-1.weeklyRset"],
  ])("rejects a malformed compliance check: %s", (_description, status, field) => {
    const assumptions = {
      ...validAssumptions(),
      checksByStage: {
        "phase-1": {
          ...allValidChecks(),
          ...(field.endsWith("weeklyRset")
            ? { weeklyRset: status }
            : { weeklyRest: status }),
        },
      },
    } as unknown as ScenarioAssumptions;
    const message = field.endsWith("weeklyRset")
      ? "A verificação de conformidade informada é desconhecida."
      : "Informe um status válido para a verificação de conformidade.";

    expect(validateScenarioInput(scenarioDiagnostic(), assumptions)).toEqual(
      errorFor(field, message),
    );
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

    it("returns one ordered group per diagnostic stage", () => {
      const diagnostic = scenarioDiagnostic();
      const result = simulateScenarios({
        ...diagnostic,
        stages: [
          diagnostic.stages[0],
          { ...diagnostic.stages[0], stageId: "phase-2" },
          { ...diagnostic.stages[0], stageId: "phase-3" },
        ],
      }, {
        ...validAssumptions(),
        checksByStage: {
          "phase-1": allValidChecks(),
          "phase-2": allValidChecks(),
          "phase-3": allValidChecks(),
        },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.map((stage) => stage.stageId)).toEqual([
        "phase-1", "phase-2", "phase-3",
      ]);
      expect(result.value.every((stage) => stage.scenarios.length === 4)).toBe(true);
    });

    it("selects the stable first scenario when all four costs tie", () => {
      const diagnostic = scenarioDiagnostic(rational(40), 1, rational(1, 3));
      diagnostic.stages[0].weeklyLimitHours = rational(40);
      const assumptions: ScenarioAssumptions = {
        replacementSalary: rational(100),
        employerChargesRate: rational(0),
        monthlyRevenueLoss: rational(100),
        checksByStage: { "phase-1": allValidChecks() },
      };

      const result = simulateScenarios(diagnostic, assumptions);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value[0].scenarios.map((scenario) => scenario.monthlyCost))
        .toEqual([rational(100), rational(100), rational(100), rational(100)]);
      expect(result.value[0].recommendedScenarioId).toBe("hire-full-time");
      expect(result.value[0].scenarios.map((scenario) => scenario.recommended))
        .toEqual([true, false, false, false]);
    });

    it("breaks ties by overtime hours before scenario id rank", () => {
      const result = simulateScenarios(scenarioDiagnostic(), {
        ...validAssumptions(),
        employerChargesRate: rational(1, 2),
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const costsById = Object.fromEntries(
        result.value[0].scenarios.map((scenario) => [scenario.id, scenario.monthlyCost]),
      );
      expect(costsById).toEqual({
        "hire-full-time": rational(3150),
        "hire-part-time": rational(900),
        overtime: rational(900),
        "reduce-hours": rational(1500),
      });
      expect(result.value[0].recommendedScenarioId).toBe("hire-part-time");
    });

    it("uses scenario id rank for remaining exact ties after cost and overtime ties", () => {
      const result = simulateScenarios(
        scenarioDiagnostic(rational(12), 4, rational(20)),
        {
          ...validAssumptions(),
          monthlyRevenueLoss: rational(960),
        },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const costsById = Object.fromEntries(
        result.value[0].scenarios.map((scenario) => [scenario.id, scenario.monthlyCost]),
      );
      expect(costsById).toEqual({
        "hire-full-time": rational(3360),
        "hire-part-time": rational(960),
        overtime: rational(1800),
        "reduce-hours": rational(960),
      });
      expect(result.value[0].recommendedScenarioId).toBe("hire-part-time");
    });

    it("does not recommend a scenario with unknown or invalid checks", () => {
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
      expect(incomplete.value[0].scenarios.every(
        (scenario) => scenario.feasibility === "incomplete",
      )).toBe(true);
      expect(incomplete.value[0].scenarios.every((scenario) =>
        scenario.reasons.some((reason) => reason.includes("repouso semanal")),
      )).toBe(true);
      expect(incomplete.value[0].recommendedScenarioId).toBeNull();
      expect(invalid.value[0].scenarios.every(
        (scenario) => scenario.feasibility === "infeasible",
      )).toBe(true);
      expect(invalid.value[0].scenarios.every((scenario) =>
        scenario.reasons.some((reason) => reason.includes("repouso semanal")),
      )).toBe(true);
      expect(invalid.value[0].recommendedScenarioId).toBeNull();
    });

    it("keeps omitted compliance data incomplete and without a recommendation", () => {
      const { checksByStage: _checksByStage, ...assumptions } = validAssumptions();
      const result = simulateScenarios(
        scenarioDiagnostic(),
        assumptions as ScenarioAssumptions,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value[0].scenarios.every(
        (scenario) => scenario.feasibility === "incomplete",
      )).toBe(true);
      expect(result.value[0].recommendedScenarioId).toBeNull();
    });

    it("includes explicit reason labels for every unknown compliance check", () => {
      const result = simulateScenarios(scenarioDiagnostic(), {
        ...validAssumptions(),
        checksByStage: {
          "phase-1": {
            ...allValidChecks(),
            interShiftRest: "unknown",
            mealBreaks: "unknown",
            salaryPreservation: "unknown",
          },
        },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const reasons = result.value[0].scenarios[0].reasons;
      expect(reasons).toContain("Verificação pendente: intervalo entre jornadas.");
      expect(reasons).toContain("Verificação pendente: intervalo intrajornada.");
      expect(reasons).toContain("Verificação pendente: preservação salarial.");
    });

    it("marks every option not-needed when the diagnostic has no deficit", () => {
      const result = simulateScenarios(scenarioDiagnostic(rational(0)), validAssumptions());
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value[0].scenarios.map((scenario) => scenario.feasibility))
        .toEqual(["not-needed", "not-needed", "not-needed", "not-needed"]);
      expect(result.value[0].scenarios.map((scenario) => scenario.monthlyCost))
        .toEqual([rational(0), rational(0), rational(0), rational(1500)]);
      expect(result.value[0].recommendedScenarioId).toBeNull();
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
