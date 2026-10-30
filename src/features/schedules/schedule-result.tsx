import type { ScheduleResult } from "@/domain/schedules/types";
import { formatScheduleHours, formatScheduleTime, SHORT_WEEKDAYS, WEEKDAYS } from "./form-values";

export function ScheduleResultView({ result, stale }: { result: ScheduleResult; stale: boolean }) {
  if (stale) return <section className="planner-result planner-empty">
    <span className="planner-result-symbol" aria-hidden="true">↻</span>
    <h2>Resultado anterior desatualizado</h2>
    <p>As condições da operação mudaram. Gere novamente para conferir a cobertura.</p>
  </section>;

  const messages: Record<ScheduleResult["status"], string> = {
    covered: "Cobertura atendida nas verificações implementadas.",
    partial: "Ainda há horários sem cobertura.",
    "not-found": "Não encontramos uma escala com as condições informadas.",
    "no-demand": "Nenhum dia de funcionamento foi informado.",
  };
  return <section className="planner-result" aria-labelledby="planner-result-title" tabIndex={-1}>
    <div className="planner-result-heading">
      <div><p className="eyebrow">Sugestão de organização</p><h2 id="planner-result-title">Sua escala semanal</h2></div>
      <span className={`planner-badge${result.status === "covered" ? " planner-badge-covered" : ""}`}>
        {result.status === "covered" ? "Cobertura completa" : result.status === "no-demand" ? "Sem demanda" : "Revisar cobertura"}
      </span>
    </div>
    <p className="planner-result-message">{messages[result.status]}</p>
    <div className="planner-summary">
      <div><span>Equipe informada</span><strong>{result.verification.weeklyMinutesByPerson.length} pessoas</strong></div>
      <div><span>Horários descobertos</span><strong>{result.verification.gaps.length} faixas</strong></div>
    </div>
    {result.searchLimited && <p className="planner-notice">
      A busca atingiu seu limite; isso não comprova que a escala seja impossível.
    </p>}
    {result.additionalPeopleLowerBound > 0 && <p className="planner-notice">
      <strong>Estimativa mínima de pessoas adicionais: {result.additionalPeopleLowerBound}.</strong>{" "}
      A quantidade suficiente depende da distribuição de turnos, intervalos e folgas.
    </p>}
    {result.verification.gaps.length > 0 && <div className="planner-gaps">
      <h3>Onde falta cobertura</h3>
      <ul>{result.verification.gaps.map(gap => <li key={`${gap.day}:${gap.start}`}>
        <strong>{WEEKDAYS[gap.day]}</strong> · {formatScheduleTime(gap.start)}–{formatScheduleTime(gap.end)}
        {" · faltam "}{gap.missingPeople} {gap.missingPeople === 1 ? "pessoa" : "pessoas"}
      </li>)}</ul>
    </div>}
    {result.verification.issues.length > 0 && <div className="planner-notice">
      <h3>Restrições não atendidas</h3>
      <ul>{result.verification.issues.map((issue, index) =>
        <li key={index}>Pessoa {issue.person + 1}: {issue.message}</li>)}</ul>
    </div>}
    {result.status !== "no-demand" && <div className="planner-table-scroll" role="region"
      aria-label="Grade de trabalho e folgas" tabIndex={0}>
      <table className="planner-table">
        <caption>Horários, intervalos e folgas por pessoa</caption>
        <thead><tr><th scope="col">Equipe</th>
          {SHORT_WEEKDAYS.map((label, day) => <th scope="col" key={label}>
            <abbr title={WEEKDAYS[day]}>{label}</abbr>
          </th>)}<th scope="col">Total</th></tr></thead>
        <tbody>{result.verification.weeklyMinutesByPerson.map((minutes, person) =>
          <tr key={person}><th scope="row">Pessoa {person + 1}</th>
            {WEEKDAYS.map((_, day) => {
              const shift = result.shifts.find(shift => shift.person === person && shift.day === day);
              return <td key={day}>{shift ? <div className="planner-shift">
                <strong>{formatScheduleTime(shift.start)}–{formatScheduleTime(shift.end)}</strong>
                {shift.breakStart !== null && <small>Intervalo {formatScheduleTime(shift.breakStart)}–{formatScheduleTime(shift.breakStart + shift.breakMinutes)}</small>}
              </div> : <span className="planner-rest">Folga</span>}</td>;
            })}
            <td className="planner-total">{formatScheduleHours(minutes)}</td>
          </tr>,
        )}</tbody>
      </table>
    </div>}
    <p className="planner-help">Horas efetivas, descontados os intervalos. Folgas não significam redução automática de salário.</p>
    <div className="planner-pending">
      <h3>Cobertura não é aprovação jurídica</h3>
      <p>Há verificações pendentes de histórico e regras específicas. Revise antes de aplicar a escala.</p>
      <details><summary>Ver premissas e pendências</summary>
        <ul>{result.verification.pendingChecks.map(check => <li key={check}>{check}</li>)}</ul>
        <p>A busca explora opções de turnos e intervalos; não garante a melhor escala nem a menor equipe possível.</p>
      </details>
    </div>
  </section>;
}
