import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLocalAssumptions,
  loadLocalAssumptions,
  saveLocalAssumptions,
  type PersistableAssumptions,
} from "@/features/local-data/local-data-store";

const STORAGE_KEY = "transicao-escala:assumptions";

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
      {
        weekday: 1,
        startMinute: 540,
        endMinute: 1080,
        minimumPeople: 1,
      },
    ],
    referenceDate: "2026-10-29",
    legalParameterVersion: "ec-141-provisional",
  },
};

describe("local assumptions store", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("round-trips valid assumptions", () => {
    expect(saveLocalAssumptions(record)).toEqual({ ok: true, value: undefined });
    expect(loadLocalAssumptions()).toEqual({ ok: true, value: record });
  });

  it("returns null when no assumptions have been saved", () => {
    expect(loadLocalAssumptions()).toEqual({ ok: true, value: null });
  });

  it("clears only its own key", () => {
    localStorage.setItem("other-app:data", "keep me");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));

    expect(clearLocalAssumptions()).toEqual({ ok: true, value: undefined });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("other-app:data")).toBe("keep me");
  });

  it("returns invalid-data for malformed JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{");

    expect(loadLocalAssumptions()).toEqual({
      ok: false,
      error: {
        code: "invalid-data",
        message: "Os dados salvos não podem ser lidos.",
      },
    });
  });

  it("returns invalid-data for an unsupported schema version", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...record, schemaVersion: 0 }),
    );

    expect(loadLocalAssumptions()).toEqual({
      ok: false,
      error: {
        code: "invalid-data",
        message: "Os dados salvos não são compatíveis com esta versão.",
      },
    });
  });

  it("returns quota when saving exceeds the storage quota", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    expect(saveLocalAssumptions(record)).toEqual({
      ok: false,
      error: {
        code: "quota",
        message: "Não há espaço suficiente para salvar os dados neste navegador.",
      },
    });
  });

  it("returns unavailable when saving is denied by the browser", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Access denied", "SecurityError");
    });

    expect(saveLocalAssumptions(record)).toEqual({
      ok: false,
      error: {
        code: "unavailable",
        message: "O armazenamento local não está disponível neste navegador.",
      },
    });
  });

  it("returns unavailable when storage access is denied", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Access denied", "SecurityError");
    });

    expect(loadLocalAssumptions()).toEqual({
      ok: false,
      error: {
        code: "unavailable",
        message: "O armazenamento local não está disponível neste navegador.",
      },
    });
  });

  it("returns unavailable when clearing is denied by the browser", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("Access denied", "SecurityError");
    });

    expect(clearLocalAssumptions()).toEqual({
      ok: false,
      error: {
        code: "unavailable",
        message: "O armazenamento local não está disponível neste navegador.",
      },
    });
  });

  it("rejects malformed assumption fields", () => {
    const invalidRecords: unknown[] = [
      { ...record, savedAt: "yesterday" },
      {
        ...record,
        assumptions: {
          ...record.assumptions,
          employeeRows: [
            { ...record.assumptions.employeeRows[0], localId: " " },
          ],
        },
      },
      {
        ...record,
        assumptions: {
          ...record.assumptions,
          employeeRows: [],
        },
      },
      {
        ...record,
        assumptions: {
          ...record.assumptions,
          coverage: [],
        },
      },
      {
        ...record,
        assumptions: {
          ...record.assumptions,
          employeeRows: [
            {
              ...record.assumptions.employeeRows[0],
              salaryDecimal: "2,2e3",
            },
          ],
        },
      },
      {
        ...record,
        assumptions: {
          ...record.assumptions,
          employeeRows: [
            {
              ...record.assumptions.employeeRows[0],
              weeklyHoursDecimal: "44h",
            },
          ],
        },
      },
      {
        ...record,
        assumptions: {
          ...record.assumptions,
          employeeRows: [
            {
              ...record.assumptions.employeeRows[0],
              contractType: "temporary",
            },
          ],
        },
      },
      {
        ...record,
        assumptions: {
          ...record.assumptions,
          coverage: [{ ...record.assumptions.coverage[0], weekday: 7 }],
        },
      },
      {
        ...record,
        assumptions: {
          ...record.assumptions,
          coverage: [{ ...record.assumptions.coverage[0], weekday: 1.5 }],
        },
      },
      {
        ...record,
        assumptions: {
          ...record.assumptions,
          coverage: [
            { ...record.assumptions.coverage[0], startMinute: 1440 },
          ],
        },
      },
      {
        ...record,
        assumptions: {
          ...record.assumptions,
          coverage: [
            { ...record.assumptions.coverage[0], endMinute: 1441 },
          ],
        },
      },
      {
        ...record,
        assumptions: {
          ...record.assumptions,
          coverage: [
            { ...record.assumptions.coverage[0], minimumPeople: 0 },
          ],
        },
      },
      {
        ...record,
        assumptions: {
          ...record.assumptions,
          referenceDate: "29-10-2026",
        },
      },
      {
        ...record,
        assumptions: {
          ...record.assumptions,
          legalParameterVersion: "",
        },
      },
    ];

    for (const invalidRecord of invalidRecords) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(invalidRecord));
      expect(loadLocalAssumptions()).toMatchObject({
        ok: false,
        error: { code: "invalid-data" },
      });
    }
  });
});
