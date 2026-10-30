import { describe, expect, it } from "vitest";
import { validateScheduleInput } from "@/domain/schedules/validate-schedule-input";
import { scheduleInput } from "../fixtures/schedule-cases";

describe("operational schedule input", () => {
  it("accepts a week without salary assumptions", () => {
    const input = scheduleInput();
    expect(validateScheduleInput(input)).toEqual({ ok: true, value: input });
  });
  it.each([0, -1, 1.5, 201, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid employee count %s", employeeCount => {
      expect(validateScheduleInput(scheduleInput({ employeeCount })).ok).toBe(false);
    },
  );
  it("supports the approved limit of 200 employees", () => {
    expect(validateScheduleInput(scheduleInput({ employeeCount: 200 })).ok).toBe(true);
  });
  it.each([0, 2520, 2400.5, NaN])("rejects weekly minutes %s", weeklyMinuteLimit => {
    expect(validateScheduleInput(scheduleInput({ weeklyMinuteLimit })).ok).toBe(false);
  });
  it("rejects duplicate or missing days", () => {
    const input = scheduleInput();
    input.days[6].day = 5;
    expect(validateScheduleInput(input).ok).toBe(false);
    expect(validateScheduleInput({ ...input, days: [] }).ok).toBe(false);
  });
  it.each([
    { start: 1080, end: 540 }, { start: 540, end: 540 },
    { start: 240, end: 600 }, { start: 1200, end: 1380 },
    { minimumPeople: 1.5 }, { minimumPeople: 0 }, { start: NaN },
  ])("rejects unsupported operating day %j", update => {
    const input = scheduleInput();
    input.days[0] = { ...input.days[0], ...update };
    expect(validateScheduleInput(input).ok).toBe(false);
  });
  it("validates the reference date", () => {
    expect(validateScheduleInput(scheduleInput({ referenceDate: "2026-02-30" })).ok)
      .toBe(false);
  });
  it("allows closed days without active time values", () => {
    const input = scheduleInput();
    input.days = input.days.map(day => ({ ...day, open: false, start: 0, end: 0, minimumPeople: 0 }));
    expect(validateScheduleInput(input).ok).toBe(true);
  });
});
