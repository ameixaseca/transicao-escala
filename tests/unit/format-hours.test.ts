import { describe, expect, it } from "vitest";
import { formatHours } from "@/features/diagnostic/format-hours";

describe("formatHours", () => {
  it("rounds exact rational hours to two Brazilian decimal places for display", () => {
    expect(
      formatHours({ numerator: BigInt(85), denominator: BigInt(2) }),
    ).toBe("42,50 h");
  });

  it("uses half-even rounding without changing the exact input", () => {
    expect(
      formatHours({ numerator: BigInt(8425), denominator: BigInt(200) }),
    ).toBe("42,12 h");
  });
});
