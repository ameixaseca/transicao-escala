import { parseDecimal } from "@/domain/money/decimal";
import { divide, type Rational } from "@/domain/money/rational";
import type { Result } from "@/domain/result";
import type {
  ScenarioAssumptions,
  ScenarioCheckId,
  ScenarioCheckStatus,
} from "@/domain/scenarios/types";

export type ScenarioFormParseError = {
  field: string;
  message: string;
};

export type ScenarioFormValues = {
  replacementSalary: string;
  employerChargesPercent: string;
  monthlyRevenueLoss: string;
};

const checkIds: ScenarioCheckId[] = [
  "dailySchedule",
  "weeklyRest",
  "interShiftRest",
  "mealBreaks",
  "salaryPreservation",
];

const readDecimal = (
  text: string,
  field: string,
  errors: ScenarioFormParseError[],
): Rational | undefined => {
  try {
    return parseDecimal(text);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    errors.push({
      field,
      message: "Informe um número no formato brasileiro, por exemplo 2.200,50.",
    });
    return undefined;
  }
};

export function parseScenarioFormValues(
  values: ScenarioFormValues,
  stageIds: string[],
  checksByStage: ScenarioAssumptions["checksByStage"],
): Result<ScenarioAssumptions, ScenarioFormParseError[]> {
  const errors: ScenarioFormParseError[] = [];
  const replacementSalary = readDecimal(
    values.replacementSalary,
    "replacementSalary",
    errors,
  );
  const employerChargesPercent = readDecimal(
    values.employerChargesPercent,
    "employerChargesPercent",
    errors,
  );
  const monthlyRevenueLoss = readDecimal(
    values.monthlyRevenueLoss,
    "monthlyRevenueLoss",
    errors,
  );

  if (errors.length > 0) return { ok: false, error: errors };

  const checks: ScenarioAssumptions["checksByStage"] = {};
  for (const stageId of stageIds) {
    const stageChecks: Partial<Record<ScenarioCheckId, ScenarioCheckStatus>> = {};
    for (const checkId of checkIds) {
      stageChecks[checkId] = checksByStage[stageId]?.[checkId] ?? "unknown";
    }
    checks[stageId] = stageChecks;
  }

  return {
    ok: true,
    value: {
      replacementSalary: replacementSalary!,
      employerChargesRate: divide(
        employerChargesPercent!,
        { numerator: BigInt(100), denominator: BigInt(1) },
      ),
      monthlyRevenueLoss: monthlyRevenueLoss!,
      checksByStage: checks,
    },
  };
}
