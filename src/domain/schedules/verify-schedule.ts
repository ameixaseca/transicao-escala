import type { ScheduleInput, ScheduleVerification, Shift, CoverageGap } from "./types";

export function workingSegments(shift: Shift): Array<{ start: number; end: number }> {
  if (shift.breakStart === null) return [{ start: shift.start, end: shift.end }];
  return [
    { start: shift.start, end: shift.breakStart },
    { start: shift.breakStart + shift.breakMinutes, end: shift.end },
  ].filter(segment => segment.end > segment.start);
}

export function verifySchedule(input: ScheduleInput, shifts: Shift[]): ScheduleVerification {
  const issues: ScheduleVerification["issues"] = [];
  const validShifts: Shift[] = [];
  const weeklyMinutesByPerson = Array<number>(input.employeeCount).fill(0);
  const seen = new Set<string>();
  const add = (code: ScheduleVerification["issues"][number]["code"], person: number, message: string) =>
    issues.push({ code, person, message });

  for (const shift of shifts) {
    const operation = input.days.find(day => day.day === shift.day);
    const key = `${shift.person}:${shift.day}`;
    const structurallyValid = Number.isInteger(shift.person) &&
      shift.person >= 0 && shift.person < input.employeeCount &&
      operation?.open && Number.isInteger(shift.start) && Number.isInteger(shift.end) &&
      shift.start >= operation.start && shift.end <= operation.end &&
      shift.end > shift.start && !seen.has(key);
    seen.add(key);
    if (!structurallyValid) {
      add("structure", shift.person, "Turno duplicado, fora da operação ou com pessoa/horários inválidos.");
    }
    const effective = shift.end - shift.start - shift.breakMinutes;
    const minimumBreak = effective > 360 ? 60 : effective > 240 ? 15 : 0;
    const validBreak = Number.isInteger(shift.breakMinutes) && shift.breakMinutes >= minimumBreak &&
      effective > 0 && (shift.breakMinutes === 0
        ? shift.breakStart === null
        : shift.breakStart !== null && Number.isInteger(shift.breakStart) &&
          shift.breakStart > shift.start && shift.breakStart + shift.breakMinutes < shift.end);
    if (!validBreak) add("break", shift.person, "O intervalo deve respeitar a jornada efetiva e ficar dentro do turno.");
    if (effective > 480) add("daily", shift.person, "O turno ultrapassa 8 horas efetivas.");
    if (!structurallyValid || !validBreak) continue;
    validShifts.push(shift);
    weeklyMinutesByPerson[shift.person] += effective;
  }
  for (let person = 0; person < input.employeeCount; person += 1) {
    if (weeklyMinutesByPerson[person] > input.weeklyMinuteLimit) {
      add("weekly", person, "A jornada ultrapassa o limite semanal informado.");
    }
    const ordered = validShifts.filter(shift => shift.person === person)
      .sort((a, b) => a.day - b.day || a.start - b.start);
    if (ordered.length > 5) add("days", person, "A simulação exige ao menos dois dias de folga na semana.");
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const current = ordered[index];
      const rest = (current.day - previous.day) * 1440 + current.start - previous.end;
      if (rest < 660) add("inter-shift", person, "Há menos de 11 horas entre jornadas.");
      const offDays = current.day - previous.day - 1;
      if (offDays >= 1 && rest < (offDays === 1 ? 2100 : 3540)) {
        add("weekly-rest", person, "O repouso interno à semana não atinge 35 horas (ou 59 horas para folgas consecutivas).");
      }
    }
  }
  const gaps: CoverageGap[] = [];
  for (const day of [...input.days].sort((a, b) => a.day - b.day)) {
    if (!day.open) continue;
    const segments = validShifts.filter(shift => shift.day === day.day)
      .flatMap(shift => workingSegments(shift).map(segment => ({ ...segment, person: shift.person })));
    const points = [...new Set([day.start, day.end, ...segments.flatMap(segment =>
      [segment.start, segment.end])])].sort((a, b) => a - b);
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1];
      const end = points[index];
      const present = new Set(segments.filter(segment =>
        segment.start <= start && segment.end >= end).map(segment => segment.person)).size;
      const missingPeople = day.minimumPeople - present;
      if (missingPeople <= 0) continue;
      const previous = gaps.at(-1);
      if (previous?.day === day.day && previous.end === start && previous.missingPeople === missingPeople) {
        previous.end = end;
      } else {
        gaps.push({ day: day.day, start, end, missingPeople });
      }
    }
  }
  return {
    issues, gaps, weeklyMinutesByPerson,
    pendingChecks: [
      "Histórico de trabalho e repousos nas semanas anteriores e seguintes não verificado.",
      "Rodízio de domingos, feriados, categoria profissional e instrumentos coletivos não verificados.",
      "Parâmetros legais provisórios: GJ-04 permanece pendente; esta simulação não é aprovação jurídica.",
    ],
  };
}
