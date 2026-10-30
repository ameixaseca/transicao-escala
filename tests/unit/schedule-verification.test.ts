import { describe, expect, it } from "vitest";
import { verifySchedule } from "@/domain/schedules/verify-schedule";
import { scheduleInput, shift } from "../fixtures/schedule-cases";

const oneDay = () => {
  const input = scheduleInput();
  input.days = input.days.map(day => ({ ...day, open: day.day === 0 }));
  return input;
};

describe("independent schedule verification", () => {
  it("subtracts breaks from both coverage and effective weekly hours", () => {
    const verified = verifySchedule(oneDay(), [shift()]);
    expect(verified.weeklyMinutesByPerson).toEqual([480, 0]);
    expect(verified.gaps).toEqual([
      { day: 0, start: 780, end: 840, missingPeople: 1 },
    ]);
  });
  it("covers a break with another worker without double-counting", () => {
    const verified = verifySchedule(oneDay(), [
      shift(), shift({ person: 1, start: 780, end: 840, breakStart: null, breakMinutes: 0 }),
    ]);
    expect(verified.gaps).toEqual([]);
    expect(verified.issues).toEqual([]);
    expect(verified.pendingChecks.length).toBeGreaterThan(0);
  });
  it.each([
    shift({ breakStart: null, breakMinutes: 0 }),
    shift({ breakStart: 540 }),
    shift({ breakStart: 1080 }),
    shift({ breakStart: 780, breakMinutes: 15 }),
  ])("rejects invalid or insufficient breaks", invalid => {
    expect(verifySchedule(oneDay(), [invalid]).issues.some(issue => issue.code === "break"))
      .toBe(true);
  });
  it("accepts the exact four-hour and six-hour boundaries", () => {
    expect(verifySchedule(oneDay(), [shift({
      end: 780, breakStart: null, breakMinutes: 0,
    })]).issues).toEqual([]);
    expect(verifySchedule(oneDay(), [shift({
      end: 915, breakStart: 720, breakMinutes: 15,
    })]).issues).toEqual([]);
  });
  it("rejects daily and weekly excess", () => {
    const input = scheduleInput({ weeklyMinuteLimit: 60 });
    input.days[0].end = 1200;
    const checked = verifySchedule(input, [shift({ end: 1140 })]);
    expect(checked.issues.map(issue => issue.code)).toEqual(
      expect.arrayContaining(["daily", "weekly"]),
    );
  });
  it("rejects duplicate shifts and unknown people", () => {
    expect(verifySchedule(oneDay(), [shift(), shift(), shift({ person: 99 })])
      .issues.some(issue => issue.code === "structure")).toBe(true);
  });
  it("rejects six working days", () => {
    const input = scheduleInput();
    input.days = input.days.map(day => ({ ...day, open: true }));
    const shifts = Array.from({ length: 6 }, (_, day) =>
      shift({ day, start: 600, end: 660, breakStart: null, breakMinutes: 0 }));
    expect(verifySchedule(input, shifts).issues.some(issue => issue.code === "days"))
      .toBe(true);
  });
  it("checks actual inter-shift rest and internal weekly rest durations", () => {
    const input = scheduleInput();
    input.days = input.days.map(day => ({ ...day, open: true, start: 300, end: 1320 }));
    const shifts = [
      shift({ start: 1260, end: 1320, breakStart: null, breakMinutes: 0 }),
      shift({ day: 1, start: 300, end: 360, breakStart: null, breakMinutes: 0 }),
      shift({ day: 2, start: 1260, end: 1320, breakStart: null, breakMinutes: 0 }),
      shift({ day: 4, start: 300, end: 360, breakStart: null, breakMinutes: 0 }),
    ];
    expect(verifySchedule(input, shifts).issues.map(issue => issue.code)).toEqual(
      expect.arrayContaining(["inter-shift", "weekly-rest"]),
    );
  });
  it("does not claim to verify rest beyond the week", () => {
    expect(verifySchedule(oneDay(), [shift()]).pendingChecks.join(" "))
      .toMatch(/semanas anteriores e seguintes/);
  });
});
