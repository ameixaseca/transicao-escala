# Scenario Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add exact per-stage cost comparisons and safe, explicit recommendations across four staffing scenarios.

**Architecture:** Add scenario types and a pure simulator in `src/domain/scenarios`. Validate assumptions and diagnostic data before calculating costs, keep every calculation rational, and distinguish feasible, infeasible, incomplete, and not-needed results so unknown compliance never yields a recommendation.

**Tech Stack:** TypeScript, Vitest, existing `bigint` rational and Result helpers.

## Global Constraints

- Keep all cost, comparison, and overtime-distribution calculations exact using rational arithmetic; never convert calculated values to JavaScript `number`.
- Use `Result<T, E>` for expected invalid input; do not throw or return partial output for malformed assumptions.
- Missing compliance checks mean `unknown`; never infer that absent information is valid.
- Return costs for computable incomplete/infeasible scenarios, but recommend only a fully feasible scenario.
- Do not add UI, schedule generation, network requests, persistence, dependencies, or legal-parameter approval.
- GJ-04 remains a release blocker; this domain feature does not authorize publishing the product.

---

### Task 1: Define scenario types and input validation

**Files:**
- Create: `src/domain/scenarios/types.ts`
- Create: `src/domain/scenarios/validate-scenario-input.ts`
- Create: `tests/unit/scenarios.test.ts`

**Interfaces:**
- Consumes: `DiagnosticResult` and `DiagnosticStageResult` from `@/domain/diagnostic/types`, `Rational` from `@/domain/money/rational`, and `Result` from `@/domain/result`.
- Produces:

```ts
export type ScenarioId =
  | "hire-full-time"
  | "hire-part-time"
  | "overtime"
  | "reduce-hours";

export type ScenarioCheckId =
  | "dailySchedule"
  | "weeklyRest"
  | "interShiftRest"
  | "mealBreaks"
  | "salaryPreservation";

export type ScenarioCheckStatus = "valid" | "invalid" | "unknown";

export type ScenarioAssumptions = {
  replacementSalary: Rational;
  employerChargesRate: Rational;
  monthlyRevenueLoss: Rational;
  checksByStage: Partial<
    Record<string, Partial<Record<ScenarioCheckId, ScenarioCheckStatus>>>
  >;
};

export type ScenarioFeasibility =
  | "feasible"
  | "infeasible"
  | "incomplete"
  | "not-needed";

export type ScenarioResult = {
  id: ScenarioId;
  monthlyCost: Rational;
  feasibility: ScenarioFeasibility;
  reasons: string[];
  recommended: boolean;
  weeklyOvertimeHours: Rational;
};

export type ScenarioStageResult = {
  stageId: string;
  scenarios: ScenarioResult[];
  recommendedScenarioId: ScenarioId | null;
};

export type ScenarioValidationError = {
  field: string;
  message: string;
};
```

`validateScenarioInput(diagnostic, assumptions)` returns `Result<void, ScenarioValidationError[]>`. Task 2 will use this validated boundary in `simulateScenarios(diagnostic, assumptions): Result<ScenarioStageResult[], ScenarioValidationError[]>`.

- [ ] **Step 1: Write failing tests for invalid scenario assumptions**

In `tests/unit/scenarios.test.ts`, test `validateScenarioInput` with zero and negative replacement salary, negative charge rate, negative revenue loss, and zero rational denominator. Each returns a field-specific error and does not throw:

```ts
it("rejects a zero replacement salary", () => {
  const result = validateScenarioInput(
    scenarioDiagnostic(),
    { ...validAssumptions(), replacementSalary: rational(0) },
  );
  expect(result).toEqual({
    ok: false,
    error: [{
      field: "assumptions.replacementSalary",
      message: "O salário de reposição deve ser maior que zero.",
    }],
  });
});
```

