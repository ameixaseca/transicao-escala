import type { Result } from "@/domain/result";

export type DateOnlyError =
  | { code: "invalid-date" }
  | { code: "invalid-month-offset" }
  | { code: "date-out-of-range" };

type CivilDate = {
  year: number;
  month: number;
  day: number;
};

const isLeapYear = (year: number): boolean =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const daysInMonth = (year: number, month: number): number => {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

const parseDateOnly = (value: string): CivilDate | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month)
  ) {
    return null;
  }

  return { year, month, day };
};

export const isDateOnly = (value: string): boolean => parseDateOnly(value) !== null;

export const getTodayInSaoPaulo = (
  now: Date = new Date(),
): Result<string, DateOnlyError> => {
  if (!Number.isFinite(now.getTime())) {
    return { ok: false, error: { code: "invalid-date" } };
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    return { ok: false, error: { code: "invalid-date" } };
  }

  const value = `${year}-${month}-${day}`;
  return isDateOnly(value)
    ? { ok: true, value }
    : { ok: false, error: { code: "invalid-date" } };
};

export const addCalendarMonths = (
  value: string,
  months: number,
): Result<string, DateOnlyError> => {
  const date = parseDateOnly(value);
  if (!date) return { ok: false, error: { code: "invalid-date" } };
  if (!Number.isSafeInteger(months)) {
    return { ok: false, error: { code: "invalid-month-offset" } };
  }

  const monthIndex = (date.year - 1) * 12 + date.month - 1 + months;
  if (monthIndex < 0 || monthIndex >= 9999 * 12) {
    return { ok: false, error: { code: "date-out-of-range" } };
  }

  const year = Math.floor(monthIndex / 12) + 1;
  const month = (monthIndex % 12) + 1;
  const day = Math.min(date.day, daysInMonth(year, month));

  return {
    ok: true,
    value: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
};
