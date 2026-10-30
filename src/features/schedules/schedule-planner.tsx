"use client";

import Link from "next/link";
import { useState } from "react";
import { fieldIdFor } from "@/components/error-summary";
import { getStageDates } from "@/domain/dates/stages";
import { PROVISIONAL_LEGAL_PARAMETERS } from "@/domain/legal/legal-parameters";
import { generateSchedule } from "@/domain/schedules/generate-schedule";
import type { ScheduleError, ScheduleResult } from "@/domain/schedules/types";
import { getTransitionWeek } from "@/features/timeline/transition-week";
import { createScheduleFormValues, parseScheduleForm, type ScheduleFormValues } from "./form-values";
import { ScheduleForm } from "./schedule-form";
import { ScheduleResultView } from "./schedule-result";

export function SchedulePlanner() {
  const [values, setValues] = useState(createScheduleFormValues);
  const [errors, setErrors] = useState<ScheduleError[]>([]);
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const week = getTransitionWeek(values.referenceDate);
  const dates = getStageDates(PROVISIONAL_LEGAL_PARAMETERS);
  const transition = week.ok && dates.ok &&
    [dates.value.phase1, dates.value.phase2].some(date => date >= week.value.start && date <= week.value.end);
  const onChange = (next: ScheduleFormValues) => {
    setValues(next);
    setErrors([]);
    setExecutionError(null);
    if (result) setStale(true);
  };
  const submit = async () => {
    if (busy) return;
    setExecutionError(null);
    const parsed = parseScheduleForm(values);
    if (!parsed.ok) {
      setErrors(parsed.error);
      return;
    }
    setErrors([]);
    setBusy(true);
    try {
      const generated = await generateSchedule(parsed.value);
      if (!generated.ok) {
        setErrors(generated.error);
        return;
      }
      setResult(generated.value);
      setStale(false);
    } catch (error) {
      console.error("Falha ao gerar a escala semanal.", error);
      setExecutionError("Não foi possível gerar a escala. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };
  return <main className="planner-shell">
    <header className="planner-header">
      <Link href="/" className="planner-brand">Copiloto <span>de Transição 6x1</span></Link>
      <Link className="planner-detailed-link" href="/diagnostico/">Diagnóstico e custos detalhados</Link>
    </header>
    <div className="planner-intro">
      <p className="eyebrow">Menos etapas. Mais clareza.</p>
      <h1>Monte sua escala de trabalho</h1>
      <p>Informe sua equipe e os horários da operação. Veja como distribuir trabalho e folgas — e onde faltam pessoas.</p>
    </div>
    <aside className="planner-legal" aria-label="Status dos parâmetros legais">
      <strong>Simulação com parâmetros legais provisórios.</strong>{" "}
      Não é aprovação jurídica. GJ-04 permanece pendente e bloqueia o lançamento.
    </aside>
    <div className="planner-layout">
      <section className="planner-form-card" aria-labelledby="planner-input-title">
        <p className="eyebrow">1. Sua operação</p>
        <h2 id="planner-input-title">Comece pela equipe</h2>
        <p className="planner-help">Sem salários, nomes ou planilhas para começar.</p>
        <ScheduleForm values={values} errors={errors} busy={busy} onChange={onChange}
          onSubmit={() => { void submit(); }} />
      </section>
      <div className="planner-output" aria-busy={busy}>
        <div className="planner-week">
          <span className="eyebrow">2. Sua semana</span>
          {week.ok && <span>{week.value.start.split("-").reverse().join("/")} – {week.value.end.split("-").reverse().join("/")}</span>}
        </div>
        {transition && <p className="planner-notice">Esta semana contém um marco de transição.
          A simulação mantém o teto conservador informado; confira as regras aplicáveis à semana inteira.</p>}
        <p className="planner-status" role="status" aria-live="polite">
          {busy ? "Gerando escala…" : stale ? "Dados alterados. Gere a escala novamente." : result ? "Simulação calculada. Confira a escala e as pendências." : ""}
        </p>
        {executionError && <p role="alert" className="planner-notice">{executionError}</p>}
        {result ? <ScheduleResultView result={result} stale={stale} /> :
          <section className="planner-result planner-empty" aria-label="Como começar">
            <span className="planner-result-symbol" aria-hidden="true">▦</span>
            <h2>Sua próxima escala começa aqui</h2>
            <p>Preencha a equipe e confira os dias de funcionamento. A sugestão aparecerá neste espaço.</p>
            <ol>
              <li>Trabalho e folgas por pessoa</li>
              <li>Intervalos considerados na cobertura</li>
              <li>Horários que precisam de reforço</li>
            </ol>
            <a href={`#${fieldIdFor("employeeCount")}`}>Começar pela quantidade de funcionários →</a>
          </section>}
      </div>
    </div>
    <footer className="planner-footer">
      Seus dados são processados somente neste navegador. O planejador não envia nem salva estas informações.
    </footer>
  </main>;
}
