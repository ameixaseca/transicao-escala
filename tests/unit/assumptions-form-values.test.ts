import { describe, expect, it } from "vitest";
import { parseDiagnosticForm, type DiagnosticFormValues } from "@/features/assumptions/form-values";
import { PROVISIONAL_LEGAL_PARAMETERS } from "@/domain/legal/legal-parameters";

const validValues: DiagnosticFormValues = {
  referenceDate: "2026-12-16",
  employees: [{
    localId: "person-1",
    salary: "2.200,50",
    weeklyHours: "42",
    contractType: "full-time",
  }],
  coverage: [{
    rowId: "coverage-1",
    weekday: "1",
    startTime: "09:00",
    endTime: "18:00",
    minimumPeople: "1",
  }],
};

const parse = (values: DiagnosticFormValues = validValues) =>
  parseDiagnosticForm(values, PROVISIONAL_LEGAL_PARAMETERS);

const errorFields = (result: ReturnType<typeof parse>): string[] => {
  if (result.ok) throw new Error("Expected form parsing to fail.");
  return result.error.map(({ field }) => field);
};

describe("parseDiagnosticForm", () => {
  it("parses exact salary and hour rationals, time minutes, and local IDs", () => {
    const result = parse();

    expect(result).toEqual({
      ok: true,
      value: {
        referenceDate: "2026-12-16",
        employees: [{
          localId: "person-1",
          salary: { numerator: BigInt(4401), denominator: BigInt(2) },
          weeklyHours: { numerator: BigInt(42), denominator: BigInt(1) },
          contractType: "full-time",
        }],
        coverage: [{
          weekday: 1,
          startMinute: 540,
          endMinute: 1080,
          minimumPeople: 1,
        }],
        legalParameters: PROVISIONAL_LEGAL_PARAMETERS,
      },
    });
  });

  it("preserves fractional hours and salary without floating-point conversion", () => {
    const result = parse({
      ...validValues,
      employees: [{
        ...validValues.employees[0],
        salary: "0.001,25",
        weeklyHours: "42,75",
      }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.employees[0].salary).toEqual({
      numerator: BigInt(5),
      denominator: BigInt(4),
    });
    expect(result.value.employees[0].weeklyHours).toEqual({
      numerator: BigInt(171),
      denominator: BigInt(4),
    });
  });

  it("accumulates malformed decimal, time, weekday, and minimum-people errors", () => {
    const result = parse({
      ...validValues,
      employees: [{
        ...validValues.employees[0],
        salary: "22,00.50",
        weeklyHours: "forty",
      }],
      coverage: [{
        ...validValues.coverage[0],
        weekday: "7",
        startTime: "9:00",
        endTime: "18:60",
        minimumPeople: "0",
      }],
    });

    expect(errorFields(result)).toEqual([
      "employees[0].salary",
      "employees[0].weeklyHours",
      "coverage[0].weekday",
      "coverage[0].startTime",
      "coverage[0].endTime",
      "coverage[0].minimumPeople",
    ]);
  });

  it("reports an invalid civil date through domain validation", () => {
    const result = parse({ ...validValues, referenceDate: "2026-02-29" });

    expect(errorFields(result)).toEqual(["referenceDate"]);
  });

  it.each([
    ["0", "44"],
    ["-1", "44"],
    ["2200", "0"],
    ["2200", "-1"],
  ])("relies on domain validation to reject non-positive salary %s and hours %s", (salary, weeklyHours) => {
    const result = parse({
      ...validValues,
      employees: [{ ...validValues.employees[0], salary, weeklyHours }],
    });

    expect(errorFields(result)).toEqual(
      [
        ...(salary === "0" || salary === "-1" ? ["employees[0].salary"] : []),
        ...(weeklyHours === "0" || weeklyHours === "-1" ? ["employees[0].weeklyHours"] : []),
      ],
    );
  });

  it("allows 24:00 only as an end time", () => {
    const validEnd = parse({
      ...validValues,
      coverage: [{ ...validValues.coverage[0], endTime: "24:00" }],
    });
    const invalidStart = parse({
      ...validValues,
      coverage: [{ ...validValues.coverage[0], startTime: "24:00" }],
    });

    expect(validEnd.ok).toBe(true);
    if (validEnd.ok) expect(validEnd.value.coverage[0].endMinute).toBe(1440);
    expect(errorFields(invalidStart)).toContain("coverage[0].startTime");
  });

  it("maps domain interval errors back to the form time fields", () => {
    const result = parse({
      ...validValues,
      coverage: [{
        ...validValues.coverage[0],
        startTime: "18:00",
        endTime: "09:00",
      }],
    });

    expect(errorFields(result)).toEqual(["coverage[0].endTime"]);
  });

  it("rejects empty employee and coverage groups", () => {
    const result = parse({ ...validValues, employees: [], coverage: [] });

    expect(errorFields(result)).toEqual(["employees", "coverage"]);
  });
});
