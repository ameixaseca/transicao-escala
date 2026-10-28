import type { DiagnosticInput } from "@/domain/diagnostic/types";
import type { Rational } from "@/domain/money/rational";
import { PROVISIONAL_LEGAL_PARAMETERS } from "@/domain/legal/legal-parameters";

const rational = (numerator: number, denominator = 1): Rational => ({
  numerator: BigInt(numerator),
  denominator: BigInt(denominator),
});

export const diagnosticCase = (): DiagnosticInput => ({
  employees: Array.from({ length: 4 }, (_, index) => ({
    localId: `person-${index + 1}`,
    salary: rational(2200),
    weeklyHours: rational(44),
    contractType: "full-time",
  })),
  coverage: Array.from({ length: 5 }, (_, index) => ({
    weekday: index + 1,
    startMinute: 540,
    endMinute: 1080,
    minimumPeople: 4,
  })),
  referenceDate: "2026-10-16",
  legalParameters: {
    ...PROVISIONAL_LEGAL_PARAMETERS,
    version: "hypothetical-ec141-test",
    publicationDate: "2026-10-16",
  },
});
