import { describe, expect, it } from "vitest";
import { formatDecimal } from "@/domain/money/decimal";

describe("formatDecimal", () => {
  it("formats finite decimal rationals without rounding", () => {
    expect(formatDecimal({ numerator: 4401n, denominator: 2n })).toBe("2200,5");
    expect(formatDecimal({ numerator: 171n, denominator: 4n })).toBe("42,75");
    expect(formatDecimal({ numerator: 1n, denominator: 8n })).toBe("0,125");
  });

  it("omits the decimal separator for integers and preserves a negative sign", () => {
    expect(formatDecimal({ numerator: 42n, denominator: 1n })).toBe("42");
    expect(formatDecimal({ numerator: -5n, denominator: 2n })).toBe("-2,5");
  });

  it("rejects a rational with a non-terminating decimal expansion", () => {
    expect(() => formatDecimal({ numerator: 1n, denominator: 3n })).toThrow(
      RangeError,
    );
  });
});
