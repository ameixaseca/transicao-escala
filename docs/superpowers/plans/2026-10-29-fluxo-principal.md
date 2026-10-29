# Interface do fluxo principal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the accessible, client-only `/diagnostico` dashboard for manual assumptions, diagnostic results, scenario comparison, and the legal timeline/checklist.

**Architecture:** A client page coordinates state and navigation while focused feature components render and validate each section. Existing pure domain functions remain the only source of legal dates, diagnostics, scenario calculations, and recommendations; the interface stores all user data only in memory.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, React Testing Library, jsdom, and existing exact-rational money/date helpers.

## Global Constraints

- Keep all operational inputs and results in browser memory only; do not add `localStorage`, product cookies, APIs, telemetry, analytics, or third-party integrations.
- Use `PROVISIONAL_LEGAL_PARAMETERS` for the preview with publication date `2026-10-16`, `status: "provisório"`, and the official DOU source; GJ-04 remains a launch blocker.
- Calculate timeline milestones as `16/12/2026` and `16/12/2027`; do not shift dates for weekends or holidays.
- Show all three diagnostic stages; the reference date identifies the applicable stage but does not suppress the other stage results.
- Every compliance check starts as `unknown`; no scenario may be recommended unless the existing domain marks it feasible and recommended.
- Do not request employee names, e-mail, CNPJ, or personal identifiers; generate anonymous labels locally.
- Preserve exact rational/decimal arithmetic through input parsing and calculations; use `formatBRL` only for final monetary display.
- Keep the dashboard usable at 390 × 844 and 1440 × 900 with no horizontal overflow; end-to-end privacy and viewport verification remains in Task 8 of the main plan.
- Do not add a dependency for this task.

---

## File map

- Modify `src/domain/legal/legal-parameters.ts`: versioned provisional EC 141 metadata used by the UI.
- Create `src/features/assumptions/form-values.ts`: typed raw form values and exact conversion/validation into `DiagnosticInput`.
- Create `src/features/assumptions/assumptions-form.tsx`: accessible editable employee and coverage rows.
- Create `src/features/diagnostic/format-hours.ts`: exact rational hour formatting for display.
- Create `src/features/diagnostic/diagnostic-panel.tsx`: three stage summaries and reference-stage indication.
- Create `src/features/scenarios/form-values.ts`: exact conversion of financial fields and stage check states to `ScenarioAssumptions`.
- Create `src/features/scenarios/scenario-comparison.tsx`: financial controls, per-stage compliance matrix, and four scenario cards.
- Create `src/features/timeline/transition-week.ts`: civil-date calculation of the Monday–Sunday transition week.
- Create `src/features/timeline/legal-timeline.tsx`: provisional dates, warnings, and in-memory checklist.
- Create `src/components/error-summary.tsx`: accessible summary of field errors with links to controls.
- Create `src/app/diagnostico/page.tsx`: client-side state coordinator and dashboard navigation.
- Modify `src/app/page.tsx`: add a visible link to `/diagnostico`.
- Modify `src/app/globals.css`: dashboard layout, mobile navigation, forms, cards, and responsive states.
- Modify `tests/unit/legal-parameters.test.ts` and `tests/unit/stages.test.ts`; create focused unit/component tests under `tests/components/` and `tests/unit/`.

## Task 1: Configure the provisional EC 141 parameters

**Files:**
- Modify: `src/domain/legal/legal-parameters.ts`
- Test: `tests/unit/legal-parameters.test.ts`
- Test: `tests/unit/stages.test.ts`

**Interfaces:**
- Consumes: `LegalParameters`, `getStageDates`, and `getWeeklyHourLimit`.
- Produces: `PROVISIONAL_LEGAL_PARAMETERS` identifying EC 141 with publication date `2026-10-16`; its status remains `provisório`.

- [ ] **Step 1: Add failing assertions for the provisional source record and calculated dates**

Add these assertions to the existing test suites:

```ts
expect(PROVISIONAL_LEGAL_PARAMETERS).toMatchObject({
  version: "ec-141-provisional",
  status: "provisório",
  sourceUrl:
    "https://www.in.gov.br/en/web/dou/-/emenda-constitucional-n-141-738818165",
  publicationDate: "2026-10-16",
});

expect(getStageDates(PROVISIONAL_LEGAL_PARAMETERS)).toEqual({
  ok: true,
  value: { phase1: "2026-12-16", phase2: "2027-12-16" },
});
```

