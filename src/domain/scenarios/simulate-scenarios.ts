import type { DiagnosticResult } from "@/domain/diagnostic/types";
import { add, divide, multiply, normalizeRational, type Rational } from "@/domain/money/rational";
import type { Result } from "@/domain/result";
import type {
  ScenarioAssumptions,
  ScenarioCheckId,
  ScenarioFeasibility,
  ScenarioId,
  ScenarioResult,
  ScenarioStageResult,
  ScenarioValidationError,
} from "@/domain/scenarios/types";
import { validateScenarioInput } from "@/domain/scenarios/validate-scenario-input";

const ONE: Rational = { numerator: BigInt(1), denominator: BigInt(1) };
const TWO: Rational = { numerator: BigInt(2), denominator: BigInt(1) };
const THREE_HALVES: Rational = { numerator: BigInt(3), denominator: BigInt(2) };
const FIVE: Rational = { numerator: BigInt(5), denominator: BigInt(1) };
const THIRTY: Rational = { numerator: BigInt(30), denominator: BigInt(1) };
const ZERO: Rational = { numerator: BigInt(0), denominator: BigInt(1) };
const CHECK_ORDER: ScenarioCheckId[] = [
  "dailySchedule",
  "weeklyRest",
  "interShiftRest",
  "mealBreaks",
  "salaryPreservation",
];
const CHECK_LABELS: Record<ScenarioCheckId, string> = {
  dailySchedule: "jornada diária",
  weeklyRest: "repouso semanal",
  interShiftRest: "intervalo entre jornadas",
  mealBreaks: "intervalo intrajornada",
  salaryPreservation: "preservação salarial",
};
const SCENARIO_ORDER: ScenarioId[] = [
  "hire-full-time",
  "hire-part-time",
  "overtime",
  "reduce-hours",
];
const ID_RANK: Record<ScenarioId, number> = {
  "hire-full-time": 0,
  "hire-part-time": 1,
  overtime: 2,
  "reduce-hours": 3,
};

const ceilRatio = (numerator: bigint, denominator: bigint): bigint =>
  (numerator + denominator - BigInt(1)) / denominator;

const compare = (left: Rational, right: Rational): number => {
  const a = normalizeRational(left);
  const b = normalizeRational(right);
  const lhs = a.numerator * b.denominator;
  const rhs = b.numerator * a.denominator;
  if (lhs === rhs) return 0;
  return lhs < rhs ? -1 : 1;
};

const formatHoursForReason = (value: Rational): string => {
  const normalized = normalizeRational(value);
  const hundredths =
    (normalized.numerator * BigInt(100) * BigInt(2) + normalized.denominator) /
    (normalized.denominator * BigInt(2));
  const whole = hundredths / BigInt(100);
  const fraction = hundredths % BigInt(100);
  if (fraction === BigInt(0)) {
    return whole.toString();
  }
  return `${whole.toString()},${fraction.toString().padStart(2, "0")}`;
};

const compareScenarios = (left: ScenarioResult, right: ScenarioResult): number =>
  compare(left.monthlyCost, right.monthlyCost) ||
  compare(left.weeklyOvertimeHours, right.weeklyOvertimeHours) ||
  ID_RANK[left.id] - ID_RANK[right.id];

const checkFeasibility = (
  stageId: string,
  assumptions: ScenarioAssumptions,
  scenarioReasons: string[],
): { feasibility: ScenarioFeasibility; reasons: string[] } => {
  const reasons = [...scenarioReasons];
  let hasInvalid = false;
  let hasUnknown = false;
  const stageChecks = assumptions.checksByStage?.[stageId] ?? {};

  for (const checkId of CHECK_ORDER) {
    const status = stageChecks[checkId] ?? "unknown";
    if (status === "invalid") {
      hasInvalid = true;
      reasons.push(`Violação de conformidade: ${CHECK_LABELS[checkId]}.`);
      continue;
    }
    if (status === "unknown") {
      hasUnknown = true;
      reasons.push(`Verificação pendente: ${CHECK_LABELS[checkId]}.`);
    }
  }

  if (hasInvalid || scenarioReasons.length > 0) {
    return { feasibility: "infeasible", reasons };
  }
  if (hasUnknown) {
    return { feasibility: "incomplete", reasons };
  }
  return { feasibility: "feasible", reasons };
};

