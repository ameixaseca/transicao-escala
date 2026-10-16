import { addCalendarMonths, isDateOnly, type DateOnlyError } from "@/domain/dates/date-only";
import type { LegalParameters } from "@/domain/legal/legal-parameters";
import type { Result } from "@/domain/result";

export type LegalDateError = DateOnlyError | { code: "publication-date-required" };

export type StageDates = {
  phase1: string;
  phase2: string;
};

export const getStageDates = (
  parameters: LegalParameters,
): Result<StageDates, LegalDateError> => {
  if (parameters.publicationDate === null) {
    return { ok: false, error: { code: "publication-date-required" } };
  }
  if (!isDateOnly(parameters.publicationDate)) {
    return { ok: false, error: { code: "invalid-date" } };
  }

  const phase1 = addCalendarMonths(parameters.publicationDate, 2);
  if (!phase1.ok) return phase1;

  const phase2 = addCalendarMonths(phase1.value, 12);
  if (!phase2.ok) return phase2;

  return {
    ok: true,
    value: { phase1: phase1.value, phase2: phase2.value },
  };
};

export const getWeeklyHourLimit = (
  date: string,
  parameters: LegalParameters,
): Result<number, LegalDateError> => {
  if (!isDateOnly(date)) {
    return { ok: false, error: { code: "invalid-date" } };
  }

  const stages = getStageDates(parameters);
  if (!stages.ok) return stages;

  if (date < stages.value.phase1) {
    return { ok: true, value: parameters.weeklyHours.beforePhase1 };
  }
  if (date < stages.value.phase2) {
    return { ok: true, value: parameters.weeklyHours.phase1 };
  }
  return { ok: true, value: parameters.weeklyHours.phase2 };
};
