# Optional Local Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit, local-only saving and automatic restoration of valid anonymous diagnostic assumptions, with reliable deletion and visible storage failures.

**Architecture:** A typed storage adapter owns one namespaced `localStorage` record and validates it at runtime. A form-values adapter converts only valid diagnostic assumptions to and from that record. The dashboard coordinates initial restoration, manual save, deletion, and reset; a presentational component renders accessible controls.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, React Testing Library, Playwright, existing `Result` and exact-decimal helpers. No new dependency.

## Global Constraints

- A persistência é manual e contém somente os campos listados acima.
- Nenhum dado é gravado antes do clique explícito.
- Alterações posteriores não são salvas automaticamente e não substituem o registro anterior enquanto as premissas atuais forem inválidas.
- Não são persistidos nomes, e-mails, CNPJ, premissas financeiras de cenários, resultados, checks de conformidade nem checklist da linha do tempo.
- O mecanismo não promete criptografia nem proteção contra outras pessoas com acesso ao mesmo perfil do navegador.
- Erros são apresentados ao usuário; não há fallback com aparência de sucesso.
- A aplicação não envia dados operacionais por rede e não adiciona sincronização, telemetria, analytics ou API.
- Se `legalParameterVersion` diferir dos parâmetros carregados na aplicação, as premissas ainda são restauradas, mas a interface avisa que o diagnóstico deve ser recalculado com a versão atual. Nenhum resultado jurídico antigo é restaurado.
- The current legal parameters remain provisional; do not change legal calculations or release status.
- Do not add a dependency.

---

## File map

- Create `src/features/local-data/local-data-store.ts`: storage record type, namespaced key, runtime validation, and save/load/clear operations.
- Create `src/features/local-data/form-values.ts`: exact mapping between validated diagnostic form values and the persisted record.
- Create `src/features/local-data/data-controls.tsx`: accessible save/delete controls, confirmation, and status/error messages.
- Modify `src/app/diagnostico/page.tsx`: restore on mount, coordinate save/delete, and reset all active state after successful deletion.
- Create `tests/unit/local-data-store.test.ts`: storage adapter tests.
- Create `tests/unit/local-data-form-values.test.ts`: exact form mapping tests.
- Create `tests/components/data-controls.test.tsx`: accessible controls and status behavior.
- Create `tests/e2e/local-data.spec.ts`: manual save, restoration, and deletion flows.
- Modify `tests/e2e/privacy.spec.ts`: assert unsaved edits remain memory-only and saved values are never sent over the network.
- Update `docs/superpowers/plans/2026-10-16-copiloto-transicao-6x1.md`: mark only verified Task 9 requirements complete.

---

## Task 1: Implement the validated local storage adapter

**Files:**
- Create: `src/features/local-data/local-data-store.ts`
- Test: `tests/unit/local-data-store.test.ts`

**Interfaces:**
- Consumes: `CoverageAssumption` from `src/domain/diagnostic/types.ts` and `Result<T, E>` from `src/domain/result.ts`.
- Produces:

```ts
export type PersistableAssumptions = {
  schemaVersion: 1;
  savedAt: string;
  assumptions: {
    employeeRows: Array<{
      localId: string;
      salaryDecimal: string;
      weeklyHoursDecimal: string;
      contractType: "full-time" | "part-time";
    }>;
    coverage: CoverageAssumption[];
    referenceDate: string;
    legalParameterVersion: string;
  };
};

export type StorageError = {
  code: "unavailable" | "quota" | "invalid-data";
  message: string;
};

export function saveLocalAssumptions(
  value: PersistableAssumptions,
): Result<void, StorageError>;

export function loadLocalAssumptions():
  Result<PersistableAssumptions | null, StorageError>;

export function clearLocalAssumptions(): Result<void, StorageError>;
```

- Store one JSON value under the namespaced key `transicao-escala:assumptions`. Never call `localStorage.clear()`.
- Define `const STORAGE_KEY = "transicao-escala:assumptions";` in the store module and use it for all three operations.
- Validate parsed JSON at runtime before returning it: schema version is exactly `1`; `savedAt` is a valid ISO timestamp; employee rows have non-empty local IDs, valid decimal strings, and supported contract types; coverage values are safe integers with weekday `0..6`, start minute `0..1439`, end minute `0..1440`, and minimum people at least `1`; reference date is a valid `YYYY-MM-DD`; legal-parameter version is a non-empty string.
- A missing key returns `{ ok: true, value: null }`. Invalid JSON or unsupported/malformed data returns `invalid-data`. Storage access failures return `unavailable`; quota exceptions on save return `quota`.
- Catch only storage/JSON operations needed to produce the declared errors. Do not mask unrelated programming errors.