export function simulateScenarios(
  diagnostic: DiagnosticResult,
  assumptions: ScenarioAssumptions,
): Result<ScenarioStageResult[], ScenarioValidationError[]> {
  const validation = validateScenarioInput(diagnostic, assumptions);
  if (!validation.ok) {
    return validation;
  }

  const chargeMultiplier = add(ONE, assumptions.employerChargesRate);
  const stages: ScenarioStageResult[] = diagnostic.stages.map((stage) => {
    const deficit = normalizeRational(stage.deficitPersonHours);
    const weeklyLimitHours = normalizeRational(stage.weeklyLimitHours);

    if (deficit.numerator === BigInt(0)) {
      const scenarios: ScenarioResult[] = SCENARIO_ORDER.map((id) => ({
        id,
        monthlyCost: id === "reduce-hours" ? assumptions.monthlyRevenueLoss : ZERO,
        feasibility: "not-needed",
        reasons: [],
        recommended: false,
        weeklyOvertimeHours: ZERO,
      }));
      return {
        stageId: stage.stageId,
        scenarios,
        recommendedScenarioId: null,
      };
    }

    const fullTimeCount = ceilRatio(
      deficit.numerator * weeklyLimitHours.denominator,
      deficit.denominator * weeklyLimitHours.numerator,
    );
    const fullTimeCost = multiply(
      { numerator: fullTimeCount, denominator: BigInt(1) },
      multiply(assumptions.replacementSalary, chargeMultiplier),
    );

    const partTimeCost = multiply(
      divide(deficit, weeklyLimitHours),
      multiply(assumptions.replacementSalary, chargeMultiplier),
    );

    const partTimeContractCount = ceilRatio(
      deficit.numerator,
      deficit.denominator * BigInt(30),
    );
    const partTimeCapacity = multiply(
      { numerator: partTimeContractCount, denominator: BigInt(1) },
      THIRTY,
    );
    const partTimeReasons: string[] = [];
    if (compare(partTimeCapacity, deficit) < 0) {
      partTimeReasons.push(
        "A contratação parcial não cobre o déficit semanal de horas da etapa.",
      );
    }

    const employeeCosts = Object.values(stage.hourlyCostByLocalId).map(normalizeRational);
    const hourlyCostSum = employeeCosts.reduce((sum, hourlyCost) => add(sum, hourlyCost), ZERO);
    const employeeCount = BigInt(employeeCosts.length);
    const averageHourlyCost = divide(hourlyCostSum, {
      numerator: employeeCount,
      denominator: BigInt(1),
    });
    const overtimeCost = multiply(
      deficit,
      multiply(FIVE, multiply(averageHourlyCost, THREE_HALVES)),
    );

    const dailyOvertime = divide(deficit, {
      numerator: employeeCount * BigInt(5),
      denominator: BigInt(1),
    });
    const overtimeReasons: string[] = [];
    if (compare(dailyOvertime, TWO) > 0) {
      overtimeReasons.push(
        `Exigiria ${formatHoursForReason(dailyOvertime)} horas extras por dia por funcionário; o limite é 2.`,
      );
    }

    const scenarioDrafts: Record<ScenarioId, Omit<ScenarioResult, "feasibility" | "reasons" | "recommended"> & { reasons: string[] }> = {
      "hire-full-time": {
        id: "hire-full-time",
        monthlyCost: fullTimeCost,
        weeklyOvertimeHours: ZERO,
        reasons: [],
      },
      "hire-part-time": {
        id: "hire-part-time",
        monthlyCost: partTimeCost,
        weeklyOvertimeHours: ZERO,
        reasons: partTimeReasons,
      },
      overtime: {
        id: "overtime",
        monthlyCost: overtimeCost,
        weeklyOvertimeHours: deficit,
        reasons: overtimeReasons,
      },
      "reduce-hours": {
        id: "reduce-hours",
        monthlyCost: assumptions.monthlyRevenueLoss,
        weeklyOvertimeHours: ZERO,
        reasons: [],
      },
    };

    const scenarios: ScenarioResult[] = SCENARIO_ORDER.map((id): ScenarioResult => {
      const draft = scenarioDrafts[id];
      const { feasibility, reasons } = checkFeasibility(
        stage.stageId,
        assumptions,
        draft.reasons,
      );
      return {
        id: draft.id,
        monthlyCost: normalizeRational(draft.monthlyCost),
        feasibility,
        reasons,
        recommended: false,
        weeklyOvertimeHours: normalizeRational(draft.weeklyOvertimeHours),
      };
    });

    const feasibleScenarios = scenarios
      .filter((scenario) => scenario.feasibility === "feasible")
      .sort(compareScenarios);
    const recommendedScenarioId = feasibleScenarios[0]?.id ?? null;
    for (const scenario of scenarios) {
      scenario.recommended = scenario.id === recommendedScenarioId;
    }

    return {
      stageId: stage.stageId,
      scenarios,
      recommendedScenarioId,
    };
  });

  return { ok: true, value: stages };
}
