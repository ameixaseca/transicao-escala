import { describe, expect, it } from "vitest";
import {
  addCalendarMonths,
  getTodayInSaoPaulo,
  isDateOnly,
} from "@/domain/dates/date-only";
import {
  getStageDates,
  getWeeklyHourLimit,
} from "@/domain/dates/stages";
import {
  PROVISIONAL_LEGAL_PARAMETERS,
  type LegalParameters,
} from "@/domain/legal/legal-parameters";

const hypotheticalParameters = (
  publicationDate: string | null,
): LegalParameters => ({
  ...PROVISIONAL_LEGAL_PARAMETERS,
  publicationDate,
});

describe("date-only values", () => {
  it.each([
    ["2026-10-16", 2, "2026-12-16"],
    ["2026-01-31", 2, "2026-03-31"],
    ["2025-12-31", 2, "2026-02-28"],
    ["2024-01-31", 1, "2024-02-29"],
    ["2024-02-29", 12, "2025-02-28"],
  ])("adds calendar months to %s without timezone arithmetic", (date, months, expected) => {
    expect(addCalendarMonths(date, months)).toEqual({ ok: true, value: expected });
  });

  it.each(["2026-02-29", "2026-13-01", "2026-04-31", "2026-1-01", "2026-01-01T00:00:00Z"])(
    "rejects invalid civil date %s",
    (date) => {
      expect(isDateOnly(date)).toBe(false);
      expect(addCalendarMonths(date, 2)).toEqual({
        ok: false,
        error: { code: "invalid-date" },
      });
    },
  );

  it("rejects a non-integer month offset", () => {
    expect(addCalendarMonths("2026-10-16", 1.5)).toEqual({
      ok: false,
      error: { code: "invalid-month-offset" },
    });
  });

  it("resolves the current civil date in Sao Paulo independently of the host timezone", () => {
    expect(getTodayInSaoPaulo(new Date("2026-10-17T02:59:59.000Z"))).toEqual({
      ok: true,
      value: "2026-10-16",
    });
    expect(getTodayInSaoPaulo(new Date("2026-10-17T03:00:00.000Z"))).toEqual({
      ok: true,
      value: "2026-10-17",
    });
  });
});

describe("provisional stage dates", () => {
  it("calculates dates from a hypothetical publication date using calendar months", () => {
    expect(getStageDates(hypotheticalParameters("2026-10-16"))).toEqual({
      ok: true,
      value: { phase1: "2026-12-16", phase2: "2027-12-16" },
    });
  });

  it("reports that the publication date is unavailable instead of inventing it", () => {
    expect(getStageDates(hypotheticalParameters(null))).toEqual({
      ok: false,
      error: { code: "publication-date-required" },
    });
  });

  it("uses the last valid day when a stage date falls in a shorter month", () => {
    expect(getStageDates(hypotheticalParameters("2025-12-31"))).toEqual({
      ok: true,
      value: { phase1: "2026-02-28", phase2: "2027-02-28" },
    });
  });
});

describe("weekly hour limit", () => {
  it.each([
    ["2026-12-15", 44],
    ["2026-12-16", 42],
    ["2027-12-15", 42],
    ["2027-12-16", 40],
  ])("returns the limit on %s in a hypothetical fixture", (date, hours) => {
    expect(getWeeklyHourLimit(date, hypotheticalParameters("2026-10-16"))).toEqual({
      ok: true,
      value: hours,
    });
  });

  it("returns an explicit error when the reference date is invalid", () => {
    expect(getWeeklyHourLimit("2026-02-29", hypotheticalParameters("2026-10-16"))).toEqual({
      ok: false,
      error: { code: "invalid-date" },
    });
  });
});
