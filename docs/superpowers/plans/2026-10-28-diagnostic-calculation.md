# Diagnostic Calculation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement exact, pure diagnostic calculations for required hours, legal-stage availability, deficits, and hourly costs.

**Architecture:** Keep calculation logic in the domain layer and use the existing `Result`, legal date helpers, and exact rational arithmetic. Validate inputs before calculations, return explicit field errors for invalid or unavailable legal dates, and produce one result for each of the three legal stages without changing inputs.

**Tech Stack:** TypeScript, Vitest, existing `bigint` rational helpers.

## Global Constraints

- Keep all monetary and person-hour calculations exact with rational arithmetic; never convert calculated values to JavaScript `number`.
- Use only the existing `Result<T, E>` convention for expected failures; do not silently substitute dates or legal parameters.
- Legal parameters remain provisional until GJ-04; this work does not publish or mark parameters approved.
- Preserve the existing public interfaces in `src/domain/diagnostic/types.ts` unless a test demonstrates a necessary correction.
- Keep all diagnostic data local; do not add network requests, APIs, persistence, or UI behavior.

---

### Task 1: Add diagnostic fixtures and failing calculation tests

**Files:**
- Create: `tests/fixtures/diagnostic-cases.ts`
- Create: `tests/unit/diagnostic.test.ts`
- Use: `src/domain/diagnostic/types.ts`
- Use: `src/domain/legal/legal-parameters.ts`
- Use: `src/domain/money/rational.ts`

**Interfaces:**
- Fixtures export a `DiagnosticInput` with four employees, each with a monthly salary of 2200 and weekly hours of 44.
- Coverage consists of five weekdays, 09:00–18:00 with four people required, totaling exactly 180 person-hours weekly.
- A hypothetical legal parameter fixture has publication date `2026-10-16` and weekly limits 44, 42, and 40.
- Tests consume `calculateDiagnostic(input): Result<DiagnosticResult, DiagnosticValidationError[]>`.

- [x] **Step 0: Create the shared typed fixture**

In `tests/fixtures/diagnostic-cases.ts`, export a factory returning:

```ts
import type { DiagnosticInput } from "@/domain/diagnostic/types";
import type { Rational } from "@/domain/money/rational";
import { PROVISIONAL_LEGAL_PARAMETERS } from "@/domain/legal/legal-parameters";

const rational = (numerator: number, denominator = 1): Rational => ({
  numerator: BigInt(numerator),
  denominator: BigInt(denominator),
});

export const diagnosticCase = (): DiagnosticInput => ({
  employees: Array.from({ length: 4 }, (_, index) => ({
    localId: `person-${index + 1}`,
    salary: rational(2200),
    weeklyHours: rational(44),
    contractType: "full-time",
  })),
  coverage: Array.from({ length: 5 }, (_, index) => ({
    weekday: index + 1,
    startMinute: 540,
    endMinute: 1080,
    minimumPeople: 4,
  })),
  referenceDate: "2026-10-16",
  legalParameters: {
    ...PROVISIONAL_LEGAL_PARAMETERS,
    version: "hypothetical-ec141-test",
    publicationDate: "2026-10-16",
  },
});
```

Import `DiagnosticInput`, `Rational`, and `PROVISIONAL_LEGAL_PARAMETERS` from their existing domain modules.

- [x] **Step 1: Write tests for required hours, stage capacities, and deficits**

Add this test using the shared fixture:

```ts
const rational = (numerator: number, denominator = 1): Rational => ({
  numerator: BigInt(numerator),
  denominator: BigInt(denominator),
});

const hourlyCosts = (cost: Rational): Record<string, Rational> =>
  Object.fromEntries(
    ["person-1", "person-2", "person-3", "person-4"].map((id) => [id, cost]),
  );

it("calculates required hours, capacity, and deficits for all stages", () => {
  const result = calculateDiagnostic(diagnosticCase());

  expect(result).toEqual({
    ok: true,
    value: {
      referenceDate: "2026-10-16",
      legalParameterVersion: "hypothetical-ec141-test",
      stages: [
        {
          stageId: "before-phase-1",
          weeklyLimitHours: rational(44),
          availableHours: rational(176),
          requiredPersonHours: rational(180),
          deficitPersonHours: rational(4),
          hourlyCostByLocalId: hourlyCosts(rational(10)),
        },
        {
          stageId: "phase-1",
          weeklyLimitHours: rational(42),
          availableHours: rational(168),
          requiredPersonHours: rational(180),
          deficitPersonHours: rational(12),
          hourlyCostByLocalId: hourlyCosts(rational(220, 21)),
        },
        {
          stageId: "phase-2",
          weeklyLimitHours: rational(40),
          availableHours: rational(160),
          requiredPersonHours: rational(180),
          deficitPersonHours: rational(20),
          hourlyCostByLocalId: hourlyCosts(rational(11)),
        },
      ],
    },
  });
});
```