- [ ] **Step 1: Write store tests first**

Add a valid fixture and tests for a successful round trip, missing data, deletion that preserves an unrelated local-storage key, invalid JSON, old schema version, and write failures. Example fixture:

```ts
const record: PersistableAssumptions = {
  schemaVersion: 1,
  savedAt: "2026-10-29T20:00:00.000Z",
  assumptions: {
    employeeRows: [
      {
        localId: "person-1",
        salaryDecimal: "2.200,50",
        weeklyHoursDecimal: "44",
        contractType: "full-time",
      },
    ],
    coverage: [
      { weekday: 1, startMinute: 540, endMinute: 1080, minimumPeople: 1 },
    ],
    referenceDate: "2026-10-29",
    legalParameterVersion: "ec-141-provisional",
  },
};
```

- [ ] **Step 2: Run the store test and confirm it fails for missing exports**

Run: `npm test -- --run tests/unit/local-data-store.test.ts`

Expected: FAIL because the store module and its functions do not exist.

- [ ] **Step 3: Implement the smallest storage adapter**

Implement the declared types, key, validator, and three `Result`-returning operations. Use `JSON.parse` as `unknown` followed by explicit guards; do not cast parsed data directly to `PersistableAssumptions`.

The load path must distinguish a missing value, malformed JSON, invalid schema, and storage-access failure:

```ts
const isStorageAccessError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "SecurityError";

if (typeof window === "undefined") {
  return {
    ok: false,
    error: {
      code: "unavailable",
      message: "O armazenamento local não está disponível neste navegador.",
    },
  };
}

let raw: string | null;
try {
  raw = window.localStorage.getItem(STORAGE_KEY);
} catch (error) {
  if (isStorageAccessError(error)) {
    return {
      ok: false,
      error: {
        code: "unavailable",
        message: "O armazenamento local não está disponível neste navegador.",
      },
    };
  }
  throw error;
}
if (raw === null) return { ok: true, value: null };

let parsed: unknown;
try {
  parsed = JSON.parse(raw);
} catch (error) {
  if (!(error instanceof SyntaxError)) throw error;
  return {
    ok: false,
    error: {
      code: "invalid-data",
      message: "Os dados salvos não podem ser lidos.",
    },
  };
}

if (!isPersistableAssumptions(parsed)) {
  return {
    ok: false,
    error: {
      code: "invalid-data",
      message: "Os dados salvos não são compatíveis com esta versão.",
    },
  };
}
return { ok: true, value: parsed };
```

Wrap the `window.localStorage` access and its method calls separately so a
`SecurityError` maps to `unavailable`; map a save-time `QuotaExceededError` to
`quota`. Do not catch validation/programming errors as storage failures.

- [ ] **Step 4: Run the store tests**

Run: `npm test -- --run tests/unit/local-data-store.test.ts`

Expected: all store tests pass, including quota/security failures and preservation of unrelated keys.

- [ ] **Step 5: Commit the storage adapter**

```powershell
git add src/features/local-data/local-data-store.ts tests/unit/local-data-store.test.ts
git commit -m "feat(storage): add validated local assumptions store" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 2: Map validated form values and integrate accessible controls

**Files:**
- Create: `src/features/local-data/form-values.ts`
- Create: `src/features/local-data/data-controls.tsx`
- Modify: `src/app/diagnostico/page.tsx`
- Test: `tests/unit/local-data-form-values.test.ts`
- Test: `tests/components/data-controls.test.tsx`
- Modify: `tests/components/diagnostico-page.test.tsx`
- Test: `tests/e2e/local-data.spec.ts`
- Modify: `tests/e2e/privacy.spec.ts`

**Interfaces:**
- Consumes: `DiagnosticFormValues`, `parseDiagnosticForm`, `PROVISIONAL_LEGAL_PARAMETERS`, and the Task 1 store API.
- Produces:

```ts
export function toPersistableAssumptions(
  values: DiagnosticFormValues,
  legalParameterVersion: string,
  savedAt: string,
): Result<PersistableAssumptions, DiagnosticValidationError[]>;

