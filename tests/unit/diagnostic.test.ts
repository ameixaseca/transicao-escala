import { describe, expect, it } from "vitest";
import { calculateDiagnostic } from "@/domain/diagnostic/calculate-diagnostic";
import type { Rational } from "@/domain/money/rational";
import { diagnosticCase } from "../fixtures/diagnostic-cases";

const rational = (numerator: number, denominator = 1): Rational => ({
  numerator: BigInt(numerator),
  denominator: BigInt(denominator),
});

const hourlyCosts = (cost: Rational): Record<string, Rational> =>
  Object.fromEntries(
    ["person-1", "person-2", "person-3", "person-4"].map((id) => [id, cost]),
  );

describe("calculateDiagnostic", () => {
  it("calculates required hours, capacity, and deficits for all stages", () => {
    const result = calculateDiagnostic(diagnosticCase());

    expect(result).toEqual({
      ok: true,
      value: {
        referenceDate: "2026-10-16",
        legalParameterVersion: "hypothetical-ec141-test",
        stages: [
          {
            stageId: "before-phase-1",
            weeklyLimitHours: rational(44),
            availableHours: rational(176),
            requiredPersonHours: rational(180),
            deficitPersonHours: rational(4),
            hourlyCostByLocalId: hourlyCosts(rational(10)),
          },
          {
            stageId: "phase-1",
            weeklyLimitHours: rational(42),
            availableHours: rational(168),
            requiredPersonHours: rational(180),
            deficitPersonHours: rational(12),
            hourlyCostByLocalId: hourlyCosts(rational(220, 21)),
          },
          {
            stageId: "phase-2",
            weeklyLimitHours: rational(40),
            availableHours: rational(160),
            requiredPersonHours: rational(180),
            deficitPersonHours: rational(20),
            hourlyCostByLocalId: hourlyCosts(rational(11)),
          },
        ],
      },
    });
  });

  it("returns zero deficits when required hours do not exceed stage capacity", () => {
    const input = diagnosticCase();
    input.coverage = input.coverage.map((coverage) => ({
      ...coverage,
      minimumPeople: 1,
    }));

    const result = calculateDiagnostic(input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.stages.map((stage) => stage.deficitPersonHours)).toEqual([
      rational(0),
      rational(0),
      rational(0),
    ]);
  });

  it("rejects an invalid reference date with the input validation error", () => {
    const input = { ...diagnosticCase(), referenceDate: "2026-02-29" };

    expect(calculateDiagnostic(input)).toEqual({
      ok: false,
      error: [
        {
          field: "referenceDate",
          message: "Informe uma data válida no formato AAAA-MM-DD.",
        },
      ],
    });
  });

  it.each([null, "2026-02-29"])(
    "rejects a missing or invalid legal publication date (%s)",
    (publicationDate) => {
      const input = {
        ...diagnosticCase(),
        legalParameters: {
          ...diagnosticCase().legalParameters,
          publicationDate,
        },
      };

      expect(calculateDiagnostic(input)).toEqual({
        ok: false,
        error: [
          {
            field: "legalParameters.publicationDate",
            message: "Não foi possível determinar as datas das etapas a partir dos parâmetros legais.",
          },
        ],
      });
    },
  );
});
