import type { Rational } from "@/domain/money/rational";

export type ScenarioId =
  | "hire-full-time"
  | "hire-part-time"
  | "overtime"
  | "reduce-hours";

export type ScenarioCheckId =
  | "dailySchedule"
  | "weeklyRest"
  | "interShiftRest"
  | "mealBreaks"
  | "salaryPreservation";

export type ScenarioCheckStatus = "valid" | "invalid" | "unknown";

export type ScenarioAssumptions = {
  replacementSalary: Rational;
  employerChargesRate: Rational;
  monthlyRevenueLoss: Rational;
  checksByStage: Partial<
    Record<string, Partial<Record<ScenarioCheckId, ScenarioCheckStatus>>>
  >;
};

export type ScenarioFeasibility =
  | "feasible"
  | "infeasible"
  | "incomplete"
  | "not-needed";

export type ScenarioResult = {
  id: ScenarioId;
  monthlyCost: Rational;
  feasibility: ScenarioFeasibility;
  reasons: string[];
  recommended: boolean;
  weeklyOvertimeHours: Rational;
};

export type ScenarioStageResult = {
  stageId: string;
  scenarios: ScenarioResult[];
  recommendedScenarioId: ScenarioId | null;
};

export type ScenarioValidationError = {
  field: string;
  message: string;
};