export function fromPersistableAssumptions(
  value: PersistableAssumptions,
): DiagnosticFormValues;
```

- `toPersistableAssumptions` validates with `parseDiagnosticForm`; it retains each valid salary/hour decimal string exactly and stores parsed coverage values as integer minutes.
- `fromPersistableAssumptions` restores salary/hour strings and employee `localId` values exactly, maps stored coverage minutes back to `HH:mm` (`1440` becomes `24:00`), generates local UI `rowId` values for coverage by row order, and restores the reference date.
- The controls receive props/callbacks only. The page handles storage operations and state transitions.
- Keep storage errors separate from diagnostic field errors. Present them in an accessible live status/error region.

- [ ] **Step 1: Add failing round-trip tests for form mapping**

Test exact decimal-string preservation, conversion of coverage to minutes and back (including `24:00`), reference-date restoration, and rejection of invalid diagnostic form values.

- [ ] **Step 2: Run the mapper test and confirm it fails**

Run: `npm test -- --run tests/unit/local-data-form-values.test.ts`

Expected: FAIL because the mapper module does not exist.

- [ ] **Step 3: Implement form mapping**

Implement the two functions using `parseDiagnosticForm`; do not call `calculateDiagnostic` as a prerequisite for saving.

The serializer uses the existing parser for semantic validation and retains
validated decimal strings verbatim:

```ts
const parsed = parseDiagnosticForm(values, PROVISIONAL_LEGAL_PARAMETERS);
if (!parsed.ok) return parsed;

return {
  ok: true,
  value: {
    schemaVersion: 1,
    savedAt,
    assumptions: {
      employeeRows: values.employees.map((employee) => ({
        localId: employee.localId,
        salaryDecimal: employee.salary,
        weeklyHoursDecimal: employee.weeklyHours,
        contractType: employee.contractType,
      })),
      coverage: parsed.value.coverage,
      referenceDate: parsed.value.referenceDate,
      legalParameterVersion,
    },
  },
};
```

- [ ] **Step 4: Run the mapper test**

Run: `npm test -- --run tests/unit/local-data-form-values.test.ts`

Expected: all mapping tests pass without decimal precision loss.

- [ ] **Step 5: Add failing UI and browser tests before implementation**

Test that the save control is disabled for invalid premises, invokes the save callback when enabled, and renders success/error messages. Test that the page restores valid saved assumptions before enabling edits and displays a parameter-version mismatch notice without restoring results.

In `local-data.spec.ts`, test a valid manual save, reload restoration of diagnostic assumptions, scenario inputs returning to defaults, confirmation cancellation preserving the stored record, and confirmed deletion clearing the stored record and active form. The confirmed-delete test must first populate scenario inputs, calculate results, mark a compliance check and timeline item, then confirm deletion and verify diagnostic inputs, scenario inputs, results, checks, and checklist all reset. Reload and verify the saved key is absent and defaults remain.

Update `privacy.spec.ts` to assert that editing valid assumptions without pressing **Salvar neste navegador** creates no storage record. During explicit save, capture requests and assert the saved salary, coverage values, and result values are absent from all request URLs/bodies, including external-origin requests. Keep existing no-network assertions.

Use a unique valid value and inspect the single namespaced key after both edits
and save:

```ts
await page.getByLabel("Salário mensal — Pessoa 1").fill("98765,43");
expect(await page.evaluate(() => localStorage.getItem("transicao-escala:assumptions"))).toBeNull();
await page.getByRole("button", { name: "Salvar neste navegador" }).click();
await expect
  .poll(() => page.evaluate(() => localStorage.getItem("transicao-escala:assumptions")))
  .toContain("98765,43");
