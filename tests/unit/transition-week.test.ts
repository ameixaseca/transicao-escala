import { describe, expect, it } from "vitest";
import { getTransitionWeek } from "@/features/timeline/transition-week";

describe("getTransitionWeek", () => {
  it("calculates the Monday-to-Sunday week containing the 2026 milestone", () => {
    expect(getTransitionWeek("2026-12-16")).toEqual({
      ok: true,
      value: { start: "2026-12-14", end: "2026-12-20" },
    });
  });

  it("calculates the Monday-to-Sunday week containing the 2027 milestone", () => {
    expect(getTransitionWeek("2027-12-16")).toEqual({
      ok: true,
      value: { start: "2027-12-13", end: "2027-12-19" },
    });
  });

  it("rejects values that are not valid civil dates", () => {
    expect(getTransitionWeek("2026-02-30")).toEqual({
      ok: false,
      error: { code: "invalid-date" },
    });
  });
});