Add table-driven cases for `employerChargesRate` and `monthlyRevenueLoss`, plus a malformed denominator for each monetary field. Expected field IDs are `assumptions.replacementSalary`, `assumptions.employerChargesRate`, and `assumptions.monthlyRevenueLoss`; each invalid case returns only the matching error. Add a separate case for a negative stage deficit and a zero weekly-limit denominator, with field IDs `diagnostic.stages[0].deficitPersonHours` and `diagnostic.stages[0].weeklyLimitHours`.

Add these helpers to the test file:

```ts
const rational = (numerator: number, denominator = 1): Rational => ({
  numerator: BigInt(numerator),
  denominator: BigInt(denominator),
});

const allValidChecks = () => ({
  dailySchedule: "valid" as const,
  weeklyRest: "valid" as const,
  interShiftRest: "valid" as const,
  mealBreaks: "valid" as const,
  salaryPreservation: "valid" as const,
});

const scenarioDiagnostic = (
  deficit = rational(12),
  employeeCount = 4,
  hourlyCost = rational(10),
): DiagnosticResult => ({
  referenceDate: "2026-12-16",
  legalParameterVersion: "hypothetical-ec141-test",
  stages: [{
    stageId: "phase-1",
    weeklyLimitHours: rational(42),
    availableHours: rational(168),
    requiredPersonHours: add(rational(168), deficit),
    deficitPersonHours: deficit,
    hourlyCostByLocalId: Object.fromEntries(
      Array.from({ length: employeeCount }, (_, index) => [
        `person-${index + 1}`,
        hourlyCost,
      ]),
    ),
  }],
});

const validAssumptions = (): ScenarioAssumptions => ({
  replacementSalary: rational(2100),
  employerChargesRate: rational(3, 5),
  monthlyRevenueLoss: rational(1500),
  checksByStage: { "phase-1": allValidChecks() },
});
```

Import `add` and the domain types used by the helpers.

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- --run tests/unit/scenarios.test.ts`
Expected: FAIL because `ScenarioAssumptions` and `validateScenarioInput` do not exist.

- [ ] **Step 3: Add the scenario types**

Create `src/domain/scenarios/types.ts` with the exact exported types in this task’s interface block. Import `Rational` as a type.

- [ ] **Step 4: Implement the scenario input validator**

Implement `validateScenarioInput(diagnostic: DiagnosticResult, assumptions: ScenarioAssumptions): Result<void, ScenarioValidationError[]>` in `src/domain/scenarios/validate-scenario-input.ts`. Validate all three money inputs as rationals before any calculation. Require `replacementSalary > 0`, `employerChargesRate >= 0`, and `monthlyRevenueLoss >= 0`. Validate that the diagnostic contains at least one stage, stage IDs are unique, each `weeklyLimitHours` is a positive valid rational, each `deficitPersonHours` is a valid nonnegative rational, and each `hourlyCostByLocalId` contains positive valid rationals. Collect multiple errors in stable field/stage order and return them together in the `Result` error; return `{ ok: true, value: undefined }` only when every field is valid.

Use this guard before calling rational helpers:

```ts
const isRational = (value: unknown): value is Rational =>
  typeof value === "object" &&
  value !== null &&
  "numerator" in value &&
  "denominator" in value &&
  typeof value.numerator === "bigint" &&
  typeof value.denominator === "bigint" &&
  value.denominator !== BigInt(0);
