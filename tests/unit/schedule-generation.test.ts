import { describe, expect, it } from "vitest";
import { generateSchedule } from "@/domain/schedules/generate-schedule";
import { verifySchedule } from "@/domain/schedules/verify-schedule";
import { scheduleInput } from "../fixtures/schedule-cases";

describe("bounded weekly schedule generation", () => {
  it("covers five four-hour days with one person", async () => {
    const input = scheduleInput({ employeeCount: 1 });
    input.days = input.days.map(day => ({ ...day, end: 780 }));
    const result = await generateSchedule(input);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected valid input");
    expect(result.value.status).toBe("covered");
    expect(verifySchedule(input, result.value.shifts).issues).toEqual([]);
    expect(result.value.verification.gaps).toEqual([]);
    expect(result.value.verification.weeklyMinutesByPerson).toEqual([1200]);
  });
  it("stages breaks and covers nine-hour operation with two people", async () => {
    const input = scheduleInput();
    const result = await generateSchedule(input);
    if (!result.ok) throw new Error("Expected valid input");
    expect(result.value.status).toBe("covered");
    expect(verifySchedule(input, result.value.shifts).issues).toEqual([]);
    expect(result.value.verification.gaps).toEqual([]);
  });
  it("distributes days off across a seven-day operation", async () => {
    const input = scheduleInput({ employeeCount: 3 });
    input.days = input.days.map(day => ({ ...day, open: true, end: 780 }));
    const result = await generateSchedule(input);
    if (!result.ok) throw new Error("Expected valid input");
    expect(result.value.status).toBe("covered");
    expect(result.value.verification.issues).toEqual([]);
  });
  it("keeps insufficient coverage explicit and estimates only a lower bound", async () => {
    const result = await generateSchedule(scheduleInput({ employeeCount: 1 }));
    if (!result.ok) throw new Error("Expected valid input");
    expect(result.value.status).toBe("partial");
    expect(result.value.verification.gaps.length).toBeGreaterThan(0);
    expect(result.value.additionalPeopleLowerBound).toBe(1);
    expect(result.value.verification.issues).toEqual([]);
  });
  it("does not round non-quarter-hour inputs", async () => {
    const input = scheduleInput();
    input.days = input.days.map(day => ({ ...day, start: 497, end: 737 }));
    const result = await generateSchedule(input);
    if (!result.ok) throw new Error("Expected valid input");
    expect(result.value.status).toBe("covered");
    expect(result.value.shifts[0].start).toBe(497);
  });
  it("returns no demand for a closed week", async () => {
    const input = scheduleInput();
    input.days = input.days.map(day => ({ ...day, open: false }));
    const result = await generateSchedule(input);
    if (!result.ok) throw new Error("Expected valid input");
    expect(result.value.status).toBe("no-demand");
    expect(result.value.shifts).toEqual([]);
  });
  it("is deterministic and respects smaller weekly limits", async () => {
    const input = scheduleInput({ weeklyMinuteLimit: 240 });
    const options = { maxEvaluations: 100, yieldControl: async () => {} };
    const result = await generateSchedule(input, options);
    expect(result).toEqual(await generateSchedule(input, options));
    if (!result.ok) throw new Error("Expected valid input");
    expect(result.value.verification.weeklyMinutesByPerson.every(minutes => minutes <= 240))
      .toBe(true);
  });
  it("reports bounded search without pretending impossibility", async () => {
    const result = await generateSchedule(scheduleInput(), { maxEvaluations: 1 });
    if (!result.ok) throw new Error("Expected valid input");
    expect(result.value.searchLimited).toBe(true);
    expect(result.value.status).not.toBe("covered");
  });
  it("returns field errors before searching", async () => {
    expect((await generateSchedule(scheduleInput({ employeeCount: 0 }))).ok).toBe(false);
  });
  it("handles the approved 200-person limit without exploring interchangeable workers", async () => {
    const result = await generateSchedule(scheduleInput({ employeeCount: 200 }), {
      maxEvaluations: 1000, yieldControl: async () => {},
    });
    if (!result.ok) throw new Error("Expected valid input");
    expect(result.value.status).toBe("covered");
    expect(result.value.verification.weeklyMinutesByPerson).toHaveLength(200);
  });
});
