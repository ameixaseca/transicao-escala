import { isDateOnly } from "@/domain/dates/date-only";
import type { Result } from "@/domain/result";
import type {
  DiagnosticInput,
  DiagnosticValidationError,
} from "./types";

const isPositiveRational = (numerator: bigint, denominator: bigint): boolean =>
  denominator !== BigInt(0) &&
  (numerator < BigInt(0)) === (denominator < BigInt(0)) &&
  numerator !== BigInt(0);

export const validateDiagnosticInput = (
  input: DiagnosticInput,
): Result<void, DiagnosticValidationError[]> => {
  const errors: DiagnosticValidationError[] = [];

  if (input.employees.length === 0) {
    errors.push({
      field: "employees",
      message: "Informe ao menos uma pessoa na equipe.",
    });
  }

  const localIds = new Set<string>();
  input.employees.forEach((employee, index) => {
    const localId = employee.localId.trim();
    if (!localId || localIds.has(localId)) {
      errors.push({
        field: `employees[${index}].localId`,
        message: "O identificador local da pessoa deve ser único e não vazio.",
      });
    } else {
      localIds.add(localId);
    }

    if (!isPositiveRational(employee.salary.numerator, employee.salary.denominator)) {
      errors.push({
        field: `employees[${index}].salary`,
        message:
          employee.salary.denominator === BigInt(0)
            ? "Informe um valor racional válido para o salário."
            : "O salário deve ser maior que zero.",
      });
    }

    if (
      !isPositiveRational(
        employee.weeklyHours.numerator,
        employee.weeklyHours.denominator,
      )
    ) {
      errors.push({
        field: `employees[${index}].weeklyHours`,
        message:
          employee.weeklyHours.denominator === BigInt(0)
            ? "Informe um valor racional válido para a jornada semanal."
            : "A jornada semanal deve ser maior que zero.",
      });
    }
  });

  if (!isDateOnly(input.referenceDate)) {
    errors.push({
      field: "referenceDate",
      message: "Informe uma data válida no formato AAAA-MM-DD.",
    });
  }

  input.coverage.forEach((coverage, index) => {
    if (
      !Number.isInteger(coverage.weekday) ||
      coverage.weekday < 0 ||
      coverage.weekday > 6
    ) {
      errors.push({
        field: `coverage[${index}].weekday`,
        message: "O dia da semana deve estar entre 0 e 6.",
      });
    }

    if (
      !Number.isInteger(coverage.startMinute) ||
      coverage.startMinute < 0 ||
      coverage.startMinute > 1440
    ) {
      errors.push({
        field: `coverage[${index}].startMinute`,
        message: "O início deve estar entre 0 e 1440 minutos.",
      });
    }

    if (
      !Number.isInteger(coverage.endMinute) ||
      coverage.endMinute < 0 ||
      coverage.endMinute > 1440 ||
      coverage.endMinute <= coverage.startMinute
    ) {
      errors.push({
        field: `coverage[${index}].endMinute`,
        message: "O fim deve estar após o início e até 1440 minutos.",
      });
    }

    if (
      !Number.isInteger(coverage.minimumPeople) ||
      coverage.minimumPeople <= 0
    ) {
      errors.push({
        field: `coverage[${index}].minimumPeople`,
        message: "Informe uma quantidade mínima de pessoas maior que zero.",
      });
    }
  });

  return errors.length > 0
    ? { ok: false, error: errors }
    : { ok: true, value: undefined };
};
