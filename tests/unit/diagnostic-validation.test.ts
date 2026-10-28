import { describe, expect, it } from "vitest";
import { validateDiagnosticInput } from "@/domain/diagnostic/validate-diagnostic-input";
import { PROVISIONAL_LEGAL_PARAMETERS } from "@/domain/legal/legal-parameters";

const validInput = () => ({
  employees: [
    {
      localId: "person-1",
      salary: { numerator: BigInt(2100), denominator: BigInt(1) },
      weeklyHours: { numerator: BigInt(44), denominator: BigInt(1) },
      contractType: "full-time" as const,
    },
  ],
  coverage: [
    { weekday: 1, startMinute: 540, endMinute: 600, minimumPeople: 1 },
  ],
  referenceDate: "2026-10-16",
  legalParameters: PROVISIONAL_LEGAL_PARAMETERS,
});

describe("validateDiagnosticInput", () => {
  it("accepts valid assumptions without calculating diagnostic results", () => {
    expect(validateDiagnosticInput(validInput())).toEqual({ ok: true, value: undefined });
  });

  it("rejects an empty team with a stable field identifier", () => {
    const result = validateDiagnosticInput({ ...validInput(), employees: [] });

    expect(result).toEqual({
      ok: false,
      error: [
        {
          field: "employees",
          message: "Informe ao menos uma pessoa na equipe.",
        },
      ],
    });
  });

  it("rejects invalid dates and non-positive employee assumptions", () => {
    const input = {
      ...validInput(),
      referenceDate: "2026-02-29",
      employees: [
        {
          ...validInput().employees[0],
          salary: { numerator: BigInt(0), denominator: BigInt(1) },
          weeklyHours: { numerator: BigInt(-1), denominator: BigInt(1) },
        },
      ],
    };

    expect(validateDiagnosticInput(input)).toEqual({
      ok: false,
      error: [
        {
          field: "employees[0].salary",
          message: "O salário deve ser maior que zero.",
        },
        {
          field: "employees[0].weeklyHours",
          message: "A jornada semanal deve ser maior que zero.",
        },
        {
          field: "referenceDate",
          message: "Informe uma data válida no formato AAAA-MM-DD.",
        },
      ],
    });
  });

  it("rejects invalid rational denominators and duplicate local identifiers", () => {
    const input = {
      ...validInput(),
      employees: [
        {
          ...validInput().employees[0],
          salary: { numerator: BigInt(2100), denominator: BigInt(0) },
        },
        {
          ...validInput().employees[0],
          localId: "person-1",
        },
      ],
    };

    expect(validateDiagnosticInput(input)).toEqual({
      ok: false,
      error: [
        {
          field: "employees[0].salary",
          message: "Informe um valor racional válido para o salário.",
        },
        {
          field: "employees[1].localId",
          message: "O identificador local da pessoa deve ser único e não vazio.",
        },
      ],
    });
  });

  it("rejects coverage intervals outside supported day and minute bounds", () => {
    const input = {
      ...validInput(),
      coverage: [
        { weekday: 7, startMinute: -1, endMinute: 1500, minimumPeople: 0 },
      ],
    };

    expect(validateDiagnosticInput(input)).toEqual({
      ok: false,
      error: [
        {
          field: "coverage[0].weekday",
          message: "O dia da semana deve estar entre 0 e 6.",
        },
        {
          field: "coverage[0].startMinute",
          message: "O início deve estar entre 0 e 1440 minutos.",
        },
        {
          field: "coverage[0].endMinute",
          message: "O fim deve estar após o início e até 1440 minutos.",
        },
        {
          field: "coverage[0].minimumPeople",
          message: "Informe uma quantidade mínima de pessoas maior que zero.",
        },
      ],
    });
  });

  it("rejects a coverage end before the start of the day", () => {
    const input = {
      ...validInput(),
      coverage: [
        { weekday: 2, startMinute: -5, endMinute: -1, minimumPeople: 1 },
      ],
    };

    expect(validateDiagnosticInput(input)).toEqual({
      ok: false,
      error: [
        {
          field: "coverage[0].startMinute",
          message: "O início deve estar entre 0 e 1440 minutos.",
        },
        {
          field: "coverage[0].endMinute",
          message: "O fim deve estar após o início e até 1440 minutos.",
        },
      ],
    });
  });

  it("rejects invalid or non-monotonic weekly legal hour limits", () => {
    const input = {
      ...validInput(),
      legalParameters: {
        ...PROVISIONAL_LEGAL_PARAMETERS,
        weeklyHours: {
          beforePhase1: 44,
          phase1: 42.5,
          phase2: 43,
        },
      },
    };

    expect(validateDiagnosticInput(input)).toEqual({
      ok: false,
      error: [
        {
          field: "legalParameters.weeklyHours.phase1",
          message: "O limite semanal deve ser um número inteiro positivo e não superar o limite da etapa anterior.",
        },
        {
          field: "legalParameters.weeklyHours.phase2",
          message: "O limite semanal deve ser um número inteiro positivo e não superar o limite da etapa anterior.",
        },
      ],
    });
  });

  it("rejects a coverage requirement that cannot be represented as an exact integer", () => {
    const input = {
      ...validInput(),
      coverage: [
        {
          ...validInput().coverage[0],
          minimumPeople: Number.MAX_SAFE_INTEGER + 1,
        },
      ],
    };

    expect(validateDiagnosticInput(input)).toEqual({
      ok: false,
      error: [
        {
          field: "coverage[0].minimumPeople",
          message: "Informe uma quantidade mínima de pessoas maior que zero.",
        },
      ],
    });
  });
});
