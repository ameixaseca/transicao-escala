"use client";

import { useEffect, useState } from "react";
import { ErrorSummary, fieldIdFor } from "@/components/error-summary";
import type { ScheduleError } from "@/domain/schedules/types";
import { WEEKDAYS, type ScheduleFormValues } from "./form-values";

export type ScheduleFormProps = {
  values: ScheduleFormValues;
  errors: ScheduleError[];
  busy: boolean;
  onChange: (values: ScheduleFormValues) => void;
  onSubmit: () => void;
};

export function ScheduleForm({ values, errors, busy, onChange, onSubmit }: ScheduleFormProps) {
  const [copySource, setCopySource] = useState(0);
  const [copyTargets, setCopyTargets] = useState<number[]>([]);
  useEffect(() => {
    if (errors.length) document.getElementById(fieldIdFor(errors[0].field))?.focus();
  }, [errors]);

  const attributes = (field: string) => ({
    id: fieldIdFor(field),
    "aria-invalid": errors.some(error => error.field === field),
    "aria-describedby": errors.some(error => error.field === field)
      ? `${fieldIdFor(field)}-error` : undefined,
  });
  const fieldError = (field: string) => {
    const messages = errors.filter(error => error.field === field);
    return messages.length ? <p className="planner-field-error" id={`${fieldIdFor(field)}-error`}>
      {messages.map(error => error.message).join(" ")}
    </p> : null;
  };
  const updateDay = (index: number, update: Partial<ScheduleFormValues["days"][number]>) =>
    onChange({ ...values, days: values.days.map((day, i) => i === index ? { ...day, ...update } : day) });

  return (
    <form className="planner-form" noValidate onSubmit={event => {
      event.preventDefault();
      onSubmit();
    }}>
      <ErrorSummary errors={errors} />
      <fieldset disabled={busy} className="planner-inputs">
        <legend className="planner-sr-only">Dados da sua operação</legend>
        <div className="planner-team-field">
          <label htmlFor={fieldIdFor("employeeCount")}>Quantos funcionários você tem hoje?</label>
          <input {...attributes("employeeCount")} type="number" min="1" max="200" step="1"
            inputMode="numeric" placeholder="Ex.: 6" value={values.employeeCount}
            onChange={event => onChange({ ...values, employeeCount: event.target.value })} />
          <small>De 1 a 200 pessoas, sem cadastro individual.</small>
          {fieldError("employeeCount")}
        </div>
        <div className="planner-reference-fields">
          <div>
            <label htmlFor={fieldIdFor("referenceDate")}>Semana de referência</label>
            <input {...attributes("referenceDate")} type="date" value={values.referenceDate}
              onChange={event => onChange({ ...values, referenceDate: event.target.value })} />
            {fieldError("referenceDate")}
          </div>
          <div>
            <label htmlFor={fieldIdFor("weeklyHours")}>Jornada máxima semanal</label>
            <div className="planner-hours-field">
              <input {...attributes("weeklyHours")} type="number" min="1" max="40" step="1"
                value={values.weeklyHours} onChange={event => onChange({
                  ...values, weeklyHours: event.target.value,
                })} />
              <span>horas</span>
            </div>
            {fieldError("weeklyHours")}
          </div>
        </div>
        <p className="planner-help">Simulação conservadora: até 8h por dia, até 40h por semana e duas folgas. Sem horas extras. O teto não é uma obrigação de preencher todas as horas.</p>
        <div id={fieldIdFor("days")} tabIndex={-1}>
          <h2>Como sua operação funciona?</h2>
          <p className="planner-help">Ajuste os horários iniciais abaixo. Mínimo é a quantidade de pessoas trabalhando ao mesmo tempo, sem contar quem está em intervalo.</p>
          {fieldError("days")}
          <div className="planner-day-headings" aria-hidden="true">
            <span>Dia</span><span>Abre</span><span>Fecha</span><span>Mínimo</span>
          </div>
          <div className="planner-days">
            {values.days.map((day, index) => (
              <fieldset key={day.day} className={`planner-day${day.open ? "" : " planner-day-closed"}`}>
                <legend className="planner-sr-only">{WEEKDAYS[day.day]}</legend>
                <label className="planner-day-toggle">
                  <input type="checkbox" checked={day.open}
                    aria-label={`Aberto — ${WEEKDAYS[day.day]}`}
                    onChange={event => updateDay(index, { open: event.target.checked })} />
                  <span>{WEEKDAYS[day.day]}</span>
                </label>
                <div>
                  <label className="planner-sr-only" htmlFor={fieldIdFor(`days[${index}].start`)}>
                    Abertura — {WEEKDAYS[day.day]}
                  </label>
                  <input {...attributes(`days[${index}].start`)} type="time" disabled={!day.open}
                    value={day.start} onChange={event => updateDay(index, { start: event.target.value })} />
                  {fieldError(`days[${index}].start`)}
                </div>
                <div>
                  <label className="planner-sr-only" htmlFor={fieldIdFor(`days[${index}].end`)}>
                    Fechamento — {WEEKDAYS[day.day]}
                  </label>
                  <input {...attributes(`days[${index}].end`)} type="time" disabled={!day.open}
                    value={day.end} onChange={event => updateDay(index, { end: event.target.value })} />
                  {fieldError(`days[${index}].end`)}
                </div>
                <div>
                  <label className="planner-sr-only" htmlFor={fieldIdFor(`days[${index}].minimumPeople`)}>
                    Mínimo de pessoas — {WEEKDAYS[day.day]}
                  </label>
                  <input {...attributes(`days[${index}].minimumPeople`)} type="number" min="1" step="1"
                    disabled={!day.open} value={day.minimumPeople}
                    onChange={event => updateDay(index, { minimumPeople: event.target.value })} />
                  {fieldError(`days[${index}].minimumPeople`)}
                </div>
              </fieldset>
            ))}
          </div>
        </div>
        <details className="planner-copy">
          <summary>Repetir horários em outros dias</summary>
          <label htmlFor="planner-copy-source">Copiar os dados de</label>
          <select id="planner-copy-source" value={copySource}
            onChange={event => setCopySource(Number(event.target.value))}>
            {WEEKDAYS.map((label, day) => <option key={label} value={day}>{label}</option>)}
          </select>
          <div className="planner-copy-targets">
            {WEEKDAYS.map((label, day) => <label key={label}>
              <input type="checkbox" checked={copyTargets.includes(day)}
                aria-label={`Copiar para ${label}`} onChange={event => setCopyTargets(current =>
                  event.target.checked ? [...current, day] : current.filter(target => target !== day))} />
              {label}
            </label>)}
          </div>
          <button type="button" className="planner-secondary-button" disabled={!copyTargets.length}
            onClick={() => onChange({
              ...values, days: values.days.map(day => copyTargets.includes(day.day)
                ? { ...values.days[copySource], day: day.day } : day),
            })}>Copiar para os dias selecionados</button>
        </details>
        <p className="planner-help">Operação diurna, entre 05:00 e 22:00, sem atravessar a meia-noite. A equipe tem a mesma disponibilidade e o mesmo limite de jornada.</p>
        <button className="primary-button planner-generate" type="submit">
          {busy ? "Gerando escala…" : "Gerar escala"}
          <span aria-hidden="true">→</span>
        </button>
      </fieldset>
    </form>
  );
}