- [ ] **Step 2: Run the targeted tests and confirm they fail**

Run: `npm test -- --run tests/unit/legal-parameters.test.ts tests/unit/stages.test.ts`

Expected: the new source-record and actual-parameter date assertions fail because the existing publication date is `null` and the version points to the Senate draft.

- [ ] **Step 3: Update only the provisional parameter metadata**

Set the existing object to:

```ts
export const PROVISIONAL_LEGAL_PARAMETERS: LegalParameters = Object.freeze({
  version: "ec-141-provisional",
  status: "provisório",
  sourceUrl:
    "https://www.in.gov.br/en/web/dou/-/emenda-constitucional-n-141-738818165",
  publicationDate: "2026-10-16",
  weeklyHours: Object.freeze({
    beforePhase1: 44,
    phase1: 42,
    phase2: 40,
  }),
});
```

Do not change `getParametersForDate` to accept provisional records as approved. Its existing `no-approved-parameters` behavior remains required.

- [ ] **Step 4: Run targeted tests and typecheck**

Run: `npm test -- --run tests/unit/legal-parameters.test.ts tests/unit/stages.test.ts`

Expected: all selected tests pass, including the test proving a provisional record is still not selected as approved.

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 5: Commit the isolated parameter update**

```powershell
git add src/domain/legal/legal-parameters.ts tests/unit/legal-parameters.test.ts tests/unit/stages.test.ts
git commit -m "fix(legal): configure provisional EC 141 publication date" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 2: Parse manual assumptions without floating-point money conversion

**Files:**
- Create: `src/features/assumptions/form-values.ts`
- Test: `tests/unit/assumptions-form-values.test.ts`

**Interfaces:**
- Consumes: `parseDecimal`, `validateDiagnosticInput`, `LegalParameters`, `Result`, `Rational`, and `DiagnosticValidationError`.
- Produces:

```ts
export type EmployeeFormValue = {
  localId: string;
  salary: string;
  weeklyHours: string;
  contractType: "full-time" | "part-time";
};

export type CoverageFormValue = {
  rowId: string;
  weekday: string;
  startTime: string;
  endTime: string;
  minimumPeople: string;
};

export type DiagnosticFormValues = {
  referenceDate: string;
  employees: EmployeeFormValue[];
  coverage: CoverageFormValue[];
};