```

Normalize validated rationals before comparisons. Require nonempty stage IDs, unique stage IDs, at least one employee hourly cost per stage (the overtime average divides by employee count), and positive hourly costs. Use the existing `Result` union directly; do not throw for invalid user/domain data.

Use the stable error messages:

```ts
const ASSUMPTION_ERRORS = {
  replacementSalary: "O salário de reposição deve ser maior que zero.",
  employerChargesRate: "A taxa de encargos não pode ser negativa.",
  monthlyRevenueLoss: "A perda de receita mensal não pode ser negativa.",
};
```

For malformed assumptions, use `Informe um valor racional válido.`; for a malformed stage limit, deficit, or employee rate, use `O dado do diagnóstico deve ser um valor racional válido.`. Use `A jornada semanal da etapa deve ser maior que zero.`, `O déficit de horas deve ser não negativo.`, and `O custo-hora deve ser maior que zero.` for values with valid rational shapes but out-of-range values. Use `O diagnóstico deve conter ao menos uma etapa.`, `Cada etapa deve ter um identificador único.`, and `A etapa deve conter ao menos um custo-hora.` for empty stages, empty/duplicate stage IDs, and empty employee-rate maps. Return errors using the exact paths `assumptions.replacementSalary`, `assumptions.employerChargesRate`, `assumptions.monthlyRevenueLoss`, `diagnostic.stages`, `diagnostic.stages[i].stageId`, `diagnostic.stages[i].weeklyLimitHours`, `diagnostic.stages[i].deficitPersonHours`, and `diagnostic.stages[i].hourlyCostByLocalId.<localId>`.

- [ ] **Step 5: Run the targeted validation tests**

Run: `npm test -- --run tests/unit/scenarios.test.ts`
Expected: PASS for malformed assumptions and diagnostic data; cost scenarios can be added in Task 2. Include cases for empty stages, duplicate stage IDs, an empty hourly-cost map, malformed hourly rates, negative deficit, and nonpositive weekly limit; assert the exact error path and message in each case. Also assert `{ ok: true, value: undefined }` for a fully valid diagnostic and assumptions.

- [ ] **Step 6: Commit the validated scenario input boundary**

Run:

```powershell
git add src/domain/scenarios/types.ts src/domain/scenarios/validate-scenario-input.ts tests/unit/scenarios.test.ts
git commit -m "feat: add scenario simulator input validation"
```

Expected: a commit containing the types, standalone input validator, and passing validation tests.

### Task 2: Calculate per-stage scenario costs and feasibility

**Files:**
- Create: `src/domain/scenarios/simulate-scenarios.ts`
- Modify: `tests/unit/scenarios.test.ts`

**Interfaces:**
- Consumes: `ScenarioAssumptions`, `ScenarioId`, `ScenarioResult`, `ScenarioStageResult`, `ScenarioValidationError`, and `ScenarioCheckId`.
- Produces: the complete `simulateScenarios` function returning one group per input diagnostic stage.

Implement `simulateScenarios` by calling `validateScenarioInput` first and returning its error unchanged if validation fails. Only after a successful validation may cost calculation begin; the public result must always contain exactly one group per diagnostic stage.

- [ ] **Step 1: Add failing tests for the four PRD example costs**

For a 42-hour stage with 12 hours deficit, four employee hourly costs of R$ 10, replacement salary R$ 2,100, charges 60%, revenue loss R$ 1,500, and all checks valid, use `scenarioDiagnostic()`, `validAssumptions()`, and assert:

```ts
const result = simulateScenarios(scenarioDiagnostic(), validAssumptions());
expect(result.ok).toBe(true);
if (!result.ok) return;

const costsById = Object.fromEntries(
  result.value[0].scenarios.map((scenario) => [scenario.id, scenario.monthlyCost]),
);
expect(costsById).toEqual({
  "hire-full-time": rational(3360),
  "hire-part-time": rational(960),
  overtime: rational(900),
  "reduce-hours": rational(1500),
});
expect(result.value[0].recommendedScenarioId).toBe("overtime");
```

Assert every scenario has an exact rational monthly cost and the positive deficit yields four scenario results in stable ID order. Also pass a deficit of 65 weekly hours with a 42-hour stage limit and all checks valid; assert the part-time scenario remains feasible because `ceil(65 / 30) = 3` contracts provide 90 hours of weekly capacity.

- [ ] **Step 2: Run the cost tests and verify the intended failure**

Run: `npm test -- --run tests/unit/scenarios.test.ts`
Expected: FAIL because `simulateScenarios` does not yet exist.

- [ ] **Step 3: Implement exact scenario cost formulas**

For each `DiagnosticStageResult`, calculate:

```ts
fullTimeCost =
  ceil(deficit / weeklyLimitHours) * replacementSalary * (1 + chargesRate);

