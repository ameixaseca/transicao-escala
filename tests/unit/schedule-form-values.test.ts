import { describe, expect, it } from "vitest";
import { createScheduleFormValues, parseScheduleForm } from "@/features/schedules/form-values";

describe("schedule form parsing", () => {
  it("starts with an empty team and visible editable defaults", () => {
    const values = createScheduleFormValues();
    expect(values.employeeCount).toBe("");
    expect(values.weeklyHours).toBe("40");
    expect(values.days.filter(day => day.open)).toHaveLength(5);
  });
  it("preserves exact minute inputs and normalizes closed days", () => {
    const values = createScheduleFormValues();
    values.employeeCount = "2";
    values.days[0].start = "08:17";
    values.days[0].end = "17:43";
    values.days[6].start = "";
    const parsed = parseScheduleForm(values);
    if (!parsed.ok) throw new Error("Expected valid input");
    expect(parsed.value.days[0].start).toBe(497);
    expect(parsed.value.days[0].end).toBe(1063);
    expect(parsed.value.days[6].start).toBe(0);
  });
  it.each(["", "1.5", "1e2", "-1", "201", "99999999999999999"])(
    "rejects count %s", employeeCount => {
      expect(parseScheduleForm({ ...createScheduleFormValues(), employeeCount }).ok).toBe(false);
    },
  );
  it("maps weekly domain errors to the weekly hours control", () => {
    const parsed = parseScheduleForm({
      ...createScheduleFormValues(), employeeCount: "2", weeklyHours: "42",
    });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) throw new Error("Expected invalid hours");
    expect(parsed.error.some(error => error.field === "weeklyHours")).toBe(true);
  });
});
