import { getTodayInSaoPaulo } from "@/domain/dates/date-only";
import type { Result } from "@/domain/result";
import type { ScheduleInput, ScheduleError } from "@/domain/schedules/types";
import { validateScheduleInput } from "@/domain/schedules/validate-schedule-input";

export const WEEKDAYS = [
  "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira",
  "Sexta-feira", "Sábado", "Domingo",
];
export const SHORT_WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export type ScheduleFormValues = {
  employeeCount: string;
  referenceDate: string;
  weeklyHours: string;
  days: Array<{
    day: number;
    open: boolean;
    start: string;
    end: string;
    minimumPeople: string;
  }>;
};

export function createScheduleFormValues(): ScheduleFormValues {
  const today = getTodayInSaoPaulo();
  return {
    employeeCount: "",
    referenceDate: today.ok ? today.value : "",
    weeklyHours: "40",
    days: WEEKDAYS.map((_, day) => ({
      day, open: day < 5, start: "09:00", end: "18:00", minimumPeople: "1",
    })),
  };
}

export function parseScheduleForm(values: ScheduleFormValues): Result<ScheduleInput, ScheduleError[]> {
  const errors: ScheduleError[] = [];
  const integer = (text: string, field: string) => {
    const value = Number(text);
    if (!/^\d+$/.test(text) || !Number.isSafeInteger(value)) {
      errors.push({ field, message: "Informe um número inteiro válido." });
      return NaN;
    }
    return value;
  };
  const time = (text: string, field: string) => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text);
    if (!match) {
      errors.push({ field, message: "Informe um horário válido, por exemplo 09:00." });
      return NaN;
    }
    return Number(match[1]) * 60 + Number(match[2]);
  };
  const input: ScheduleInput = {
    employeeCount: integer(values.employeeCount, "employeeCount"),
    referenceDate: values.referenceDate,
    weeklyMinuteLimit: integer(values.weeklyHours, "weeklyHours") * 60,
    days: values.days.map((day, index) => ({
      day: day.day,
      open: day.open,
      start: day.open ? time(day.start, `days[${index}].start`) : 0,
      end: day.open ? time(day.end, `days[${index}].end`) : 0,
      minimumPeople: day.open ? integer(day.minimumPeople, `days[${index}].minimumPeople`) : 0,
    })),
  };
  if (errors.length) return { ok: false, error: errors };
  const validated = validateScheduleInput(input);
  return validated.ok ? validated : {
    ok: false,
    error: validated.error.map(error => ({
      ...error, field: error.field === "weeklyMinuteLimit" ? "weeklyHours" : error.field,
    })),
  };
}

export const formatScheduleTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export const formatScheduleHours = (minutes: number) =>
  `${Math.floor(minutes / 60)}h${minutes % 60 ? String(minutes % 60).padStart(2, "0") : ""}`;
