import { describe, expect, it } from "vitest";
import {
  fromPersistableAssumptions,
  toPersistableAssumptions,
} from "@/features/local-data/form-values";
import type { DiagnosticFormValues } from "@/features/assumptions/form-values";

const validValues: DiagnosticFormValues = {
  referenceDate: "2026-12-16",
  employees: [
    {
      localId: "employee-local-42",
      salary: "98.765,43",
      weeklyHours: "42,75",
      contractType: "part-time",
    },
  ],
  coverage: [
    {
      rowId: "ui-row-a",
      weekday: "1",
      startTime: "08:15",
      endTime: "24:00",
      minimumPeople: "2",
    },
    {
      rowId: "ui-row-b",
      weekday: "5",
      startTime: "21:30",
      endTime: "23:59",
      minimumPeople: "1",
    },
  ],
};

describe("local data form values", () => {
  it("preserves exact decimal strings and employee IDs while mapping coverage minutes", () => {
    const saved = toPersistableAssumptions(
      validValues,
      "ec-141-provisional",
      "2026-10-29T12:00:00.000Z",
    );

    expect(saved).toEqual({
      ok: true,
      value: {
        schemaVersion: 1,
        savedAt: "2026-10-29T12:00:00.000Z",
        assumptions: {
          employeeRows: [
            {
              localId: "employee-local-42",
              salaryDecimal: "98.765,43",
              weeklyHoursDecimal: "42,75",
              contractType: "part-time",
            },
          ],
          coverage: [
            {
              weekday: 1,
              startMinute: 495,
              endMinute: 1440,
              minimumPeople: 2,
            },
            {
              weekday: 5,
              startMinute: 1290,
              endMinute: 1439,
              minimumPeople: 1,
            },
          ],
          referenceDate: "2026-12-16",
          legalParameterVersion: "ec-141-provisional",
        },
      },
    });

    if (!saved.ok) return;
    expect(fromPersistableAssumptions(saved.value)).toEqual({
      ...validValues,
      coverage: [
        { ...validValues.coverage[0], rowId: "coverage-1" },
        { ...validValues.coverage[1], rowId: "coverage-2" },
      ],
    });
  });

  it("rejects invalid diagnostic form values using the diagnostic parser errors", () => {
    const saved = toPersistableAssumptions(
      {
        ...validValues,
        employees: [{ ...validValues.employees[0], salary: "inválido" }],
      },
      "ec-141-provisional",
      "2026-10-29T12:00:00.000Z",
    );

    expect(saved).toEqual({
      ok: false,
      error: [
        {
          field: "employees[0].salary",
          message:
            "Informe um número no formato brasileiro, por exemplo 2.200,50.",
        },
      ],
    });
  });
});
