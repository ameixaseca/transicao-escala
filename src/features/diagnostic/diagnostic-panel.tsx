import type {
  DiagnosticResult,
  DiagnosticStageResult,
} from "@/domain/diagnostic/types";
import { getWeeklyHourLimit } from "@/domain/dates/stages";
import type { LegalParameters } from "@/domain/legal/legal-parameters";
import { formatBRL } from "@/domain/money/format-brl";
import { normalizeRational } from "@/domain/money/rational";
import { formatHours } from "./format-hours";

const stages = [
  { id: "before-phase-1", label: "Antes da etapa 1" },
  { id: "phase-1", label: "Etapa 1" },
  { id: "phase-2", label: "Etapa 2" },
] as const;

type DiagnosticPanelProps = {
  diagnostic: DiagnosticResult | null;
  legalParameters: LegalParameters;
};

const matchesWeeklyLimit = (
  stage: DiagnosticStageResult,
  weeklyLimit: number,
): boolean => {
  const value = normalizeRational(stage.weeklyLimitHours);
  return value.numerator === BigInt(weeklyLimit) * value.denominator;
};

const legalStatusLabel = (status: LegalParameters["status"]): string =>
  status === "provisório" ? "provisórios" : "aprovados";

const StageCard = ({
  headingId,
  label,
  result,
  isReferenceStage,
}: {
  headingId: string;
  label: string;
  result: DiagnosticStageResult | undefined;
  isReferenceStage: boolean;
}) => (
  <section
    aria-current={isReferenceStage ? "step" : undefined}
    aria-labelledby={headingId}
    className="diagnostic-stage-card"
    role="region"
  >
    <h3 id={headingId}>{label}</h3>
    {isReferenceStage && (
      <p>Etapa aplicável na data de referência</p>
    )}
    {result ? (
      <>
        <dl>
          <div>
            <dt>Limite semanal</dt>
            <dd>{formatHours(result.weeklyLimitHours)}</dd>
          </div>
          <div>
            <dt>Horas disponíveis</dt>
            <dd>{formatHours(result.availableHours)}</dd>
          </div>
          <div>
            <dt>Horas-pessoa necessárias</dt>
            <dd>{formatHours(result.requiredPersonHours)}</dd>
          </div>
          <div>
            <dt>Déficit de horas-pessoa</dt>
            <dd>{formatHours(result.deficitPersonHours)}</dd>
          </div>
        </dl>
        <h4>Custos horários estimados</h4>
        <ul>
          {Object.entries(result.hourlyCostByLocalId).map(([, cost], index) => (
            <li key={index}>
              Pessoa {index + 1}: {formatBRL(cost)}
            </li>
          ))}
        </ul>
      </>
    ) : (
      <p>Resultado indisponível para esta etapa.</p>
    )}
  </section>
);

export function DiagnosticPanel({
  diagnostic,
  legalParameters,
}: DiagnosticPanelProps) {
  const displayedVersion =
    diagnostic?.legalParameterVersion ?? legalParameters.version;
  const applicableWeeklyLimit = diagnostic
    ? getWeeklyHourLimit(diagnostic.referenceDate, legalParameters)
    : null;
  const applicableStage =
    applicableWeeklyLimit?.ok
      ? diagnostic?.stages.find((stage) =>
          matchesWeeklyLimit(stage, applicableWeeklyLimit.value),
        )?.stageId
      : undefined;
  const applicableStageLabel = stages.find(
    (stage) => stage.id === applicableStage,
  )?.label;

  return (
    <section aria-labelledby="diagnostic-panel-title">
      <h2 id="diagnostic-panel-title">Diagnóstico por etapa</h2>
      <aside aria-label="Status dos parâmetros legais">
        <p>
          Parâmetros legais {legalStatusLabel(legalParameters.status)} · versão{" "}
          {displayedVersion}
        </p>
        <p>GJ-04 permanece como bloqueador de lançamento.</p>
      </aside>
      {diagnostic ? (
        <>
          <p>Data de referência: {diagnostic.referenceDate}</p>
          <p aria-live="polite">
            {applicableStageLabel
              ? `Etapa aplicável na data de referência: ${applicableStageLabel}`
              : "Etapa aplicável indisponível"}
          </p>
          <div>
            {stages.map((stage) => (
              <StageCard
                key={stage.id}
                headingId={`diagnostic-stage-${stage.id}`}
                label={stage.label}
                result={diagnostic.stages.find(
                  (result) => result.stageId === stage.id,
                )}
                isReferenceStage={
                  applicableStageLabel === stage.label &&
                  applicableWeeklyLimit?.ok === true
                }
              />
            ))}
          </div>
        </>
      ) : (
        <p>Diagnóstico pendente.</p>
      )}
    </section>
  );
}
