"use client";

import { getStageDates, type LegalDateError } from "@/domain/dates/stages";
import type { LegalParameters } from "@/domain/legal/legal-parameters";
import { getTransitionWeek } from "./transition-week";

export type LegalStageId = "phase1" | "phase2";

export type ChecklistItemId =
  | "collective-agreement"
  | "rests-and-breaks"
  | "sector-sundays-holidays"
  | "salary-and-divisor"
  | "special-regimes";

type ChecklistItem = Readonly<{
  id: ChecklistItemId;
  label: string;
}>;

const checklistItems: readonly ChecklistItem[] = [
  {
    id: "collective-agreement",
    label: "Revisar limite de jornada e instrumento coletivo aplicável",
  },
  { id: "rests-and-breaks", label: "Conferir repousos e intervalos" },
  {
    id: "sector-sundays-holidays",
    label: "Verificar regras setoriais de domingos e feriados",
  },
  {
    id: "salary-and-divisor",
    label: "Revisar remuneração, divisor e preservação salarial",
  },
  {
    id: "special-regimes",
    label: "Identificar regimes ou contratos especiais que exigem análise fora do MVP",
  },
];

export type LegalTimelineChecklist = Readonly<
  Record<LegalStageId, Readonly<Record<ChecklistItemId, boolean>>>
>;

type LegalTimelineProps = {
  parameters: LegalParameters;
  checkedItems: LegalTimelineChecklist;
  onChecklistChange: (
    stage: LegalStageId,
    item: ChecklistItemId,
    checked: boolean,
  ) => void;
};

const dateErrorMessage = (error: LegalDateError): string => {
  switch (error.code) {
    case "publication-date-required":
      return "Data de publicação necessária para calcular os marcos.";
    case "invalid-date":
      return "A data de publicação dos parâmetros legais é inválida.";
    case "invalid-month-offset":
      return "O deslocamento de meses para o marco é inválido.";
    case "date-out-of-range":
      return "A data calculada está fora do intervalo permitido.";
  }
};

const formatDate = (date: string): string =>
  `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;

const legalStatusLabel = (status: LegalParameters["status"]): string =>
  status === "provisório" ? "provisórios" : "aprovados";

export function LegalTimeline({
  parameters,
  checkedItems,
  onChecklistChange,
}: LegalTimelineProps) {
  const stageDates = getStageDates(parameters);
  const milestones = stageDates.ok
    ? [
        {
          id: "phase1" as const,
          label: "Etapa 1",
          date: stageDates.value.phase1,
          weeklyHours: parameters.weeklyHours.phase1,
        },
        {
          id: "phase2" as const,
          label: "Etapa 2",
          date: stageDates.value.phase2,
          weeklyHours: parameters.weeklyHours.phase2,
        },
      ]
    : [];

  return (
    <section aria-labelledby="legal-timeline-title">
      <h2 id="legal-timeline-title">Linha do tempo legal</h2>
      <aside aria-label="Status dos parâmetros legais">
        <p>
          Parâmetros legais {legalStatusLabel(parameters.status)} · versão{" "}
          {parameters.version}
        </p>
        <p>
          As posições jurídicas apresentadas se baseiam nas respostas reportadas.
        </p>
        <p>GJ-04 permanece como bloqueador de lançamento.</p>
      </aside>

      {!stageDates.ok ? (
        <p role="alert">
          Não foi possível calcular os marcos:{" "}
          {`${stageDates.error.code} — ${dateErrorMessage(stageDates.error)}`}
        </p>
      ) : (
        <div>
          {milestones.map((milestone) => {
            const transitionWeek = getTransitionWeek(milestone.date);
            if (!transitionWeek.ok) {
              return (
                <p key={milestone.id} role="alert">
                  Não foi possível calcular a semana de transição:{" "}
                  {`${transitionWeek.error.code} — ${dateErrorMessage(transitionWeek.error)}`}
                </p>
              );
            }

            return (
              <section
                aria-labelledby={`legal-timeline-${milestone.id}`}
                key={milestone.id}
                role="region"
              >
                <h3 id={`legal-timeline-${milestone.id}`}>{milestone.label}</h3>
                <dl>
                  <div>
                    <dt>Data do marco</dt>
                    <dd>{formatDate(milestone.date)}</dd>
                  </div>
                  <div>
                    <dt>Semana de transição</dt>
                    <dd>
                      {formatDate(transitionWeek.value.start)} a{" "}
                      {formatDate(transitionWeek.value.end)}
                    </dd>
                  </div>
                  <div>
                    <dt>Limite semanal aplicável</dt>
                    <dd>{milestone.weeklyHours} h</dd>
                  </div>
                </dl>
                <p>
                  Nesta semana passa a valer a nova jornada. Esta escala já segue
                  a regra nova.
                </p>
                <fieldset>
                  <legend>Checklist operacional</legend>
                  {checklistItems.map((item) => {
                    const inputId = `legal-timeline-${milestone.id}-${item.id}`;
                    return (
                      <div key={item.id}>
                        <input
                          checked={checkedItems[milestone.id][item.id]}
                          id={inputId}
                          onChange={(event) =>
                            onChecklistChange(
                              milestone.id,
                              item.id,
                              event.currentTarget.checked,
                            )
                          }
                          type="checkbox"
                        />
                        <label htmlFor={inputId}>{item.label}</label>
                      </div>
                    );
                  })}
                </fieldset>
                <p>
                  Marcar um item significa somente “conferido pelo usuário”; não
                  representa aprovação nem conformidade jurídica.
                </p>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