partTimeCost =
  (deficit / weeklyLimitHours) * replacementSalary * (1 + chargesRate);

overtimeCost =
  deficit * 5 * average(hourlyCostByLocalId.values()) * 1.5;

reducedHoursCost = monthlyRevenueLoss;
```

Use exact rational helpers for multiplication, division, comparison and addition. `weeklyLimitHours` is the `Rational` value on each `DiagnosticStageResult`. Implement positive rational ceiling with integer division on `bigint`; do not convert the count to `number`:

```ts
const ceilRatio = (numerator: bigint, denominator: bigint): bigint =>
  (numerator + denominator - BigInt(1)) / denominator;

const fullTimeCount = ceilRatio(
  deficit.numerator * weeklyLimitHours.denominator,
  deficit.denominator * weeklyLimitHours.numerator,
);
const partTimeContractCount = ceilRatio(
  deficit.numerator,
  deficit.denominator * BigInt(30),
);
```

Use normalized, nonnegative deficit and positive denominators before this calculation; zero deficit is handled separately. Multiply `partTimeContractCount` by 30 using rational arithmetic and confirm the resulting capacity is at least the deficit; if it is not, mark the part-time scenario infeasible with a reason that the deficit cannot be covered. For overtime, calculate average hourly cost exactly from the sum of employee rates divided by employee count, and convert the `hourlyCostByLocalId` entry count to `bigint` before using it as a rational denominator.

- [ ] **Step 4: Validate overtime daily limit**

Calculate average daily overtime per employee as `deficit / (employeeCount × 5)`. More than 2 hours per day makes overtime `infeasible` with a localized reason such as `Exigiria 3 horas extras por dia por funcionário; o limite é 2`. Exactly 2 hours per day remains within this rule. Format the reason for display without using floating-point values in calculations.

Format only the reason string to two decimal places using integer arithmetic:

```ts
const hundredths =
  (value.numerator * BigInt(100) * BigInt(2) + value.denominator) /
  (value.denominator * BigInt(2));
const whole = hundredths / BigInt(100);
const fraction = hundredths % BigInt(100);
```

Normalize the nonnegative rational first. This is half-up rounding for display only; compare the exact rational to 2 before formatting. Render a zero fractional part as an integer, otherwise pad the fractional part to two digits and use a comma decimal separator. For example, render 3 hours as `3` and 3/2 hours as `1,50`.

- [ ] **Step 5: Apply compliance check states**

For each stage, inspect `dailySchedule`, `weeklyRest`, `interShiftRest`, `mealBreaks`, and `salaryPreservation` in that order. Missing and `unknown` checks add an incomplete reason; `invalid` checks add a violation reason. Any invalid check makes the result `infeasible`; otherwise any unknown check makes it `incomplete`; only all-valid checks allow `feasible`. Keep costs on every result when computable.

- [ ] **Step 6: Run targeted scenario tests**

Run: `npm test -- --run tests/unit/scenarios.test.ts`
Expected: PASS for costs, overtime limit boundary, exact rational amounts, invalid/incomplete status, and reasons.

- [ ] **Step 7: Commit the scenario cost and compliance calculation**

Run:

```powershell
git add src/domain/scenarios/simulate-scenarios.ts tests/unit/scenarios.test.ts
git commit -m "feat: calculate scenario costs and compliance"
```

Expected: a commit with the cost formulas, exact overtime threshold check, compliance status evaluation, and passing targeted tests.

### Task 3: Add recommendation ordering and edge-case coverage

**Files:**
- Modify: `src/domain/scenarios/simulate-scenarios.ts`
- Modify: `tests/unit/scenarios.test.ts`

**Interfaces:**
- Consumes: the validated assumptions, diagnostic stage data, and scenario values from Tasks 1–2.
- Produces: per-stage recommendations through `ScenarioStageResult.recommendedScenarioId` and each scenario’s `recommended` flag.

- [ ] **Step 1: Add failing tests for grouping, recommendations, and edge cases**

Add these tests:

```ts
it("returns one ordered group per diagnostic stage", () => {
  const diagnostic = scenarioDiagnostic();
  const result = simulateScenarios({
    ...diagnostic,
    stages: [
      diagnostic.stages[0],
      { ...diagnostic.stages[0], stageId: "phase-2" },
      { ...diagnostic.stages[0], stageId: "phase-3" },
    ],
  }, {
    ...validAssumptions(),
    checksByStage: {
      "phase-1": allValidChecks(),
      "phase-2": allValidChecks(),
      "phase-3": allValidChecks(),
    },
  });

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.map((stage) => stage.stageId)).toEqual([
    "phase-1", "phase-2", "phase-3",
  ]);
  expect(result.value.every((stage) => stage.scenarios.length === 4)).toBe(true);
});

