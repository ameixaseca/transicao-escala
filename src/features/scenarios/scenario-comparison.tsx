import type { ScenarioValidationError } from "@/domain/scenarios/types";
import type {
  ScenarioAssumptions,
  ScenarioCheckId,
  ScenarioCheckStatus,
  ScenarioFeasibility,
  ScenarioId,
  ScenarioStageResult,
} from "@/domain/scenarios/types";
import { formatBRL } from "@/domain/money/format-brl";
import type {
  ScenarioFormParseError,
  ScenarioFormValues,
} from "./form-values";

type ScenarioComparisonProps = {
  values: ScenarioFormValues;
  stageIds?: string[];
  checksByStage: ScenarioAssumptions["checksByStage"];
  results: ScenarioStageResult[] | null;
  errors: Array<ScenarioFormParseError | ScenarioValidationError>;
  onValuesChange: (values: ScenarioFormValues) => void;
  onCheckChange: (
    stageId: string,
    checkId: ScenarioCheckId,
    status: ScenarioCheckStatus,
  ) => void;
};

const CHECKS: Array<{ id: ScenarioCheckId; label: string }> = [
  { id: "dailySchedule", label: "Jornada diária" },
  { id: "weeklyRest", label: "Repouso semanal" },
  { id: "interShiftRest", label: "Intervalo entre jornadas" },
  { id: "mealBreaks", label: "Intervalo intrajornada" },
  { id: "salaryPreservation", label: "Preservação salarial" },
];

const STATUSES = [
  { value: "valid", label: "Válido" },
  { value: "invalid", label: "Inválido" },
  { value: "unknown", label: "Não verificado" },
] as const;

const SCENARIOS: Record<ScenarioId, string> = {
  "hire-full-time": "Contratar em tempo integral",
  "hire-part-time": "Contratar em tempo parcial",
  overtime: "Pagar horas extras",
  "reduce-hours": "Reduzir horas de operação",
};

const FEASIBILITY: Record<ScenarioFeasibility, string> = {
  feasible: "Viável",
  infeasible: "Inviável",
  incomplete: "Incompleto",
  "not-needed": "Não necessário",
};

const stageLabel = (stageId: string): string => {
  if (stageId === "before-phase-1") return "Antes da etapa 1";
  if (stageId === "phase-1") return "Etapa 1";
  if (stageId === "phase-2") return "Etapa 2";
  return stageId;
};

const fieldError = (
  errors: ScenarioComparisonProps["errors"],
  field: string,
): string | undefined => {
  const fieldForDomainError: Record<string, keyof ScenarioFormValues> = {
    "assumptions.replacementSalary": "replacementSalary",
    "assumptions.employerChargesRate": "employerChargesPercent",
    "assumptions.monthlyRevenueLoss": "monthlyRevenueLoss",
  };
  return errors.find(
    (error) =>
      error.field === field || fieldForDomainError[error.field] === field,
  )?.message;
};

const FinancialField = ({
  field,
  label,
  value,
  error,
  onChange,
}: {
  field: keyof ScenarioFormValues;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) => {
  const inputId = `scenario-${field}`;
  const errorId = `${inputId}-error`;
  return (
    <div>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        name={field}
        type="text"
        inputMode="decimal"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <p id={errorId}>{error}</p>}
    </div>
  );
};

const CheckGroup = ({
  stageId,
  checkId,
  label,
  value,
  onChange,
}: {
  stageId: string;
  checkId: ScenarioCheckId;
  label: string;
  value: ScenarioCheckStatus;
  onChange: (status: ScenarioCheckStatus) => void;
}) => {
  const groupId = `scenario-check-${stageId}-${checkId}`;
  return (
    <fieldset>
      <legend>{label}</legend>
      {STATUSES.map((status) => {
        const inputId = `${groupId}-${status.value}`;
        return (
          <label key={status.value} htmlFor={inputId}>
            <input
              id={inputId}
              type="radio"
              name={groupId}
              value={status.value}
              checked={value === status.value}
              onChange={() => onChange(status.value)}
            />
            {status.label}
          </label>
        );
      })}
    </fieldset>
  );
};

const ScenarioCard = ({
  scenario,
  recommendedScenarioId,
}: {
  scenario: ScenarioStageResult["scenarios"][number];
  recommendedScenarioId: ScenarioId | null;
}) => {
  const recommended =
    scenario.recommended &&
    scenario.feasibility === "feasible" &&
    recommendedScenarioId === scenario.id;
  return (
    <article aria-label={SCENARIOS[scenario.id]}>
      <h4>{SCENARIOS[scenario.id]}</h4>
      <p>{formatBRL(scenario.monthlyCost)}</p>
      <p>{FEASIBILITY[scenario.feasibility]}</p>
      {recommended && <p>✓ Recomendado</p>}
      {scenario.reasons.length > 0 && (
        <ul>
          {scenario.reasons.map((reason, index) => (
            <li key={`${scenario.id}-reason-${index}`}>{reason}</li>
          ))}
        </ul>
      )}
    </article>
  );
};

export function ScenarioComparison({
  values,
  stageIds,
  checksByStage,
  results,
  errors,
  onValuesChange,
  onCheckChange,
}: ScenarioComparisonProps) {
  const hasDiagnostic = Boolean(stageIds?.length);
  const updateValue = (field: keyof ScenarioFormValues, value: string) =>
    onValuesChange({ ...values, [field]: value });

  return (
    <section aria-labelledby="scenario-comparison-title">
      <h2 id="scenario-comparison-title">Premissas e cenários</h2>
      <div>
        <FinancialField
          field="replacementSalary"
          label="Salário mensal de reposição"
          value={values.replacementSalary}
          error={fieldError(errors, "replacementSalary")}
          onChange={(value) => updateValue("replacementSalary", value)}
        />
        <FinancialField
          field="employerChargesPercent"
          label="Encargos do empregador (%)"
          value={values.employerChargesPercent}
          error={fieldError(errors, "employerChargesPercent")}
          onChange={(value) => updateValue("employerChargesPercent", value)}
        />
        <FinancialField
          field="monthlyRevenueLoss"
          label="Perda mensal de receita"
          value={values.monthlyRevenueLoss}
          error={fieldError(errors, "monthlyRevenueLoss")}
          onChange={(value) => updateValue("monthlyRevenueLoss", value)}
        />
      </div>

      {hasDiagnostic ? (
        <div>
          {stageIds!.map((stageId) => (
            <section
              key={stageId}
              aria-labelledby={`scenario-checks-${stageId}`}
            >
              <h3 id={`scenario-checks-${stageId}`}>
                Verificações — {stageLabel(stageId)}
              </h3>
              <div role="group" aria-label={`Verificações — ${stageLabel(stageId)}`}>
                {CHECKS.map((check) => (
                  <CheckGroup
                    key={check.id}
                    stageId={stageId}
                    checkId={check.id}
                    label={check.label}
                    value={checksByStage[stageId]?.[check.id] ?? "unknown"}
                    onChange={(status) =>
                      onCheckChange(stageId, check.id, status)
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {hasDiagnostic && results?.length ? (
        <div>
          {results.map((stage) => (
            <section
              key={stage.stageId}
              aria-label={`Resultados — ${stageLabel(stage.stageId)}`}
              role="region"
            >
              <h3>Resultados — {stageLabel(stage.stageId)}</h3>
              {stage.scenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  recommendedScenarioId={stage.recommendedScenarioId}
                />
              ))}
            </section>
          ))}
        </div>
      ) : (
        <p aria-live="polite">Resultados pendentes.</p>
      )}
    </section>
  );
}
