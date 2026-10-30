import { isDateOnly } from "@/domain/dates/date-only";
import type { Result } from "@/domain/result";
import type { ScheduleError, ScheduleInput } from "./types";

export const MAX_SCHEDULE_EMPLOYEES = 200;

export function validateScheduleInput(
  input: ScheduleInput,
): Result<ScheduleInput, ScheduleError[]> {
  const errors: ScheduleError[] = [];
  const add = (field: string, message: string) => errors.push({ field, message });
  if (!isDateOnly(input.referenceDate)) {
    add("referenceDate", "Informe uma data de referência válida.");
  }
  if (!Number.isSafeInteger(input.employeeCount) ||
      input.employeeCount < 1 || input.employeeCount > MAX_SCHEDULE_EMPLOYEES) {
    add("employeeCount", "Informe entre 1 e 200 funcionários por simulação.");
  }
  if (!Number.isSafeInteger(input.weeklyMinuteLimit) ||
      input.weeklyMinuteLimit < 1 || input.weeklyMinuteLimit > 2400) {
    add("weeklyMinuteLimit", "Informe uma jornada semanal de até 40 horas.");
  }
  if (input.days.length !== 7 || new Set(input.days.map(day => day.day)).size !== 7 ||
      input.days.some(day => !Number.isInteger(day.day) || day.day < 0 || day.day > 6)) {
    add("days", "Informe cada dia da semana exatamente uma vez.");
  }
  let requiredMinutes = 0;
  input.days.forEach((day, index) => {
    if (!day.open) return;
    if (!Number.isSafeInteger(day.start) || day.start < 300 || day.start >= 1320) {
      add(`days[${index}].start`, "A abertura deve estar entre 05:00 e 21:59. Esta versão simula apenas operação diurna.");
    }
    if (!Number.isSafeInteger(day.end) || day.end > 1320 || day.end <= day.start) {
      add(`days[${index}].end`, "Informe fechamento após a abertura, até 22:00, sem atravessar a meia-noite.");
    }
    if (!Number.isSafeInteger(day.minimumPeople) || day.minimumPeople < 1) {
      add(`days[${index}].minimumPeople`, "Informe um mínimo inteiro e positivo de pessoas.");
    }
    requiredMinutes += (day.end - day.start) * day.minimumPeople;
  });
  if (!Number.isSafeInteger(requiredMinutes)) {
    add("days", "A demanda informada excede o limite numérico da simulação.");
  }
  return errors.length ? { ok: false, error: errors } : { ok: true, value: input };
}