```

- [ ] **Step 6: Run component tests and confirm they fail**

Run: `npm test -- --run tests/components/data-controls.test.tsx tests/components/diagnostico-page.test.tsx`

Expected: FAIL because the controls and restoration integration do not exist.

- [ ] **Step 7: Run browser tests and confirm they fail meaningfully**

Run: `npm run test:e2e -- local-data.spec.ts privacy.spec.ts`

Expected: Playwright discovers and runs the tests; persistence flows fail because the save/delete controls are not present. Test-discovery errors are not an acceptable RED result.

- [ ] **Step 8: Implement the controls and page integration**

Add a `storageReady` state initialized to `false`; while false, render a loading status and no editable dashboard controls. Load once in `useEffect`, apply valid restored values, then render the dashboard. With no record, retain current defaults. On malformed data or storage error, keep the page usable with defaults, display the returned error, and render the dashboard after the read completes.

The effect handles all three result shapes explicitly and enables the dashboard
after applying the outcome:

```ts
useEffect(() => {
  const loaded = loadLocalAssumptions();
  if (loaded.ok && loaded.value) {
    setValues(fromPersistableAssumptions(loaded.value));
    setHasSavedData(true);
    setSavedAt(loaded.value.savedAt);
    if (loaded.value.assumptions.legalParameterVersion !== PROVISIONAL_LEGAL_PARAMETERS.version) {
      setStorageNotice(versionMismatchMessage);
    }
  } else if (!loaded.ok) {
    setStorageError(loaded.error.message);
  }
  setStorageReady(true);
}, []);
```

The save handler must validate current form values, serialize with the current legal-parameter version and `new Date().toISOString()`, then call `saveLocalAssumptions`. Show success and `savedAt` only after a successful result.

Add a native accessible `window.confirm` confirmation before `clearLocalAssumptions`. On success, reset diagnostic values, results/errors, scenario values/results/errors, checks, timeline checklist, and section selection to initial state. On failure, preserve all active state and display the error.

The save button is enabled only when `parseDiagnosticForm` succeeds. No result calculation is required. Editing after a successful save does not write automatically. A handler follows this result boundary:

```ts
const saved = saveLocalAssumptions(record);
if (saved.ok) {
  setHasSavedData(true);
  setSavedAt(record.savedAt);
  setStorageError(null);
} else {
  setStorageError(saved.error.message);
}
```

- [ ] **Step 9: Run the component and mapper tests**

Run: `npm test -- --run tests/components/data-controls.test.tsx tests/components/diagnostico-page.test.tsx tests/unit/local-data-form-values.test.ts`

Expected: all selected tests pass, including save validation, restoration gating, and reset-on-delete behavior.

Run: `npm run test:e2e -- local-data.spec.ts privacy.spec.ts`

Expected: all persistence and privacy tests pass against the static export served by Playwright.

- [ ] **Step 10: Commit the controls and integration**

```powershell
git add src/features/local-data/form-values.ts src/features/local-data/data-controls.tsx src/app/diagnostico/page.tsx tests/unit/local-data-form-values.test.ts tests/components/data-controls.test.tsx tests/components/diagnostico-page.test.tsx tests/e2e/local-data.spec.ts tests/e2e/privacy.spec.ts
git commit -m "feat(ui): add opt-in local data controls" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 3: Run full regression gates and record Task 9 completion

**Files:**
- Modify: `docs/superpowers/plans/2026-10-16-copiloto-transicao-6x1.md`

**Interfaces:**
- Consumes: completed store, form mapping, controls, and E2E tests from Tasks 1–2.
- Produces: verified Task 9 plan status; release approval remains unchanged.

- [ ] **Step 1: Run all required verification**

Run: `npm test -- --run`

Expected: all unit and component tests pass.

Run: `npm run test:e2e`

Expected: all E2E tests pass, including the existing 390 × 844 and 1440 × 900 viewport checks and the privacy tests.

Run: `npm run typecheck`

Expected: exit code 0.

Run: `npm run build`

Expected: static export succeeds and includes `/diagnostico/`.

- [ ] **Step 2: Update the main plan**

Mark Task 9 requirements complete only after the corresponding test evidence passes. Do not mark the overall release complete; GJ-04 and legal approval remain blockers.

- [ ] **Step 3: Commit the Task 9 plan update**

```powershell
git add docs/superpowers/plans/2026-10-16-copiloto-transicao-6x1.md
git commit -m "docs(plan): complete optional local persistence" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Final verification and privacy boundary

- [ ] Confirm the only application-owned browser storage key is the namespaced assumptions record; no scenario inputs/results/checklist are serialized.
- [ ] Confirm storage read/write/delete failures are visibly surfaced and do not produce success-shaped fallbacks.
- [ ] Confirm `npm test -- --run`, `npm run test:e2e`, `npm run typecheck`, and `npm run build` all exit with code 0.
- [ ] Do not deploy or publish; release remains blocked pending GJ-04 and legal approval.
