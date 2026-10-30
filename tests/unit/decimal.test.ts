import { describe, expect, it } from "vitest";
import { formatDecimal } from "@/domain/money/decimal";

describe("formatDecimal", () => {
  it("formats finite decimal rationals without rounding", () => {
    expect(
      formatDecimal({ numerator: BigInt(4401), denominator: BigInt(2) }),
    ).toBe("2200,5");
    expect(
      formatDecimal({ numerator: BigInt(171), denominator: BigInt(4) }),
    ).toBe("42,75");
    expect(
      formatDecimal({ numerator: BigInt(1), denominator: BigInt(8) }),
    ).toBe("0,125");
  });

  it("omits the decimal separator for integers and preserves a negative sign", () => {
    expect(
      formatDecimal({ numerator: BigInt(42), denominator: BigInt(1) }),
    ).toBe("42");
    expect(
      formatDecimal({ numerator: BigInt(-5), denominator: BigInt(2) }),
    ).toBe("-2,5");
  });

  it("rejects a rational with a non-terminating decimal expansion", () => {
    expect(() =>
      formatDecimal({ numerator: BigInt(1), denominator: BigInt(3) }),
    ).toThrow(RangeError);
  });
});
