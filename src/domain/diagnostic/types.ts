import type { LegalParameters } from "@/domain/legal/legal-parameters";
import type { Rational } from "@/domain/money/rational";

export type EmployeeAssumption = {
  localId: string;
  salary: Rational;
  weeklyHours: Rational;
  contractType: "full-time" | "part-time";
};

export type CoverageAssumption = {
  weekday: number;
  startMinute: number;
  endMinute: number;
  minimumPeople: number;
};

export type DiagnosticInput = {
  employees: EmployeeAssumption[];
  coverage: CoverageAssumption[];
  referenceDate: string;
  legalParameters: LegalParameters;
};

export type DiagnosticStageResult = {
  stageId: string;
  weeklyLimitHours: Rational;
  availableHours: Rational;
  requiredPersonHours: Rational;
  deficitPersonHours: Rational;
  hourlyCostByLocalId: Record<string, Rational>;
};

export type DiagnosticResult = {
  referenceDate: string;
  legalParameterVersion: string;
  stages: DiagnosticStageResult[];
};

export type DiagnosticValidationError = {
  field: string;
  message: string;
};
