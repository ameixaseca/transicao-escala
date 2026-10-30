# Design: Simulador de cenários

## Objetivo e escopo

Implementar no domínio um simulador puro que compare contratação integral, contratação parcial, horas extras e redução de horário em cada etapa do diagnóstico. A entrega calcula custos com aritmética racional exata, informa violações ou dados insuficientes e recomenda somente uma opção cuja conformidade esteja completamente validada.

Esta etapa não inclui interface, coleta de premissas, geração de escalas, persistência ou transmissão de dados. A interface futura deverá fornecer os estados dos checks legais por etapa. GJ-02 está fechado por decisão do usuário; GJ-04 continua bloqueando o lançamento.

## Abordagens consideradas

1. Calcular custos e adiar qualquer recomendação até que exista um modelo completo de escala.
2. Calcular custos, validar no domínio as regras que podem ser avaliadas e aceitar estados explícitos para checks que dependem de uma escala ou de dados ausentes.
3. Implementar neste escopo a modelagem completa de jornada diária, repousos e intervalos.

Foi aprovada a abordagem 2. Ela entrega custos e permite uma recomendação condicional sem inferir conformidade quando faltam dados. Um check `unknown` ou omitido nunca será tratado como válido.

## Arquitetura e interfaces

Adicionar módulos puros em `src/domain/scenarios`:

```ts
type ScenarioId =
  | "hire-full-time"
  | "hire-part-time"
  | "overtime"
  | "reduce-hours";

type ScenarioCheckId =
  | "dailySchedule"
  | "weeklyRest"
  | "interShiftRest"
  | "mealBreaks"
  | "salaryPreservation";

type ScenarioCheckStatus = "valid" | "invalid" | "unknown";

type ScenarioAssumptions = {
  replacementSalary: Rational;
  employerChargesRate: Rational;
  monthlyRevenueLoss: Rational;
  checksByStage: Partial<
    Record<
      string,
      Partial<Record<ScenarioCheckId, ScenarioCheckStatus>>
    >
  >;
};

type ScenarioFeasibility =
  | "feasible"
  | "infeasible"
  | "incomplete"
  | "not-needed";

type ScenarioResult = {
  id: ScenarioId;
  monthlyCost: Rational;
  feasibility: ScenarioFeasibility;
  reasons: string[];
  recommended: boolean;
  weeklyOvertimeHours: Rational;
};

type ScenarioStageResult = {
  stageId: string;
  scenarios: ScenarioResult[];
  recommendedScenarioId: ScenarioId | null;
};

type ScenarioValidationError = {
  field: string;
  message: string;
};

simulateScenarios(
  diagnostic: DiagnosticResult,
  assumptions: ScenarioAssumptions,
): Result<ScenarioStageResult[], ScenarioValidationError[]>
```

Each diagnosis stage produces one group containing all four scenarios. Check states apply to each scenario in that stage because the schedule and applicable rules can differ by stage. Checks are not scenario-specific in this version: they describe whether the proposed operating arrangement for that stage has been reviewed against the named rule.

The engine computes the overtime daily-limit rule itself. The other checks represent validation that cannot be inferred from `DiagnosticResult`. If any required check is `invalid`, the scenario is `infeasible`; if none is invalid but at least one is absent or `unknown`, it is `incomplete`; only all-valid checks allow `feasible`. An infeasible result has a reason for each failed check. An incomplete result identifies each unresolved check. Neither may be recommended.

When a diagnostic premise changes in the dashboard, discard the prior diagnostic and scenario results and reset all stage checks to `unknown`. A recalculated diagnostic must not reuse compliance declarations made under different premises; users must explicitly confirm checks again before a recommendation is possible. This reset does not affect the legal timeline checklist or scenario form inputs.

Invalid money inputs return field-level `ScenarioValidationError`s. Replacement salary must be positive; employer charge rate and monthly revenue loss must be nonnegative. Calculations must validate rational denominators before division. No fallback values are allowed.

## Cálculos dos cenários

