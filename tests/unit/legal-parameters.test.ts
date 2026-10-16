import { describe, expect, it } from "vitest";
import {
  getParametersForDate,
  PROVISIONAL_LEGAL_PARAMETERS,
  type LegalParameters,
} from "@/domain/legal/legal-parameters";

const version = (
  publicationDate: string | null,
  weeklyHours: LegalParameters["weeklyHours"] = {
    beforePhase1: 44,
    phase1: 42,
    phase2: 40,
  },
): LegalParameters => ({
  ...PROVISIONAL_LEGAL_PARAMETERS,
  version: "hypothetical-approved-test-fixture",
  status: "aprovado",
  sourceUrl: "https://example.invalid/hypothetical-test-fixture",
  publicationDate,
  weeklyHours,
});

describe("getParametersForDate", () => {
  it("keeps the provisional source record immutable", () => {
    expect(Object.isFrozen(PROVISIONAL_LEGAL_PARAMETERS)).toBe(true);
    expect(Object.isFrozen(PROVISIONAL_LEGAL_PARAMETERS.weeklyHours)).toBe(true);
  });

  it("does not select a provisional version for current calculations", () => {
    expect(getParametersForDate("2026-12-16", [PROVISIONAL_LEGAL_PARAMETERS])).toEqual({
      ok: false,
      error: { code: "no-approved-parameters" },
    });
  });

  it("selects the latest approved publication that applies to the reference date", () => {
    const older = version("2026-01-01", {
      beforePhase1: 44,
      phase1: 42,
      phase2: 40,
    });
    const newer = {
      ...version("2026-06-01"),
      version: "2026-06-update",
    };

    expect(getParametersForDate("2026-06-01", [older, newer])).toEqual({
      ok: true,
      value: newer,
    });
  });

  it("does not select an approved version before its publication date", () => {
    expect(getParametersForDate("2026-05-31", [version("2026-06-01")])).toEqual({
      ok: false,
      error: { code: "no-approved-parameters" },
    });
  });

  it.each([null, "2026-02-29"])(
    "rejects an approved version with missing or invalid publicationDate (%s)",
    (publicationDate) => {
      expect(getParametersForDate("2026-12-16", [version(publicationDate)])).toEqual({
        ok: false,
        error: { code: "invalid-approved-parameters" },
      });
    },
  );

  it("rejects overlapping approved versions with the same publication date", () => {
    expect(getParametersForDate("2026-12-16", [
      version("2026-01-01"),
      { ...version("2026-01-01"), version: "duplicate" },
    ])).toEqual({
      ok: false,
      error: { code: "overlapping-versions" },
    });
  });

  it("rejects an invalid reference date", () => {
    expect(getParametersForDate("2026-02-29", [version("2026-01-01")])).toEqual({
      ok: false,
      error: { code: "invalid-date" },
    });
  });
});
