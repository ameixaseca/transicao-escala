import { PROVISIONAL_LEGAL_PARAMETERS } from "@/domain/legal/legal-parameters";
import type { DiagnosticValidationError } from "@/domain/diagnostic/types";
import type { Result } from "@/domain/result";
import {
  parseDiagnosticForm,
  type DiagnosticFormValues,
} from "@/features/assumptions/form-values";
import type { PersistableAssumptions } from "@/features/local-data/local-data-store";

export function toPersistableAssumptions(
  values: DiagnosticFormValues,
  legalParameterVersion: string,
  savedAt: string,
): Result<PersistableAssumptions, DiagnosticValidationError[]> {
  const parsed = parseDiagnosticForm(values, PROVISIONAL_LEGAL_PARAMETERS);
  if (!parsed.ok) return parsed;

  return {
    ok: true,
    value: {
      schemaVersion: 1,
      savedAt,
      assumptions: {
        employeeRows: values.employees.map((employee) => ({
          localId: employee.localId,
          salaryDecimal: employee.salary,
          weeklyHoursDecimal: employee.weeklyHours,
          contractType: employee.contractType,
        })),
        coverage: parsed.value.coverage,
        referenceDate: parsed.value.referenceDate,
        legalParameterVersion,
      },
    },
  };
}

const formatMinute = (minute: number): string =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(
    minute % 60,
  ).padStart(2, "0")}`;

export function fromPersistableAssumptions(
  value: PersistableAssumptions,
): DiagnosticFormValues {
  return {
    referenceDate: value.assumptions.referenceDate,
    employees: value.assumptions.employeeRows.map((employee) => ({
      localId: employee.localId,
      salary: employee.salaryDecimal,
      weeklyHours: employee.weeklyHoursDecimal,
      contractType: employee.contractType,
    })),
    coverage: value.assumptions.coverage.map((row, index) => ({
      rowId: `coverage-${index + 1}`,
      weekday: String(row.weekday),
      startTime: formatMinute(row.startMinute),
      endTime: formatMinute(row.endMinute),
      minimumPeople: String(row.minimumPeople),
    })),
  };
}