it("selects the stable first scenario when all four costs tie", () => {
  const diagnostic = scenarioDiagnostic(rational(40), 1, rational(1, 3));
  diagnostic.stages[0].weeklyLimitHours = rational(40);
  const assumptions: ScenarioAssumptions = {
    replacementSalary: rational(100),
    employerChargesRate: rational(0),
    monthlyRevenueLoss: rational(100),
    checksByStage: { "phase-1": allValidChecks() },
  };

  const result = simulateScenarios(diagnostic, assumptions);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value[0].scenarios.map((scenario) => scenario.monthlyCost))
    .toEqual([rational(100), rational(100), rational(100), rational(100)]);
  expect(result.value[0].recommendedScenarioId).toBe("hire-full-time");
  expect(result.value[0].scenarios.map((scenario) => scenario.recommended))
    .toEqual([true, false, false, false]);
});

it("does not recommend a scenario with unknown or invalid checks", () => {
  const incomplete = simulateScenarios(scenarioDiagnostic(), {
    ...validAssumptions(),
    checksByStage: {},
  });
  const invalid = simulateScenarios(scenarioDiagnostic(), {
    ...validAssumptions(),
    checksByStage: {
      "phase-1": { ...allValidChecks(), weeklyRest: "invalid" },
    },
  });

  expect(incomplete.ok).toBe(true);
  expect(invalid.ok).toBe(true);
  if (!incomplete.ok || !invalid.ok) return;
  expect(incomplete.value[0].scenarios.every(
    (scenario) => scenario.feasibility === "incomplete",
  )).toBe(true);
  expect(incomplete.value[0].scenarios.every((scenario) =>
    scenario.reasons.some((reason) => reason.includes("repouso semanal")),
  )).toBe(true);
  expect(incomplete.value[0].recommendedScenarioId).toBeNull();
  expect(invalid.value[0].scenarios.every(
    (scenario) => scenario.feasibility === "infeasible",
  )).toBe(true);
  expect(invalid.value[0].scenarios.every((scenario) =>
    scenario.reasons.some((reason) => reason.includes("repouso semanal")),
  )).toBe(true);
  expect(invalid.value[0].recommendedScenarioId).toBeNull();
});

