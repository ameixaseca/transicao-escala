import { isDateOnly, type DateOnlyError } from "@/domain/dates/date-only";
import type { Result } from "@/domain/result";

export type TransitionWeek = Readonly<{
  start: string;
  end: string;
}>;

const formatUTCDate = (date: Date): Result<string, DateOnlyError> => {
  const year = date.getUTCFullYear();
  if (year < 1 || year > 9999) {
    return { ok: false, error: { code: "date-out-of-range" } };
  }

  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return {
    ok: true,
    value: `${String(year).padStart(4, "0")}-${month}-${day}`,
  };
};

export const getTransitionWeek = (
  milestoneDate: string,
): Result<TransitionWeek, DateOnlyError> => {
  if (!isDateOnly(milestoneDate)) {
    return { ok: false, error: { code: "invalid-date" } };
  }

  const start = new Date(`${milestoneDate}T00:00:00.000Z`);
  const daysSinceMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);

  const formattedStart = formatUTCDate(start);
  if (!formattedStart.ok) return formattedStart;
  const formattedEnd = formatUTCDate(end);
  if (!formattedEnd.ok) return formattedEnd;

  return {
    ok: true,
    value: { start: formattedStart.value, end: formattedEnd.value },
  };
};
