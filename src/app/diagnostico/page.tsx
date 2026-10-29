"use client";

import { useState } from "react";
import { AssumptionsForm } from "@/features/assumptions/assumptions-form";
import type { DiagnosticFormValues } from "@/features/assumptions/form-values";
import { DiagnosticPanel } from "@/features/diagnostic/diagnostic-panel";
import { calculateDiagnostic } from "@/domain/diagnostic/calculate-diagnostic";
import { getTodayInSaoPaulo } from "@/domain/dates/date-only";
import { PROVISIONAL_LEGAL_PARAMETERS } from "@/domain/legal/legal-parameters";
import type { DiagnosticResult, DiagnosticValidationError } from "@/domain/diagnostic/types";
import type { LegalTimelineChecklist } from "@/features/timeline/legal-timeline";
import { LegalTimeline } from "@/features/timeline/legal-timeline";
import { parseDiagnosticForm } from "@/features/assumptions/form-values";
import {
  parseScenarioFormValues,
  type ScenarioFormValues,
} from "@/features/scenarios/form-values";
import { ScenarioComparison } from "@/features/scenarios/scenario-comparison";
import { simulateScenarios } from "@/domain/scenarios/simulate-scenarios";
import type {
  ScenarioAssumptions,
  ScenarioCheckId,
  ScenarioCheckStatus,
  ScenarioStageResult,
  ScenarioValidationError,
} from "@/domain/scenarios/types";
import type { FieldError } from "@/components/error-summary";

const initialScenarioValues: ScenarioFormValues = {
  replacementSalary: "3.000,00",
  employerChargesPercent: "30",
  monthlyRevenueLoss: "0",
};

const checkIds: ScenarioCheckId[] = [
  "dailySchedule",
  "weeklyRest",
  "interShiftRest",
  "mealBreaks",
  "salaryPreservation",
];

const createInitialDiagnosticValues = (): DiagnosticFormValues => {
  const today = getTodayInSaoPaulo();
  return {
    referenceDate: today.ok ? today.value : "",
    employees: Array.from({ length: 4 }, (_, index) => ({
      localId: `person-${index + 1}`,
      salary: "2.200,00",
      weeklyHours: "44",
      contractType: "full-time",
    })),
    coverage: Array.from({ length: 5 }, (_, index) => ({
      rowId: `coverage-${index + 1}`,
      weekday: String(index + 1),
      startTime: "09:00",
      endTime: "18:00",
      minimumPeople: "4",
    })),
  };
};

const createInitialChecklist = (): LegalTimelineChecklist => {
  const items = {
    "collective-agreement": false,
    "rests-and-breaks": false,
    "sector-sundays-holidays": false,
    "salary-and-divisor": false,
    "special-regimes": false,
  };
  return {
    phase1: { ...items },
    phase2: { ...items },
  };
};

const asFieldErrors = (
  errors: DiagnosticValidationError[],
): FieldError[] => errors.map(({ field, message }) => ({ field, message }));

const dateInitializationMessage = "Não foi possível determinar a data de hoje em São Paulo. Informe uma data de referência.";

