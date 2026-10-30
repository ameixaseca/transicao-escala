import type { ScheduleInput, Shift } from "@/domain/schedules/types";

export const scheduleInput = (overrides: Partial<ScheduleInput> = {}): ScheduleInput => ({
  referenceDate: "2026-12-14",
  employeeCount: 2,
  weeklyMinuteLimit: 2400,
  days: Array.from({ length: 7 }, (_, day) => ({
    day, open: day < 5, start: 540, end: 1080, minimumPeople: 1,
  })),
  ...overrides,
});

export const shift = (overrides: Partial<Shift> = {}): Shift => ({
  person: 0, day: 0, start: 540, end: 1080, breakStart: 780, breakMinutes: 60,
  ...overrides,
});
