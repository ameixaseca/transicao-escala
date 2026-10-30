import { describe, expect, it } from "vitest";
import { diagnosticCase } from "../fixtures/diagnostic-cases";
import { calculateDiagnostic } from "@/domain/diagnostic/calculate-diagnostic";
import { parseScenarioFormValues } from "@/features/scenarios/form-values";
import { simulateScenarios } from "@/domain/scenarios/simulate-scenarios";
import type { ScenarioCheckId } from "@/domain/scenarios/types";

const checkIds: ScenarioCheckId[] = [
  "dailySchedule",
  "weeklyRest",
  "interShiftRest",
  "mealBreaks",
  "salaryPreservation",
];

const validValues = {
  replacementSalary: "2.200,50",
  employerChargesPercent: "20",
  monthlyRevenueLoss: "1.234,56",
};

describe("parseScenarioFormValues", () => {
  it("parses Brazilian decimals exactly and converts the charge percentage to a rate", () => {
    const result = parseScenarioFormValues(
      validValues,
      ["phase-1", "phase-2"],
      { "phase-1": { weeklyRest: "valid" } },
    );

    expect(result).toEqual({
      ok: true,
      value: {
        replacementSalary: { numerator: BigInt(4401), denominator: BigInt(2) },
        employerChargesRate: { numerator: BigInt(1), denominator: BigInt(5) },
        monthlyRevenueLoss: { numerator: BigInt(30864), denominator: BigInt(25) },
        checksByStage: {
          "phase-1": {
            dailySchedule: "unknown",
            weeklyRest: "valid",
            interShiftRest: "unknown",
            mealBreaks: "unknown",
            salaryPreservation: "unknown",
          },
          "phase-2": {
            dailySchedule: "unknown",
            weeklyRest: "unknown",
            interShiftRest: "unknown",
            mealBreaks: "unknown",
            salaryPreservation: "unknown",
          },
        },
      },
    });
  });

  it.each([
    ["replacementSalary", { ...validValues, replacementSalary: "inválido" }],
    ["employerChargesPercent", { ...validValues, employerChargesPercent: "20%" }],
    ["monthlyRevenueLoss", { ...validValues, monthlyRevenueLoss: "" }],
  ])("returns a field error for malformed %s text", (field, values) => {
    const result = parseScenarioFormValues(values, ["phase-1"], {});

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual([
      expect.objectContaining({ field, message: expect.any(String) }),
    ]);
  });

  it("does not duplicate semantic money constraints from the scenario domain", () => {
    const diagnostic = calculateDiagnostic(diagnosticCase());
    expect(diagnostic.ok).toBe(true);
    if (!diagnostic.ok) return;

    const semanticCases = [
      {
        values: { ...validValues, replacementSalary: "0" },
        field: "assumptions.replacementSalary",
        message: "O salário de reposição deve ser maior que zero.",
      },
      {
        values: { ...validValues, employerChargesPercent: "-1" },
        field: "assumptions.employerChargesRate",
        message: "A taxa de encargos não pode ser negativa.",
      },
      {
        values: { ...validValues, monthlyRevenueLoss: "-1" },
        field: "assumptions.monthlyRevenueLoss",
        message: "A perda de receita mensal não pode ser negativa.",
      },
    ];

    for (const { values, field, message } of semanticCases) {
      const parsed = parseScenarioFormValues(values, ["phase-1"], {});
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) continue;

      const simulation = simulateScenarios(diagnostic.value, parsed.value);
      expect(simulation).toEqual({
        ok: false,
        error: [{ field, message }],
      });
    }
  });

  it("uses only the supported compliance check IDs", () => {
    const result = parseScenarioFormValues(validValues, ["phase-1"], {});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.value.checksByStage["phase-1"] ?? {})).toEqual(checkIds);
  });

  it("keeps all scenarios incomplete and unrecommended when checks are unknown", () => {
    const diagnostic = calculateDiagnostic(diagnosticCase());
    expect(diagnostic.ok).toBe(true);
    if (!diagnostic.ok) return;
    const parsed = parseScenarioFormValues(
      validValues,
      diagnostic.value.stages.map((stage) => stage.stageId),
      {},
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = simulateScenarios(diagnostic.value, parsed.value);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.every((stage) => stage.recommendedScenarioId === null)).toBe(true);
    expect(result.value.flatMap((stage) => stage.scenarios).every((scenario) =>
      scenario.feasibility === "incomplete" && !scenario.recommended,
    )).toBe(true);
  });
});
