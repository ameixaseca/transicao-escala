import { validateDiagnosticInput } from "@/domain/diagnostic/validate-diagnostic-input";
import type {
  DiagnosticInput,
  DiagnosticValidationError,
  EmployeeAssumption,
  CoverageAssumption,
} from "@/domain/diagnostic/types";
import type { LegalParameters } from "@/domain/legal/legal-parameters";
import { parseDecimal } from "@/domain/money/decimal";
import type { Rational } from "@/domain/money/rational";
import type { Result } from "@/domain/result";

export type EmployeeFormValue = {
  localId: string;
  salary: string;
  weeklyHours: string;
  contractType: "full-time" | "part-time";
};

export type CoverageFormValue = {
  rowId: string;
  weekday: string;
  startTime: string;
  endTime: string;
  minimumPeople: string;
};

export type DiagnosticFormValues = {
  referenceDate: string;
  employees: EmployeeFormValue[];
  coverage: CoverageFormValue[];
};

const readDecimal = (
  text: string,
  field: string,
  errors: DiagnosticValidationError[],
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

const readTime = (
  text: string,
  field: string,
  isEndTime: boolean,
  errors: DiagnosticValidationError[],
): number | undefined => {
  if (isEndTime && text === "24:00") return 1440;

  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text);
  if (!match) {
    errors.push({
      field,
      message: isEndTime
        ? "Informe um horário válido entre 00:00 e 24:00."
        : "Informe um horário válido entre 00:00 e 23:59.",
    });
    return undefined;
  }

  return Number(match[1]) * 60 + Number(match[2]);
};

const readBoundedInteger = (
  text: string,
  field: string,
  errors: DiagnosticValidationError[],
): number | undefined => {
  if (!/^(0|[1-9]\d*)$/.test(text)) {
    errors.push({
      field,
      message: "Informe um número inteiro não negativo.",
    });
    return undefined;
  }

  const value = Number(text);
  if (!Number.isSafeInteger(value)) {
    errors.push({
      field,
      message: "Informe um número inteiro dentro do limite permitido.",
    });
    return undefined;
  }

  return value;
};

export function parseDiagnosticForm(
  values: DiagnosticFormValues,
  legalParameters: LegalParameters,
): Result<DiagnosticInput, DiagnosticValidationError[]> {
  const errors: DiagnosticValidationError[] = [];

  if (values.employees.length === 0) {
    errors.push({
      field: "employees",
      message: "Informe ao menos uma pessoa na equipe.",
    });
  }
  if (values.coverage.length === 0) {
    errors.push({
      field: "coverage",
      message: "Informe ao menos uma faixa de cobertura.",
    });
  }

  const employees: EmployeeAssumption[] = [];
  values.employees.forEach((employee, index) => {
    const salary = readDecimal(employee.salary, `employees[${index}].salary`, errors);
    const weeklyHours = readDecimal(
      employee.weeklyHours,
      `employees[${index}].weeklyHours`,
      errors,
    );
    if (salary === undefined || weeklyHours === undefined) return;

    employees.push({
      localId: employee.localId,
      salary,
      weeklyHours,
      contractType: employee.contractType,
    });
  });

  const coverage: CoverageAssumption[] = [];
  values.coverage.forEach((row, index) => {
    const weekday = readBoundedInteger(
      row.weekday,
      `coverage[${index}].weekday`,
      errors,
    );
    if (weekday !== undefined && weekday > 6) {
      errors.push({
        field: `coverage[${index}].weekday`,
        message: "O dia da semana deve estar entre 0 e 6.",
      });
    }
    const startMinute = readTime(
      row.startTime,
      `coverage[${index}].startTime`,
      false,
      errors,
    );
    const endMinute = readTime(
      row.endTime,
      `coverage[${index}].endTime`,
      true,
      errors,
    );
    const minimumPeople = readBoundedInteger(
      row.minimumPeople,
      `coverage[${index}].minimumPeople`,
      errors,
    );
    if (minimumPeople !== undefined && minimumPeople < 1) {
      errors.push({
        field: `coverage[${index}].minimumPeople`,
        message: "Informe uma quantidade mínima de pessoas maior que zero.",
      });
    }

    if (
      weekday === undefined ||
      startMinute === undefined ||
      endMinute === undefined ||
      minimumPeople === undefined
    ) {
      return;
    }

    coverage.push({ weekday, startMinute, endMinute, minimumPeople });
  });

  if (errors.length > 0) return { ok: false, error: errors };

  const input: DiagnosticInput = {
    referenceDate: values.referenceDate,
    employees,
    coverage,
    legalParameters,
  };
  const validation = validateDiagnosticInput(input);
  if (!validation.ok) {
    return {
      ok: false,
      error: validation.error.map((error) => ({
        ...error,
        field: error.field
          .replace(/^coverage\[(\d+)\]\.startMinute$/, "coverage[$1].startTime")
          .replace(/^coverage\[(\d+)\]\.endMinute$/, "coverage[$1].endTime"),
      })),
    };
  }

  return { ok: true, value: input };
}