export default function DiagnosticPage() {
  const [values, setValues] = useState(createInitialDiagnosticValues);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [diagnosticErrors, setDiagnosticErrors] = useState<FieldError[]>([]);
  const [scenarioValues, setScenarioValues] = useState(initialScenarioValues);
  const [checksByStage, setChecksByStage] = useState<
    ScenarioAssumptions["checksByStage"]
  >({});
  const [scenarioResults, setScenarioResults] = useState<
    ScenarioStageResult[] | null
  >(null);
  const [scenarioErrors, setScenarioErrors] = useState<
    Array<ScenarioValidationError | { field: string; message: string }>
  >([]);
  const [checklist, setChecklist] =
    useState<LegalTimelineChecklist>(createInitialChecklist);
  const [selectedSection, setSelectedSection] = useState("premissas");
  const referenceDateMissing = values.referenceDate === "";

  const clearScenarioResult = () => {
    setScenarioResults(null);
    setScenarioErrors([]);
  };

  const handleDiagnosticChange = (nextValues: DiagnosticFormValues) => {
    setValues(nextValues);
    setDiagnostic(null);
    setDiagnosticErrors([]);
    clearScenarioResult();
  };

  const handleDiagnosticSubmit = (submittedValues: DiagnosticFormValues) => {
    if (!submittedValues.referenceDate) {
      setDiagnostic(null);
      setDiagnosticErrors([
        { field: "referenceDate", message: dateInitializationMessage },
      ]);
      clearScenarioResult();
      return;
    }

    const parsed = parseDiagnosticForm(
      submittedValues,
      PROVISIONAL_LEGAL_PARAMETERS,
    );
    if (!parsed.ok) {
      setDiagnostic(null);
      setDiagnosticErrors(asFieldErrors(parsed.error));
      clearScenarioResult();
      return;
    }

    const calculated = calculateDiagnostic(parsed.value);
    if (!calculated.ok) {
      setDiagnostic(null);
      setDiagnosticErrors(asFieldErrors(calculated.error));
      clearScenarioResult();
      return;
    }

    setDiagnostic(calculated.value);
    setDiagnosticErrors([]);
    setChecksByStage((current) => {
      const next = { ...current };
      for (const stageId of calculated.value.stages.map((stage) => stage.stageId)) {
        next[stageId] ??= Object.fromEntries(
          checkIds.map((checkId) => [checkId, "unknown" as ScenarioCheckStatus]),
        );
      }
      return next;
    });
    clearScenarioResult();
  };

  const handleScenarioValuesChange = (nextValues: ScenarioFormValues) => {
    setScenarioValues(nextValues);
    clearScenarioResult();
  };

  const handleCheckChange = (
    stageId: string,
    checkId: ScenarioCheckId,
    status: ScenarioCheckStatus,
  ) => {
    setChecksByStage((current) => ({
      ...current,
      [stageId]: { ...current[stageId], [checkId]: status },
    }));
    clearScenarioResult();
  };

  const handleScenarioSubmit = () => {
    if (!diagnostic) return;

    const parsed = parseScenarioFormValues(
      scenarioValues,
      diagnostic.stages.map((stage) => stage.stageId),
      checksByStage,
    );
    if (!parsed.ok) {
      setScenarioErrors(parsed.error);
      setScenarioResults(null);
      return;
    }

    const simulated = simulateScenarios(diagnostic, parsed.value);
    if (!simulated.ok) {
      setScenarioErrors(simulated.error);
      setScenarioResults(null);
      return;
    }

    setScenarioErrors([]);
    setScenarioResults(simulated.value);
  };

  const handleChecklistChange = (
    stage: "phase1" | "phase2",
    item: keyof LegalTimelineChecklist["phase1"],
    checked: boolean,
  ) => {
    setChecklist((current) => ({
      ...current,
      [stage]: { ...current[stage], [item]: checked },
    }));
  };

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <p className="eyebrow">Copiloto de Transição 6x1</p>
        <p>Planeje a transição da jornada com clareza.</p>
        <aside aria-label="Status dos parâmetros legais" className="legal-status">
          Parâmetros legais provisórios · publicados em 16/10/2026 · GJ-04 permanece como bloqueador de lançamento.
        </aside>
      </header>

      <nav className="dashboard-navigation" aria-label="Seções do diagnóstico">
        {[
          ["premissas", "Premissas"],
          ["diagnostico", "Diagnóstico"],
          ["cenarios", "Cenários"],
          ["linha-do-tempo", "Linha do tempo"],
        ].map(([id, label]) => (
          <a
            aria-current={selectedSection === id ? "location" : undefined}
            href={`#${id}`}
            key={id}
            onClick={() => setSelectedSection(id)}
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="dashboard-content">
        <section className="dashboard-card" id="premissas" aria-labelledby="assumptions-title">
          <h1 id="assumptions-title">Premissas</h1>
          <p>Informe dados de operação para estimativas locais. Nenhum dado é enviado ou salvo.</p>
          {referenceDateMissing && (
            <p role="alert">{dateInitializationMessage}</p>
          )}
          <AssumptionsForm
            values={values}
            onChange={handleDiagnosticChange}
            onSubmit={handleDiagnosticSubmit}
            errors={diagnosticErrors}
          />
        </section>

        <section className="dashboard-card" id="diagnostico" aria-label="Diagnóstico">
          <DiagnosticPanel
            diagnostic={diagnostic}
            legalParameters={PROVISIONAL_LEGAL_PARAMETERS}
          />
        </section>

        <section className="dashboard-card scenario-dashboard-card" id="cenarios" aria-label="Cenários">
          <ScenarioComparison
            values={scenarioValues}
            stageIds={diagnostic?.stages.map((stage) => stage.stageId)}
            checksByStage={checksByStage}
            results={scenarioResults}
            errors={scenarioErrors}
            onValuesChange={handleScenarioValuesChange}
            onCheckChange={handleCheckChange}
          />
          <button
            className="primary-button"
            disabled={!diagnostic}
            onClick={handleScenarioSubmit}
            type="button"
          >
            Calcular cenários
          </button>
        </section>

        <section className="dashboard-card" id="linha-do-tempo" aria-label="Linha do tempo">
          <LegalTimeline
            parameters={PROVISIONAL_LEGAL_PARAMETERS}
            checkedItems={checklist}
            onChecklistChange={handleChecklistChange}
          />
        </section>
      </div>
    </main>
  );
}