`rational(n, d = 1)` constructs `{ numerator: BigInt(n), denominator: BigInt(d) }`; `hourlyCosts(cost)` maps each of `person-1` through `person-4` to the same exact `cost` rational.

- [x] **Step 2: Run the targeted test to verify it fails**

Run: `npm test -- --run tests/unit/diagnostic.test.ts`
Expected: FAIL because `calculate-diagnostic.ts` does not exist.

- [x] **Step 3: Write tests for zero deficit and exact hourly costs**

Add a test where all five coverage intervals require one person instead of four; required hours become 45 and the deficit is zero in all stages. Assert exact hourly costs are `10/1`, `220/21`, and `11/1`, with no cent rounding.

- [x] **Step 4: Write tests for invalid input and missing legal dates**

Assert an invalid reference date returns the validator's `referenceDate` error. For `publicationDate: null` and `publicationDate: "2026-02-29"`, assert `calculateDiagnostic` returns one error with field `legalParameters.publicationDate` and no `value` or partial stages.

- [x] **Step 5: Run the targeted test file again**

Run: `npm test -- --run tests/unit/diagnostic.test.ts`
Expected: FAIL because `src/domain/diagnostic/calculate-diagnostic.ts` is not present; no assertion should pass due to a fallback or placeholder result.

### Task 2: Implement pure diagnostic calculations

**Files:**
- Create: `src/domain/diagnostic/calculate-diagnostic.ts`
- Modify: `src/domain/diagnostic/validate-diagnostic-input.ts` only if a regression test identifies a missing structural guard
- Test: `tests/unit/diagnostic.test.ts`

**Interfaces:**
- Consumes: `DiagnosticInput`, `DiagnosticResult`, and `DiagnosticValidationError` from `./types`.
- Consumes: `getStageDates` from `@/domain/dates/stages`.
- Consumes: `add`, `divide`, and `type Rational` from `@/domain/money/rational`.
- Produces: `calculateDiagnostic(input: DiagnosticInput): Result<DiagnosticResult, DiagnosticValidationError[]>`.

- [x] **Step 1: Calculate weekly required person-hours exactly**

For each coverage interval, construct the rational `{ numerator: BigInt(endMinute - startMinute), denominator: BigInt(60) }`, multiply it by `{ numerator: BigInt(minimumPeople), denominator: BigInt(1) }`, then fold with `add` starting at `{ numerator: BigInt(0), denominator: BigInt(1) }`.

- [x] **Step 2: Resolve all stage dates before producing results**

Call `validateDiagnosticInput(input)` first and return its errors unchanged when `ok` is false. Then call `getStageDates(input.legalParameters)`. If it fails, return one `DiagnosticValidationError` with `field: "legalParameters.publicationDate"` and a message indicating the legal publication date is unavailable or invalid; do not emit partial stages. Use phase dates to establish that both transitions can be resolved before computing output.

- [x] **Step 3: Calculate stage availability, deficit, and hourly cost**

For the tuples `["before-phase-1", weeklyHours.beforePhase1]`, `["phase-1", weeklyHours.phase1]`, and `["phase-2", weeklyHours.phase2]`:
- each employee contributes `min(employee.weeklyHours, stageLimit)` available hours;
- `availableHours` is the exact sum across employees;
- `deficitPersonHours` is `max(0, requiredPersonHours - availableHours)`;
- hourly cost is the exact monthly salary divided by `stageLimit × 5`.

Return the three stage results in chronological order with stable IDs `before-phase-1`, `phase-1`, and `phase-2`, preserving `referenceDate` and `legalParameterVersion`.

- [x] **Step 4: Run diagnostic unit tests**

Run: `npm test -- --run tests/unit/diagnostic.test.ts`
Expected: PASS for all exact arithmetic, zero/positive deficits, and missing-date errors.

### Task 3: Verify adjacent domain behavior

**Files:**
- Test: `tests/unit/diagnostic.test.ts`
- Existing tests: `tests/unit/diagnostic-validation.test.ts`, `tests/unit/stages.test.ts`, `tests/unit/money.test.ts`

**Interfaces:**
- No new public interfaces.

- [x] **Step 1: Run all domain unit tests**

Run: `npm test -- --run`
Result: PASS, 6 test files and 133 tests, including the exact-integer guard test.

- [x] **Step 2: Run TypeScript type checking**

Run: `npm run typecheck`
Result: exit code 0 after the implementation and exact-integer guard test were added.

- [x] **Step 3: Review the patch and whitespace**

Run: `git diff --check`
Result: run after all final edits; require no output and exit code 0.

### Task 4: Update the existing project plan status

**Files:**
- Modify: `docs/superpowers/plans/2026-10-16-copiloto-transicao-6x1.md`

- [x] **Step 1: Mark only the completed diagnostic steps**

After verification, update the Tarefa 5 checklist to reflect the tests and calculation implementation that actually passed. Leave UI, scenario simulation, and GJ-04 release approval tasks unchanged.
