import type { Result } from "@/domain/result";
import type { ScheduleError, ScheduleInput, ScheduleResult, ScheduleVerification, Shift } from "./types";
import { validateScheduleInput } from "./validate-schedule-input";
import { verifySchedule } from "./verify-schedule";

export type SearchOptions = {
  maxEvaluations?: number;
  yieldControl?: () => Promise<void>;
};

const missingMinutes = (verification: ScheduleVerification) =>
  verification.gaps.reduce((sum, gap) => sum + (gap.end - gap.start) * gap.missingPeople, 0);

export async function generateSchedule(
  input: ScheduleInput,
  options: SearchOptions = {},
): Promise<Result<ScheduleResult, ScheduleError[]>> {
  const validated = validateScheduleInput(input);
  if (!validated.ok) return validated;
  const maxEvaluations = options.maxEvaluations ?? 50_000;
  if (!Number.isSafeInteger(maxEvaluations) || maxEvaluations < 1) {
    return { ok: false, error: [{ field: "search", message: "O limite de busca deve ser um inteiro positivo." }] };
  }
  const yieldControl = options.yieldControl ?? (() => new Promise<void>(resolve => setTimeout(resolve, 0)));
  let evaluations = 0;
  let best: Shift[] = [];
  let bestVerification = verifySchedule(input, best);
  let bestMissing = missingMinutes(bestVerification);
  const required = bestMissing;
  const seen = new Set<string>();

  const search = async (shifts: Shift[], verification: ScheduleVerification): Promise<boolean> => {
    if (verification.gaps.length === 0) return true;
    if (evaluations >= maxEvaluations) return false;
    const gap = [...verification.gaps].sort((a, b) =>
      b.missingPeople - a.missingPeople || a.day - b.day || a.start - b.start)[0];
    const day = input.days.find(day => day.day === gap.day)!;
    const candidates: Array<{ shifts: Shift[]; verification: ScheduleVerification; missing: number }> = [];
    const people = Array.from({ length: input.employeeCount }, (_, person) => person)
      .sort((a, b) => verification.weeklyMinutesByPerson[a] - verification.weeklyMinutesByPerson[b] || a - b);
    const equivalentPeople = new Set<string>();
    for (const person of people) {
      if (evaluations >= maxEvaluations) break;
      if (shifts.some(shift => shift.person === person && shift.day === day.day)) continue;
      if (shifts.filter(shift => shift.person === person).length >= 5) continue;
      const history = JSON.stringify(shifts.filter(shift => shift.person === person)
        .map(shift => [shift.day, shift.start, shift.end, shift.breakStart, shift.breakMinutes]));
      // Workers with identical histories and availability are interchangeable.
      if (equivalentPeople.has(history)) continue;
      equivalentPeople.add(history);
      const remaining = input.weeklyMinuteLimit - verification.weeklyMinutesByPerson[person];
      const durations = [...new Set([480, 360, 240, gap.end - gap.start, remaining]
        .map(duration => Math.min(duration, remaining, 480)).filter(duration => duration > 0))];
      for (const effective of durations) {
        const breakMinutes = effective > 360 ? 60 : effective > 240 ? 15 : 0;
        const length = effective + breakMinutes;
        const starts = [...new Set([gap.start, day.start, gap.end - length, day.end - length])];
        for (const start of starts) {
          if (start < day.start || start + length > day.end) continue;
          const breaks: Array<number | null> = breakMinutes === 0 ? [null] :
            [...new Set([
              start + Math.floor(effective / 2),
              gap.end,
              ...shifts.filter(shift => shift.day === day.day)
                .flatMap(shift => [shift.start, shift.end - breakMinutes,
                  shift.breakStart === null ? shift.start : shift.breakStart + shift.breakMinutes]),
            ])].filter(time => time > start && time + breakMinutes < start + length);
          for (const breakStart of breaks) {
            if (evaluations >= maxEvaluations) break;
            evaluations += 1;
            if (evaluations % 250 === 0) await yieldControl();
            const candidate: Shift = { person, day: day.day, start, end: start + length, breakStart, breakMinutes };
            const next = [...shifts, candidate];
            const key = JSON.stringify(next.map(shift =>
              [shift.person, shift.day, shift.start, shift.end, shift.breakStart]));
            if (seen.has(key)) continue;
            seen.add(key);
            const checked = verifySchedule(input, next);
            const missing = missingMinutes(checked);
            if (checked.issues.length || missing >= missingMinutes(verification)) continue;
            candidates.push({ shifts: next, verification: checked, missing });
            if (missing < bestMissing) {
              best = next;
              bestVerification = checked;
              bestMissing = missing;
            }
            if (missing === 0) return true;
          }
        }
      }
    }
    candidates.sort((a, b) => a.missing - b.missing ||
      a.verification.weeklyMinutesByPerson.reduce((sum, minutes) => sum + minutes, 0) -
      b.verification.weeklyMinutesByPerson.reduce((sum, minutes) => sum + minutes, 0));
    for (const candidate of candidates.slice(0, 8)) {
      if (evaluations >= maxEvaluations) break;
      if (await search(candidate.shifts, candidate.verification)) return true;
    }
    return false;
  };

  if (required > 0) await search([], bestVerification);
  const demand = input.days.filter(day => day.open).reduce((sum, day) =>
    sum + (day.end - day.start) * day.minimumPeople, 0);
  const peak = Math.max(0, ...input.days.filter(day => day.open).map(day => day.minimumPeople));
  return { ok: true, value: {
    shifts: best,
    verification: bestVerification,
    status: required === 0 ? "no-demand" : bestMissing === 0 ? "covered" : best.length ? "partial" : "not-found",
    searchLimited: evaluations >= maxEvaluations,
    additionalPeopleLowerBound: Math.max(0, peak - input.employeeCount,
      Math.ceil(demand / input.weeklyMinuteLimit) - input.employeeCount),
  } };
}