export function parseDiagnosticForm(
  values: DiagnosticFormValues,
  legalParameters: LegalParameters,
): Result<DiagnosticInput, DiagnosticValidationError[]>;
```

- [ ] **Step 1: Write unit tests for successful parsing and field errors**

Use this valid form fixture in the test:

```ts
const validValues: DiagnosticFormValues = {
  referenceDate: "2026-12-16",
  employees: [{
    localId: "person-1",
    salary: "2.200,50",
    weeklyHours: "42",
    contractType: "full-time",
  }],
  coverage: [{
    rowId: "coverage-1",
    weekday: "1",
    startTime: "09:00",
    endTime: "18:00",
    minimumPeople: "1",
  }],
};
```

Assert that salary becomes `{ numerator: 4401n, denominator: 2n }`, time fields become 540 and 1080 minutes, and `localId` remains `person-1`. Add cases for malformed Brazilian decimals, zero/negative salary or hours, invalid civil date, malformed time, non-positive minimum people, and empty employee/coverage lists; each failure must identify the corresponding form field or group.

- [ ] **Step 2: Run the new unit test and confirm it fails**

Run: `npm test -- --run tests/unit/assumptions-form-values.test.ts`

Expected: FAIL because the parser module does not exist.

- [ ] **Step 3: Implement typed parsing with explicit field errors**

Parse monetary and hour decimals with `parseDecimal`. Catch only `SyntaxError` from malformed user text and turn it into a field error; rethrow unexpected exceptions. Use this helper for every monetary/hour field:

```ts
const readDecimal = (
  text: string,
  field: string,
  errors: DiagnosticValidationError[],
): Rational | undefined => {
  try {
    return parseDecimal(text);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    errors.push({
      field,
      message: "Informe um número no formato brasileiro, por exemplo 2.200,50.",
    });
    return undefined;
  }
};
```

Implement the exported parser with these exact rules:

1. Parse every employee `salary` and `weeklyHours` using `readDecimal`; retain field paths such as `employees[0].salary`.
2. Parse time values with `/^([01]\d|2[0-3]):([0-5]\d)$/`; only an end time may additionally equal `24:00`. Convert a match to `hours * 60 + minutes`.
3. Parse weekday and minimum-person text with `/^(0|[1-9]\d*)$/`, convert only these bounded integers with `Number`, and reject unsafe integers, weekdays outside 0–6, and minimum people below 1.
4. Build `DiagnosticInput` only if all raw fields parsed. Use each row's `localId`, `contractType`, and parsed values; map coverage to `weekday`, `startMinute`, `endMinute`, and `minimumPeople`; pass `legalParameters` through unchanged.
5. Return accumulated parse errors before domain validation. Otherwise call `validateDiagnosticInput(input)`; map domain paths `coverage[i].startMinute` and `coverage[i].endMinute` to the corresponding form paths `coverage[i].startTime` and `coverage[i].endTime`, then return the errors or `{ ok: true, value: input }`.

An empty employee list or coverage list is a form error because it cannot produce a meaningful staffing diagnosis. Do not use `parseFloat`, `Number` for monetary/hour decimals, or success-shaped fallback values.

- [ ] **Step 4: Run the new test and related domain tests**

Run: `npm test -- --run tests/unit/assumptions-form-values.test.ts tests/unit/diagnostic-validation.test.ts`

Expected: all selected tests pass.

- [ ] **Step 5: Commit the parsing boundary**

```powershell
git add src/features/assumptions/form-values.ts tests/unit/assumptions-form-values.test.ts
git commit -m "feat(assumptions): parse manual diagnostic inputs" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 3: Build the accessible assumptions form and reusable error summary

**Files:**
- Create: `src/features/assumptions/assumptions-form.tsx`
- Create: `src/components/error-summary.tsx`
- Test: `tests/components/assumptions-form.test.tsx`
- Test: `tests/components/error-summary.test.tsx`

**Interfaces:**
- `AssumptionsForm` receives controlled `DiagnosticFormValues`, `onChange`, `onSubmit`, and field errors.
- `ErrorSummary` receives `ReadonlyArray<{ field: string; message: string }>`; each link targets the corresponding input `id`.

- [ ] **Step 1: Add component tests for required controls and privacy**

Test that the form renders labeled reference-date, salary, weekly-hours, contract-type, weekday, start, end, and minimum-people controls; that users can add/remove employee and coverage rows; that the last row cannot be removed; and that no name, e-mail, or CNPJ field exists. Test that errors render beside their controls with `aria-describedby` and `aria-invalid`. Use matching `fieldIdFor("coverage[0].startTime")` and `fieldIdFor("coverage[0].endTime")` IDs even when the underlying domain errors refer to minute fields.

Test the error summary with two errors and verify each link has an `href` matching the error field's input `id`.

- [ ] **Step 2: Run both component tests and confirm they fail**

Run: `npm test -- --run tests/components/assumptions-form.test.tsx tests/components/error-summary.test.tsx`

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement the controlled form and error summary**

Use semantic `<fieldset>`/`<legend>` groups, explicit `<label>` elements, `inputMode="decimal"` for decimal strings, and stable generated `localId` values such as `person-1`. Display local employee labels “Pessoa 1”, “Pessoa 2”, etc.; never collect personal identifiers.

Use one exported ID helper in `error-summary.tsx` for both form controls and summary links:

