import type { DiagnosticResult } from "@/domain/diagnostic/types";
import type { Rational } from "@/domain/money/rational";
import { normalizeRational } from "@/domain/money/rational";
import type { Result } from "@/domain/result";
import type {
  ScenarioAssumptions,
  ScenarioValidationError,
} from "@/domain/scenarios/types";

const ASSUMPTION_ERRORS = {
  replacementSalary: "O salário de reposição deve ser maior que zero.",
  employerChargesRate: "A taxa de encargos não pode ser negativa.",
  monthlyRevenueLoss: "A perda de receita mensal não pode ser negativa.",
};

const isRational = (value: unknown): value is Rational =>
  typeof value === "object" &&
  value !== null &&
  "numerator" in value &&
  "denominator" in value &&
  typeof value.numerator === "bigint" &&
  typeof value.denominator === "bigint" &&
  value.denominator !== BigInt(0);

export function validateScenarioInput(
  diagnostic: DiagnosticResult,
  assumptions: ScenarioAssumptions,
): Result<void, ScenarioValidationError[]> {
  const errors: ScenarioValidationError[] = [];
  const assumptionsInput = assumptions as unknown as
    | Record<string, unknown>
    | null;
  const assumptionFields = [
    {
      field: "assumptions.replacementSalary",
      key: "replacementSalary",
      minimum: "positive",
      message: ASSUMPTION_ERRORS.replacementSalary,
    },
    {
      field: "assumptions.employerChargesRate",
      key: "employerChargesRate",
      minimum: "nonnegative",
      message: ASSUMPTION_ERRORS.employerChargesRate,
    },
    {
      field: "assumptions.monthlyRevenueLoss",
      key: "monthlyRevenueLoss",
      minimum: "nonnegative",
      message: ASSUMPTION_ERRORS.monthlyRevenueLoss,
    },
  ] as const;

  for (const assumption of assumptionFields) {
    const value = assumptionsInput?.[assumption.key];
    if (!isRational(value)) {
      errors.push({
        field: assumption.field,
        message: "Informe um valor racional válido.",
      });
      continue;
    }

    const normalized = normalizeRational(value);
    if (
      assumption.minimum === "positive"
        ? normalized.numerator <= BigInt(0)
        : normalized.numerator < BigInt(0)
    ) {
      errors.push({
        field: assumption.field,
        message: assumption.message,
      });
    }
  }

  const diagnosticInput = diagnostic as DiagnosticResult | null;
  const stages = Array.isArray(diagnosticInput?.stages)
    ? diagnosticInput.stages
    : [];
  if (stages.length === 0) {
    errors.push({
      field: "diagnostic.stages",
      message: "O diagnóstico deve conter ao menos uma etapa.",
    });
  }

  const seenStageIds = new Set<string>();
  for (const [index, stage] of stages.entries()) {
    const stageInput = stage as unknown as Record<string, unknown> | null;
    const stageId = stageInput?.stageId;
    const normalizedStageId =
      typeof stageId === "string" ? stageId.trim() : undefined;
    if (
      normalizedStageId === undefined ||
      normalizedStageId.length === 0 ||
      seenStageIds.has(normalizedStageId)
    ) {
      errors.push({
        field: `diagnostic.stages[${index}].stageId`,
        message: "Cada etapa deve ter um identificador único.",
      });
    } else {
      seenStageIds.add(normalizedStageId);
    }

    const weeklyLimit = stageInput?.weeklyLimitHours;
    if (!isRational(weeklyLimit)) {
      errors.push({
        field: `diagnostic.stages[${index}].weeklyLimitHours`,
        message: "O dado do diagnóstico deve ser um valor racional válido.",
      });
    } else if (normalizeRational(weeklyLimit).numerator <= BigInt(0)) {
      errors.push({
        field: `diagnostic.stages[${index}].weeklyLimitHours`,
        message: "A jornada semanal da etapa deve ser maior que zero.",
      });
    }

    const deficit = stageInput?.deficitPersonHours;
    if (!isRational(deficit)) {
      errors.push({
        field: `diagnostic.stages[${index}].deficitPersonHours`,
        message: "O dado do diagnóstico deve ser um valor racional válido.",
      });
    } else if (normalizeRational(deficit).numerator < BigInt(0)) {
      errors.push({
        field: `diagnostic.stages[${index}].deficitPersonHours`,
        message: "O déficit de horas deve ser não negativo.",
      });
    }

    const hourlyCosts = stageInput?.hourlyCostByLocalId;
    const hourlyCostEntries =
      typeof hourlyCosts === "object" &&
      hourlyCosts !== null &&
      !Array.isArray(hourlyCosts)
        ? Object.entries(hourlyCosts)
        : [];
    if (hourlyCostEntries.length === 0) {
      errors.push({
        field: `diagnostic.stages[${index}].hourlyCostByLocalId`,
        message: "A etapa deve conter ao menos um custo-hora.",
      });
    } else {
      for (const [localId, hourlyCost] of hourlyCostEntries) {
        const field = `diagnostic.stages[${index}].hourlyCostByLocalId.${localId}`;
        if (!isRational(hourlyCost)) {
          errors.push({
            field,
            message: "O dado do diagnóstico deve ser um valor racional válido.",
          });
        } else if (normalizeRational(hourlyCost).numerator <= BigInt(0)) {
          errors.push({
            field,
            message: "O custo-hora deve ser maior que zero.",
          });
        }
      }
    }
  }

  return errors.length > 0
    ? { ok: false, error: errors }
    : { ok: true, value: undefined };
}