it("marks every option not-needed when the diagnostic has no deficit", () => {
  const result = simulateScenarios(scenarioDiagnostic(rational(0)), validAssumptions());
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value[0].scenarios.map((scenario) => scenario.feasibility))
    .toEqual(["not-needed", "not-needed", "not-needed", "not-needed"]);
  expect(result.value[0].scenarios.map((scenario) => scenario.monthlyCost))
    .toEqual([rational(0), rational(0), rational(0), rational(1500)]);
  expect(result.value[0].recommendedScenarioId).toBeNull();
});
```

Also test the tie-break where part-time hiring and overtime both cost R$ 900,00 with 50% employer charges; assert `hire-part-time` is selected because its `weeklyOvertimeHours` is zero. Test the remaining exact tie with deficit 12, limit 42, salary R$ 2,100, 60% charges, revenue loss R$ 960, and employee hourly costs of R$ 20; part-time and reduced-hours both cost R$ 960, overtime costs R$ 1,800, and the ID order selects part-time. Test the 2-hour daily overtime boundary with a 20-hour deficit and two employees (exactly 2 hours each per day, accepted) and a 30-hour deficit and two employees (3 hours each per day, rejected). Ensure unknown checks other than `weeklyRest` also have explicit labels in `reasons`.

- [ ] **Step 2: Run the tests and verify the intended failures**

Run: `npm test -- --run tests/unit/scenarios.test.ts`
Expected: FAIL because stage recommendation, no-deficit state, and tie-breaking are not implemented yet.

- [ ] **Step 3: Implement scenario status and deterministic recommendation**

For each stage, preserve the fixed scenario ID order. Evaluate all five compliance checks by these stable labels:

```ts
const CHECK_LABELS: Record<ScenarioCheckId, string> = {
  dailySchedule: "jornada diária",
  weeklyRest: "repouso semanal",
  interShiftRest: "intervalo entre jornadas",
  mealBreaks: "intervalo intrajornada",
  salaryPreservation: "preservação salarial",
};
```

For the overtime scenario only, also add the invalid reason `Exigiria {formatHoursForReason(dailyOvertime)} horas extras por dia por funcionário; o limite é 2.` when daily overtime exceeds 2 hours. Set `weeklyOvertimeHours` to the stage deficit for the overtime scenario and zero for the other three. Derive status with invalid taking precedence over unknown; mark all four `not-needed` when the deficit is zero.

Use exact rational comparisons throughout the ordering:

```ts
const ID_RANK: Record<ScenarioId, number> = {
  "hire-full-time": 0,
  "hire-part-time": 1,
  overtime: 2,
  "reduce-hours": 3,
};

const compareScenarios = (left: ScenarioResult, right: ScenarioResult): number =>
  compare(left.monthlyCost, right.monthlyCost) ||
  compare(left.weeklyOvertimeHours, right.weeklyOvertimeHours) ||
  ID_RANK[left.id] - ID_RANK[right.id];
```

Keep `compare` local to `simulate-scenarios.ts`; the shared rational module exports arithmetic helpers but no comparison function. For a positive deficit, sort only feasible scenarios with this comparator. Set exactly the first scenario’s `recommended` to true and use its ID as `recommendedScenarioId`; if the eligible list is empty, every flag remains false and the stage ID is null. For zero deficit, all flags are false and the ID is null.

Run: `npm test -- --run tests/unit/scenarios.test.ts`
Expected: PASS for all scenario tests, including no recommendation for incomplete or infeasible candidates and deterministic exact ties.

- [ ] **Step 4: Commit recommendation behavior**

Run:

```powershell
git add src/domain/scenarios/simulate-scenarios.ts tests/unit/scenarios.test.ts
git commit -m "feat: recommend feasible staffing scenarios"
```

Expected: a commit with per-stage recommendations and edge-case tests.

### Task 4: Run full verification

**Files:**
- Verify: `src/domain/scenarios/types.ts`
- Verify: `src/domain/scenarios/validate-scenario-input.ts`
- Verify: `src/domain/scenarios/simulate-scenarios.ts`
- Verify: `tests/unit/scenarios.test.ts`
- Modify: `docs/superpowers/plans/2026-10-16-copiloto-transicao-6x1.md`

- [ ] **Step 1: Run the full test suite**

Run: `npm test -- --run`
Expected: PASS for the complete Vitest suite.

- [ ] **Step 2: Run the TypeScript typecheck**

Run: `npm run typecheck`
Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Check whitespace and inspect the final changes**

Run:

```powershell
git diff --check
git status --short
git diff --stat
```

Expected: `git diff --check` reports no whitespace errors; the implementation, tests, and explicitly named parent-plan documentation are the only intended changes.

- [ ] **Step 4: Update the parent development plan**

In `docs/superpowers/plans/2026-10-16-copiloto-transicao-6x1.md`, mark only the four Tarefa 6 checklist items complete after the targeted tests, full suite, and typecheck pass. Replace the stale scenario interface summary with the implemented check states and per-stage result shape from `types.ts`. Keep Tarefa 7 and GJ-04 unchecked.