```ts
export const fieldIdFor = (field: string): string =>
  `field-${field.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
```

Render the shared error summary as:

```tsx
<section aria-labelledby="error-summary-title" role="alert">
  <h2 id="error-summary-title">Revise os campos indicados</h2>
  <ul>
    {errors.map((error) => (
      <li key={`${error.field}:${error.message}`}>
        <a href={`#${fieldIdFor(error.field)}`}>{error.message}</a>
      </li>
    ))}
  </ul>
</section>
```

Keep values controlled by the parent. Every add/remove/edit calls `onChange`; submission passes raw values to the coordinator and does not calculate or persist data in the component.

- [ ] **Step 4: Run the component tests and typecheck**

Run: `npm test -- --run tests/components/assumptions-form.test.tsx tests/components/error-summary.test.tsx`

Expected: all selected component tests pass with no missing-label warnings.

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 5: Commit the accessible form**

```powershell
git add src/features/assumptions/assumptions-form.tsx src/components/error-summary.tsx tests/components/assumptions-form.test.tsx tests/components/error-summary.test.tsx
git commit -m "feat(assumptions): add accessible manual input form" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 4: Render the three-stage diagnostic

**Files:**
- Create: `src/features/diagnostic/format-hours.ts`
- Create: `src/features/diagnostic/diagnostic-panel.tsx`
- Test: `tests/unit/format-hours.test.ts`
- Test: `tests/components/diagnostic-panel.test.tsx`

**Interfaces:**
- Consumes: `DiagnosticResult`, `LegalParameters`, `getWeeklyHourLimit`, and `formatBRL`.
- Produces: a panel with cards for `before-phase-1`, `phase-1`, and `phase-2`, plus a displayed reference-stage label.

- [ ] **Step 1: Write formatting and panel tests**

Test exact rational hour display, including `{ numerator: 85n, denominator: 2n }` rendered as `42,50 h`, and test all three stage cards with weekly limit, available hours, required person-hours, deficit, and costs by anonymous label. Test that the reference date highlights one stage without hiding the other two. Test that missing diagnostic data renders a pending message.

- [ ] **Step 2: Run targeted tests and confirm they fail**

Run: `npm test -- --run tests/unit/format-hours.test.ts tests/components/diagnostic-panel.test.tsx`

Expected: FAIL because the formatter and panel do not exist.

- [ ] **Step 3: Implement exact display formatting and presentation**

Use `roundHalfEven` only at display time to format rational hours with two decimal places. Format monetary values with `formatBRL`. Use a fixed label map for stage IDs and call `getWeeklyHourLimit(referenceDate, legalParameters)` for the applicable-stage indicator; on `Result` error, render an explicit unavailable state.

```tsx
const stages = [
  { id: "before-phase-1", label: "Antes da etapa 1" },
  { id: "phase-1", label: "Etapa 1" },
  { id: "phase-2", label: "Etapa 2" },
] as const;
```

The panel displays only supplied domain results; it must not recompute hours, deficits, costs, or legal rules.

- [ ] **Step 4: Run targeted tests and typecheck**

Run: `npm test -- --run tests/unit/format-hours.test.ts tests/components/diagnostic-panel.test.tsx`

Expected: all selected tests pass.

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 5: Commit the diagnostic presentation**

```powershell
git add src/features/diagnostic/format-hours.ts src/features/diagnostic/diagnostic-panel.tsx tests/unit/format-hours.test.ts tests/components/diagnostic-panel.test.tsx
git commit -m "feat(diagnostic): display results for each legal stage" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 5: Implement scenario assumptions, checks, and comparison cards

**Files:**
- Create: `src/features/scenarios/form-values.ts`
- Create: `src/features/scenarios/scenario-comparison.tsx`
- Test: `tests/unit/scenario-form-values.test.ts`
- Test: `tests/components/scenario-comparison.test.tsx`

**Interfaces:**
- `ScenarioFormValues` contains `replacementSalary`, `employerChargesPercent`, and `monthlyRevenueLoss`, each as a raw string.
- `parseScenarioFormValues(values, stageIds, checksByStage)` returns parsed assumptions or `ScenarioFormParseError[]` for malformed text.
- `ScenarioComparison` receives controlled values, optional stage IDs, check statuses, results, field errors, and callbacks. Without a valid diagnostic it shows pending results and does not render stage checks or invoke the simulator.
- The page calls `simulateScenarios(diagnostic, assumptions)`; the component does not compute costs or recommendations.

```ts
export type ScenarioFormParseError = {
  field: string;
  message: string;
};

export type ScenarioFormValues = {
  replacementSalary: string;
  employerChargesPercent: string;
  monthlyRevenueLoss: string;
};

export function parseScenarioFormValues(
  values: ScenarioFormValues,
  stageIds: string[],
  checksByStage: ScenarioAssumptions["checksByStage"],
): Result<ScenarioAssumptions, ScenarioFormParseError[]>;
```

- [ ] **Step 1: Write parser and component tests**

Test that Brazilian decimal inputs parse exactly, including converting a displayed charge percentage of `"20"` to rate `{ numerator: 1n, denominator: 5n }`. Malformed text must return a field error. Separately test that `simulateScenarios` reports the domain's existing errors for non-positive replacement salary and negative charge/loss values; do not duplicate those domain constraints in the form parser.

For each stage, test the five labeled radio groups with choices **Válido**, **Inválido**, **Não verificado**, initially set to **Não verificado**. Test display of all four scenarios, costs, domain reasons, feasibility labels, and exactly the recommendation indicated by `recommendedScenarioId`. Unknown checks must leave results incomplete and must not show a recommendation.

- [ ] **Step 2: Run targeted tests and confirm they fail**

Run: `npm test -- --run tests/unit/scenario-form-values.test.ts tests/components/scenario-comparison.test.tsx`

Expected: FAIL because the parser and component do not exist.

- [ ] **Step 3: Implement exact scenario parsing and controlled controls**

Convert all three financial strings with `parseDecimal`; catch only `SyntaxError` and associate the field error with that control. Convert the entered percentage to a rational rate by dividing its parsed rational by `{ numerator: 100n, denominator: 1n }`. For each stage ID, construct all five check IDs and use the controlled status or `"unknown"` if absent. Return `ScenarioAssumptions` only if all strings parsed; let `simulateScenarios` remain responsible for positive/nonnegative constraints and return its field errors unchanged to the coordinator.

Render each check as a labeled radio group with these exact values:

```ts
const statuses = [
  { value: "valid", label: "Válido" },
  { value: "invalid", label: "Inválido" },
  { value: "unknown", label: "Não verificado" },
] as const;
```

Translate domain statuses to **Viável**, **Inviável**, **Incompleto**, and **Não necessário**. Mark recommendations only when the domain sets the result's `recommended` flag; use text/icon as well as color.

- [ ] **Step 4: Run targeted tests and typecheck**

Run: `npm test -- --run tests/unit/scenario-form-values.test.ts tests/components/scenario-comparison.test.tsx`

Expected: all selected tests pass.

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 5: Commit the scenario controls**

```powershell
git add src/features/scenarios/form-values.ts src/features/scenarios/scenario-comparison.tsx tests/unit/scenario-form-values.test.ts tests/components/scenario-comparison.test.tsx
git commit -m "feat(scenarios): add assumptions and compliance controls" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 6: Implement the provisional legal timeline and checklist

**Files:**
- Create: `src/features/timeline/transition-week.ts`
- Create: `src/features/timeline/legal-timeline.tsx`
- Test: `tests/unit/transition-week.test.ts`
- Test: `tests/components/legal-timeline.test.tsx`

**Interfaces:**
- Consumes: `LegalParameters`, `getStageDates`, and in-memory checklist state keyed by stage and item.
- Produces: two milestone entries with transition-week dates, parameter version/status, five operational checklist items, and explicit date errors.

- [ ] **Step 1: Write tests for transition weeks and timeline states**

Test that `2026-12-16` yields Monday–Sunday `2026-12-14` through `2026-12-20`, and `2027-12-16` yields `2027-12-13` through `2027-12-19`. Test that both milestone dates come from `getStageDates`, the warning includes the provisional parameter status and GJ-04 blocker, checklist items start unchecked, toggling one item does not affect another, and a `publication-date-required` error is shown rather than replaced by a fallback date.

- [ ] **Step 2: Run targeted tests and confirm they fail**

Run: `npm test -- --run tests/unit/transition-week.test.ts tests/components/legal-timeline.test.tsx`

Expected: FAIL because the transition-week helper and timeline do not exist.

- [ ] **Step 3: Implement the date-only helper and timeline**

Calculate weeks using UTC civil-date operations, not local-time arithmetic: find the Monday containing the milestone and add six civil days for Sunday. `LegalTimeline` calls `getStageDates(parameters)` and renders an explicit error for every non-success result.

Render each milestone checklist with stable IDs for these items: `collective-agreement`, `rests-and-breaks`, `sector-sundays-holidays`, `salary-and-divisor`, and `special-regimes`. Keep completion state in the page coordinator; the component receives checked values and emits changes. Include the approved transition notice and state that checking an item is not legal approval.

- [ ] **Step 4: Run targeted tests and typecheck**

Run: `npm test -- --run tests/unit/transition-week.test.ts tests/components/legal-timeline.test.tsx`

Expected: all selected tests pass.

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 5: Commit the timeline**

```powershell
git add src/features/timeline/transition-week.ts src/features/timeline/legal-timeline.tsx tests/unit/transition-week.test.ts tests/components/legal-timeline.test.tsx
git commit -m "feat(timeline): show provisional milestones and checklist" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 7: Compose the dashboard and preserve privacy through state changes

**Files:**
- Create: `src/app/diagnostico/page.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/components/diagnostico-page.test.tsx`
- Modify: `tests/unit/smoke.test.tsx`

**Interfaces:**
- The page owns raw assumption strings, current results, scenario assumptions/checks, checklist state, navigation selection, and displayed errors.
- It calls `parseDiagnosticForm`, `calculateDiagnostic`, `parseScenarioFormValues`, and `simulateScenarios`; all computations stay in existing domain services.
- Feature components receive props/callbacks only; no feature component writes to browser storage or starts network requests.

- [ ] **Step 1: Write dashboard integration tests**

Test the initial **Premissas** section, access to all four sections, the provisional legal warning, and a root-page link to `/diagnostico`. Test valid form submission displays all three diagnostic stages; financial inputs are editable while scenario results remain pending before a valid diagnostic; invalid scenario financial assumptions show the domain errors; unknown checks produce no recommendation; changing a diagnostic premise clears diagnostic/scenario results; changing a scenario assumption or check status clears only scenario results; and the timeline remains accessible before a valid diagnostic.

- [ ] **Step 2: Run integration tests and confirm they fail**

Run: `npm test -- --run tests/components/diagnostico-page.test.tsx tests/unit/smoke.test.tsx`

Expected: FAIL because the route and dashboard link do not exist.

- [ ] **Step 3: Implement the client coordinator and root entry**

Initialize the reference date with `getTodayInSaoPaulo`; if it returns an error, show the error and do not invent a date. Pass `PROVISIONAL_LEGAL_PARAMETERS` explicitly to diagnostic and timeline functions, and display its provisional status on the page.

Use semantic navigation links for **Premissas**, **Diagnóstico**, **Cenários**, and **Linha do tempo**. Keep all sections mounted/accessible and mark results pending until their dependencies are valid. In each input change handler, clear only the derived result that depends on the changed input; on diagnostic premise changes clear both diagnostic and scenario results.

Add a root CTA using `next/link`:

```tsx
<Link href="/diagnostico/">Começar diagnóstico</Link>
```

Style a fixed desktop sidebar and compact mobile navigation in `globals.css`; at narrow widths, stack cards and form fields, constrain tables/cards to the viewport, and never rely on horizontal scrolling to reach controls.

- [ ] **Step 4: Run integration tests, the complete component suite, typecheck, and build**

Run: `npm test -- --run tests/components/diagnostico-page.test.tsx tests/unit/smoke.test.tsx`

Expected: selected integration tests pass.

Run: `npm test -- --run tests/components`

Expected: all component tests pass with no accessibility-label failures.

Run: `npm run typecheck`

Expected: exit code 0.

Run: `npm run build`

Expected: static build succeeds and includes `/diagnostico/`.

- [ ] **Step 5: Commit the integrated dashboard**

```powershell
git add src/app/diagnostico/page.tsx src/app/page.tsx src/app/globals.css tests/components/diagnostico-page.test.tsx tests/unit/smoke.test.tsx
git commit -m "feat(ui): compose the transition diagnostic dashboard" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Final verification

- [ ] Run `npm test -- --run`; expect all unit and component tests to pass.
- [ ] Run `npm run typecheck`; expect exit code 0.
- [ ] Run `npm run build`; expect a successful static build including `/diagnostico/`.
- [ ] Confirm no test or implementation uses `localStorage`, cookies, API routes, analytics, or third-party services for operational data.
- [ ] Leave Playwright privacy/network inspection and 390 × 844 / 1440 × 900 verification for the main plan's Task 8; do not claim those release gates passed from component tests.