All calculations use exact rational values. For each stage, let `D` be `deficitPersonHours`, `L` the stage weekly limit, `N` the number of employees represented in `hourlyCostByLocalId`, `R` the monthly replacement salary, `C` the employer charge rate, and `H` the exact mean of the employees’ hourly costs.

- **Full-time hiring:** `ceil(D / L) × R × (1 + C)`.
- **Part-time hiring:** support enough contracts to cover the deficit, each capped at 30 weekly hours; cost is `R × (D / L) × (1 + C)`. The ceiling of `D / 30` determines the required number of contracts. This proportional cost uses the same full-time salary reference as the full-time scenario.
- **Overtime:** `D × 5 × H × 1.5`. Allocate `D` equally across the current employees and five days to check daily overtime: `D / (N × 5)`. More than 2 hours per employee per day makes this scenario infeasible, with an explicit reason including the estimated daily hours and the 2-hour limit.
- **Reduced operating hours:** use `monthlyRevenueLoss` as the monthly cost.

The factor 5 converts weekly values to monthly values, as defined in PRD RN-13. `ceil` and all cost, comparison, and distribution operations must avoid floating-point conversion. Monetary rounding occurs only when a consumer formats final values for display.

When `D` is zero, all four results are `not-needed`, their displayed monthly cost is zero for hiring/overtime and the configured loss estimate for reduced operating hours, no scenario is recommended, and the stage recommendation is `null`.

For positive deficit, a recommendation is selected only among `feasible` scenarios. Order by lowest monthly cost, then fewest weekly overtime hours, then the stable ID order: full-time hire, part-time hire, overtime, reduced operating hours. This final ordering makes otherwise exact ties deterministic.

## Fluxo e tratamento de erros

1. Validate diagnostic stages and scenario money assumptions before calculating costs.
2. For each stage, calculate all four costs and the overtime daily-limit check.
3. Evaluate the stage’s compliance checks. An invalid check yields `infeasible`; otherwise any unknown or missing check yields `incomplete`; all valid checks yield `feasible`.
4. If the stage deficit is zero, mark the scenarios `not-needed` and do not recommend.
5. Otherwise select the lowest-cost feasible option using the deterministic tie-break rules. If no option is feasible, leave `recommendedScenarioId` as `null`.
6. Return all stage groups together. If the diagnostic or monetary assumptions are invalid, return stable field errors rather than partial output.

Costs remain available for incomplete or infeasible options when their formula is computable. Reasons explain why recommendation is unavailable. The engine does not claim that a real work schedule has been legally approved.

## Testes

Vitest unit tests will verify:

- The PRD example costs: full-time R$ 3.360,00, part-time R$ 960,00, overtime R$ 900,00, and reduced-hours loss R$ 1.500,00.
- Three groups are returned with the corresponding stage IDs and four scenarios per group.
- Overtime distribution and the 2-hour daily boundary, including the 30-hour weekly deficit for two people being infeasible at 3 hours per employee per day.
- A 50% charge example ties part-time hiring and overtime at R$ 900,00, with part-time selected because it uses fewer overtime hours.
- Exact cost ordering and deterministic ID-order tie resolution.
- Invalid and unknown checks produce `infeasible` and `incomplete`, respectively, both with visible reasons and no recommendation.
- Missing check states are treated as unknown, never as valid.
- Zero deficit produces `not-needed` and a null recommendation.
- Invalid, negative, zero, or malformed rational assumptions return field errors without throwing or producing partial results.

Tests use real domain functions and exact rationals. No UI, browser, network, or legal-source verification is included.

## Restrições e próximos passos

- The diagnostics’ employee data has no explicit per-day schedules. Overtime therefore uses the approved uniform distribution across five workdays and is an estimate, not a generated schedule.
- Checks for weekly rest, inter-shift rest, meal breaks, daily schedule and salary preservation are external inputs until the UI or a schedule model can validate them.
- Do not recommend a scenario when required checks are incomplete.
- Keep legal parameters provisional and do not release the product before GJ-04 closes.
- The UI task must expose missing checks as unresolved, not prefill them as valid.
