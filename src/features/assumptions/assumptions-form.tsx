"use client";

import type { FormEvent } from "react";
import { ErrorSummary, fieldIdFor, type FieldError } from "@/components/error-summary";
import type {
  CoverageFormValue,
  DiagnosticFormValues,
  EmployeeFormValue,
} from "@/features/assumptions/form-values";

type AssumptionsFormProps = {
  values: DiagnosticFormValues;
  onChange: (values: DiagnosticFormValues) => void;
  onSubmit: (values: DiagnosticFormValues) => void;
  errors: ReadonlyArray<FieldError>;
};

const normalizeErrorField = (field: string): string =>
  field
    .replace(/^(coverage\[\d+\])\.startMinute$/, "$1.startTime")
    .replace(/^(coverage\[\d+\])\.endMinute$/, "$1.endTime");

const nextLocalId = (prefix: string, ids: string[]): string => {
  let suffix = 1;
  while (ids.includes(`${prefix}-${suffix}`)) suffix += 1;
  return `${prefix}-${suffix}`;
};

export function AssumptionsForm({
  values,
  onChange,
  onSubmit,
  errors,
}: AssumptionsFormProps) {
  const mappedErrors = errors.map((error, index) => ({
    ...error,
    field: normalizeErrorField(error.field),
    id: `${fieldIdFor(normalizeErrorField(error.field))}-error-${index}`,
  }));
  const summaryErrors = mappedErrors.map(({ field, message }) => ({ field, message }));

  const controlAttributes = (field: string) => {
    const fieldErrors = mappedErrors.filter((error) => error.field === field);
    return {
      id: fieldIdFor(field),
      "aria-invalid": fieldErrors.length > 0,
      ...(fieldErrors.length > 0
        ? { "aria-describedby": fieldErrors.map(({ id }) => id).join(" ") }
        : {}),
    };
  };

  const renderFieldErrors = (field: string) => (
    <>
      {mappedErrors
        .filter((error) => error.field === field)
        .map((error) => (
          <p id={error.id} key={error.id}>
            {error.message}
          </p>
        ))}
    </>
  );

  const updateEmployee = (
    index: number,
    update: Partial<EmployeeFormValue>,
  ) => {
    onChange({
      ...values,
      employees: values.employees.map((employee, employeeIndex) =>
        employeeIndex === index ? { ...employee, ...update } : employee,
      ),
    });
  };

  const updateCoverage = (
    index: number,
    update: Partial<CoverageFormValue>,
  ) => {
    onChange({
      ...values,
      coverage: values.coverage.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...update } : row,
      ),
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={submit}>
      <ErrorSummary errors={summaryErrors} />

      <div>
        <label htmlFor={fieldIdFor("referenceDate")}>Data de referência</label>
        <input
          {...controlAttributes("referenceDate")}
          type="date"
          value={values.referenceDate}
          onChange={(event) =>
            onChange({ ...values, referenceDate: event.target.value })
          }
        />
        {renderFieldErrors("referenceDate")}
      </div>

      <fieldset>
        <legend>Equipe</legend>
        {values.employees.map((employee, index) => {
          const label = `Pessoa ${index + 1}`;
          const salaryField = `employees[${index}].salary`;
          const hoursField = `employees[${index}].weeklyHours`;
          const contractField = `employees[${index}].contractType`;

          return (
            <fieldset key={employee.localId}>
              <legend>{label}</legend>
              <div>
                <label htmlFor={fieldIdFor(salaryField)}>
                  Salário mensal — {label}
                </label>
                <input
                  {...controlAttributes(salaryField)}
                  type="text"
                  inputMode="decimal"
                  value={employee.salary}
                  onChange={(event) =>
                    updateEmployee(index, { salary: event.target.value })
                  }
                />
                {renderFieldErrors(salaryField)}
              </div>
              <div>
                <label htmlFor={fieldIdFor(hoursField)}>
                  Horas semanais — {label}
                </label>
                <input
                  {...controlAttributes(hoursField)}
                  type="text"
                  inputMode="decimal"
                  value={employee.weeklyHours}
                  onChange={(event) =>
                    updateEmployee(index, { weeklyHours: event.target.value })
                  }
                />
                {renderFieldErrors(hoursField)}
              </div>
              <div>
                <label htmlFor={fieldIdFor(contractField)}>
                  Tipo de contrato — {label}
                </label>
                <select
                  {...controlAttributes(contractField)}
                  value={employee.contractType}
                  onChange={(event) =>
                    updateEmployee(index, {
                      contractType: event.target.value as EmployeeFormValue["contractType"],
                    })
                  }
                >
                  <option value="full-time">Tempo integral</option>
                  <option value="part-time">Tempo parcial</option>
                </select>
                {renderFieldErrors(contractField)}
              </div>
              <button
                type="button"
                disabled={values.employees.length <= 1}
                onClick={() =>
                  onChange({
                    ...values,
                    employees: values.employees.filter(
                      (_, employeeIndex) => employeeIndex !== index,
                    ),
                  })
                }
                aria-label={`Remover ${label}`}
              >
                Remover
              </button>
            </fieldset>
          );
        })}
        <button
          type="button"
          onClick={() =>
            onChange({
              ...values,
              employees: [
                ...values.employees,
                {
                  localId: nextLocalId(
                    "person",
                    values.employees.map(({ localId }) => localId),
                  ),
                  salary: "",
                  weeklyHours: "",
                  contractType: "full-time",
                },
              ],
            })
          }
        >
          Adicionar pessoa
        </button>
      </fieldset>

      <fieldset>
        <legend>Cobertura</legend>
        {values.coverage.map((row, index) => {
          const label = `Faixa ${index + 1}`;
          const weekdayField = `coverage[${index}].weekday`;
          const startField = `coverage[${index}].startTime`;
          const endField = `coverage[${index}].endTime`;
          const minimumField = `coverage[${index}].minimumPeople`;

          return (
            <fieldset key={row.rowId}>
              <legend>{label}</legend>
              <div>
                <label htmlFor={fieldIdFor(weekdayField)}>
                  Dia da semana — {label}
                </label>
                <select
                  {...controlAttributes(weekdayField)}
                  value={row.weekday}
                  onChange={(event) =>
                    updateCoverage(index, { weekday: event.target.value })
                  }
                >
                  <option value="0">Domingo</option>
                  <option value="1">Segunda-feira</option>
                  <option value="2">Terça-feira</option>
                  <option value="3">Quarta-feira</option>
                  <option value="4">Quinta-feira</option>
                  <option value="5">Sexta-feira</option>
                  <option value="6">Sábado</option>
                </select>
                {renderFieldErrors(weekdayField)}
              </div>
              <div>
                <label htmlFor={fieldIdFor(startField)}>Início — {label}</label>
                <input
                  {...controlAttributes(startField)}
                  type="text"
                  inputMode="numeric"
                  placeholder="09:00"
                  value={row.startTime}
                  onChange={(event) =>
                    updateCoverage(index, { startTime: event.target.value })
                  }
                />
                {renderFieldErrors(startField)}
              </div>
              <div>
                <label htmlFor={fieldIdFor(endField)}>Fim — {label}</label>
                <input
                  {...controlAttributes(endField)}
                  type="text"
                  inputMode="numeric"
                  placeholder="18:00"
                  value={row.endTime}
                  onChange={(event) =>
                    updateCoverage(index, { endTime: event.target.value })
                  }
                />
                {renderFieldErrors(endField)}
              </div>
              <div>
                <label htmlFor={fieldIdFor(minimumField)}>
                  Pessoas mínimas — {label}
                </label>
                <input
                  {...controlAttributes(minimumField)}
                  type="text"
                  inputMode="numeric"
                  value={row.minimumPeople}
                  onChange={(event) =>
                    updateCoverage(index, { minimumPeople: event.target.value })
                  }
                />
                {renderFieldErrors(minimumField)}
              </div>
              <button
                type="button"
                disabled={values.coverage.length <= 1}
                onClick={() =>
                  onChange({
                    ...values,
                    coverage: values.coverage.filter(
                      (_, rowIndex) => rowIndex !== index,
                    ),
                  })
                }
                aria-label={`Remover ${label}`}
              >
                Remover
              </button>
            </fieldset>
          );
        })}
        <button
          type="button"
          onClick={() =>
            onChange({
              ...values,
              coverage: [
                ...values.coverage,
                {
                  rowId: nextLocalId(
                    "coverage",
                    values.coverage.map(({ rowId }) => rowId),
                  ),
                  weekday: "1",
                  startTime: "09:00",
                  endTime: "18:00",
                  minimumPeople: "1",
                },
              ],
            })
          }
        >
          Adicionar faixa
        </button>
      </fieldset>

      <button type="submit">Continuar</button>
    </form>
  );
}
