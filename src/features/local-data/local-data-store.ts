import type { CoverageAssumption } from "@/domain/diagnostic/types";
import type { Result } from "@/domain/result";

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

const STORAGE_KEY = "transicao-escala:assumptions";
const UNAVAILABLE_ERROR: StorageError = {
  code: "unavailable",
  message: "O armazenamento local não está disponível neste navegador.",
};
const INVALID_JSON_ERROR: StorageError = {
  code: "invalid-data",
  message: "Os dados salvos não podem ser lidos.",
};
const INCOMPATIBLE_DATA_ERROR: StorageError = {
  code: "invalid-data",
  message: "Os dados salvos não são compatíveis com esta versão.",
};
const QUOTA_ERROR: StorageError = {
  code: "quota",
  message: "Não há espaço suficiente para salvar os dados neste navegador.",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isValidDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) &&
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() + 1 === Number(match[2]) &&
    date.getUTCDate() === Number(match[3])
  );
};

const isValidIsoTimestamp = (value: string): boolean => {
  const match =
    /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d+)?(?:Z|[+-](?:(?:0\d|1[0-3]):[0-5]\d|14:00))$/.exec(value);
  return Boolean(match && isValidDate(match[1]) && Number.isFinite(Date.parse(value)));
};

const isValidDecimal = (value: string): boolean =>
  /^-?(?:[0-9]+|[0-9]{1,3}(?:\.[0-9]{3})+)(?:,[0-9]+)?$/.test(value);

const isSafeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value);

const isEmployeeRow = (
  value: unknown,
): value is PersistableAssumptions["assumptions"]["employeeRows"][number] => {
  if (!isRecord(value)) return false;
  return (
    typeof value.localId === "string" &&
    value.localId.trim().length > 0 &&
    typeof value.salaryDecimal === "string" &&
    isValidDecimal(value.salaryDecimal) &&
    typeof value.weeklyHoursDecimal === "string" &&
    isValidDecimal(value.weeklyHoursDecimal) &&
    (value.contractType === "full-time" || value.contractType === "part-time")
  );
};

const isCoverageAssumption = (value: unknown): value is CoverageAssumption => {
  if (!isRecord(value)) return false;
  const { weekday, startMinute, endMinute, minimumPeople } = value;
  return (
    isSafeInteger(weekday) &&
    weekday >= 0 &&
    weekday <= 6 &&
    isSafeInteger(startMinute) &&
    startMinute >= 0 &&
    startMinute <= 1439 &&
    isSafeInteger(endMinute) &&
    endMinute >= 0 &&
    endMinute <= 1440 &&
    isSafeInteger(minimumPeople) &&
    minimumPeople >= 1
  );
};

const isPersistableAssumptions = (
  value: unknown,
): value is PersistableAssumptions => {
  if (!isRecord(value) || value.schemaVersion !== 1) return false;
  if (typeof value.savedAt !== "string" || !isValidIsoTimestamp(value.savedAt)) {
    return false;
  }
  if (!isRecord(value.assumptions)) return false;

  const assumptions = value.assumptions;
  return (
    Array.isArray(assumptions.employeeRows) &&
    assumptions.employeeRows.every(isEmployeeRow) &&
    Array.isArray(assumptions.coverage) &&
    assumptions.coverage.every(isCoverageAssumption) &&
    typeof assumptions.referenceDate === "string" &&
    isValidDate(assumptions.referenceDate) &&
    typeof assumptions.legalParameterVersion === "string" &&
    assumptions.legalParameterVersion.trim().length > 0
  );
};

const isStorageAccessError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "SecurityError";

export function saveLocalAssumptions(
  value: PersistableAssumptions,
): Result<void, StorageError> {
  if (typeof window === "undefined") {
    return { ok: false, error: UNAVAILABLE_ERROR };
  }

  let storage: Storage;
  try {
    storage = window.localStorage;
  } catch (error) {
    if (isStorageAccessError(error)) {
      return { ok: false, error: UNAVAILABLE_ERROR };
    }
    throw error;
  }

  const serialized = JSON.stringify(value);
  try {
    storage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    if (isStorageAccessError(error)) {
      return { ok: false, error: UNAVAILABLE_ERROR };
    }
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      return { ok: false, error: QUOTA_ERROR };
    }
    throw error;
  }
  return { ok: true, value: undefined };
}

export function loadLocalAssumptions(): Result<
  PersistableAssumptions | null,
  StorageError
> {
  if (typeof window === "undefined") {
    return { ok: false, error: UNAVAILABLE_ERROR };
  }

  let storage: Storage;
  try {
    storage = window.localStorage;
  } catch (error) {
    if (isStorageAccessError(error)) {
      return { ok: false, error: UNAVAILABLE_ERROR };
    }
    throw error;
  }

  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch (error) {
    if (isStorageAccessError(error)) {
      return { ok: false, error: UNAVAILABLE_ERROR };
    }
    throw error;
  }
  if (raw === null) return { ok: true, value: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return { ok: false, error: INVALID_JSON_ERROR };
  }

  if (!isPersistableAssumptions(parsed)) {
    return { ok: false, error: INCOMPATIBLE_DATA_ERROR };
  }
  return { ok: true, value: parsed };
}

export function clearLocalAssumptions(): Result<void, StorageError> {
  if (typeof window === "undefined") {
    return { ok: false, error: UNAVAILABLE_ERROR };
  }

  let storage: Storage;
  try {
    storage = window.localStorage;
  } catch (error) {
    if (isStorageAccessError(error)) {
      return { ok: false, error: UNAVAILABLE_ERROR };
    }
    throw error;
  }

  try {
    storage.removeItem(STORAGE_KEY);
  } catch (error) {
    if (isStorageAccessError(error)) {
      return { ok: false, error: UNAVAILABLE_ERROR };
    }
    throw error;
  }
  return { ok: true, value: undefined };
}
