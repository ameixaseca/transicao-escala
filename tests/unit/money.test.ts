import { describe, expect, it } from "vitest";
import { parseDecimal, roundHalfEven } from "@/domain/money/decimal";
import { formatBRL } from "@/domain/money/format-brl";
import { add, divide, multiply, type Rational } from "@/domain/money/rational";

const rational = (numerator: string, denominator = "1"): Rational => ({
  numerator: BigInt(numerator),
  denominator: BigInt(denominator),
});

describe("parseDecimal", () => {
  it.each([
    ["2200", "2200", "1"],
    ["2.200", "2200", "1"],
    ["2200,50", "4401", "2"],
    ["2.200,50", "4401", "2"],
    ["1.234.567,89", "123456789", "100"],
    ["  -2.200,50  ", "-4401", "2"],
    ["\t12,5\n", "25", "2"],
    ["-2200", "-2200", "1"],
    ["00012,5000", "25", "2"],
    ["0", "0", "1"],
    ["-0,000", "0", "1"],
    ["0,00000000000000000001", "1", "100000000000000000000"],
    ["9007199254740993,01", "900719925474099301", "100"],
  ])("parses %j exactly and normalizes it", (input, numerator, denominator) => {
    expect(parseDecimal(input)).toEqual(rational(numerator, denominator));
  });

  it.each([
    "", " ", "-", "+1", "12.34", "2.50", "2200.50", "1,234.56",
    "1.234,56,78", "1,2,3", "1..000", "1234.567", ".123", "1.",
    ",5", "1,", "1e3", "1E+3", "R$ 1,00", "NaN", "Infinity",
    "1 000", "- 1", "1\n2", "0x10", "١٢",
  ])("rejects invalid input %j", (input) => {
    expect(() => parseDecimal(input)).toThrow();
  });
});

describe("exact rational arithmetic", () => {
  it("adds and reduces fractions", () => {
    expect(add(rational("1", "6"), rational("1", "3"))).toEqual(rational("1", "2"));
  });

  it("normalizes denominator signs", () => {
    expect(add(rational("2", "-4"), rational("0"))).toEqual(rational("-1", "2"));
    expect(multiply(rational("-2", "-4"), rational("1"))).toEqual(rational("1", "2"));
    expect(divide(rational("1", "2"), rational("-3", "4"))).toEqual(rational("-2", "3"));
  });

  it("canonicalizes zero in every arithmetic operation", () => {
    expect(add(rational("1", "3"), rational("-1", "3"))).toEqual(rational("0"));
    expect(multiply(rational("0", "-7"), rational("2", "3"))).toEqual(rational("0"));
    expect(divide(rational("0", "5"), rational("-2", "3"))).toEqual(rational("0"));
  });

  it("multiplies and divides without decimal approximation", () => {
    expect(multiply(rational("2", "3"), rational("9", "4"))).toEqual(rational("3", "2"));
    expect(divide(parseDecimal("2200"), parseDecimal("210"))).toEqual(rational("220", "21"));
  });

  it("retains integers beyond the safe number range", () => {
    expect(add(parseDecimal("9007199254740993"), rational("1")))
      .toEqual(rational("9007199254740994"));
  });

  it.each([add, multiply, divide])("rejects a zero denominator in either operand", (operation) => {
    expect(() => operation(rational("1", "0"), rational("1"))).toThrow(/denominator/i);
    expect(() => operation(rational("1"), rational("0", "0"))).toThrow(/denominator/i);
  });

  it("rejects division by zero explicitly", () => {
    expect(() => divide(rational("1"), rational("0", "7"))).toThrow(/zero/i);
  });

  it("does not mutate operands", () => {
    const a = Object.freeze(rational("2", "-4"));
    const b = Object.freeze(rational("3", "9"));
    add(a, b);
    multiply(a, b);
    divide(a, b);
    expect(a).toEqual(rational("2", "-4"));
    expect(b).toEqual(rational("3", "9"));
  });
});

describe("roundHalfEven", () => {
  it.each([
    ["2,345", 2, "234"], ["2,355", 2, "236"],
    ["-2,345", 2, "-234"], ["-2,355", 2, "-236"],
    ["2,3449", 2, "234"], ["2,3451", 2, "235"],
    ["-2,3449", 2, "-234"], ["-2,3451", 2, "-235"],
    ["0,005", 2, "0"], ["-0,005", 2, "0"],
    ["0,015", 2, "2"], ["-0,015", 2, "-2"],
    ["9,995", 2, "1000"], ["-9,995", 2, "-1000"],
    ["2,5", 0, "2"], ["3,5", 0, "4"],
    ["-2,5", 0, "-2"], ["-3,5", 0, "-4"],
    ["1,2", 4, "12000"], ["0", 2, "0"],
    ["9007199254740993,015", 2, "900719925474099302"],
    ["0,000000000000000000015", 20, "2"],
  ])("rounds %s at %i decimal places to %s", (input, places, expected) => {
    expect(roundHalfEven(parseDecimal(input), places)).toBe(BigInt(expected));
  });

  it("handles a negative denominator", () => {
    expect(roundHalfEven(rational("469", "-200"), 2)).toBe(BigInt("-234"));
  });

  it("rejects a zero denominator", () => {
    expect(() => roundHalfEven(rational("1", "0"), 2)).toThrow(/denominator/i);
  });

  it.each([-1, 1.5, NaN, Infinity, -Infinity])("rejects invalid decimal places %s", (places) => {
    expect(() => roundHalfEven(rational("1"), places)).toThrow(RangeError);
  });
});

describe("formatBRL", () => {
  it.each([
    ["0", "R$ 0,00"], ["1,2", "R$ 1,20"],
    ["2,345", "R$ 2,34"], ["2,355", "R$ 2,36"],
    ["-2,345", "-R$ 2,34"], ["-2,355", "-R$ 2,36"],
    ["-0,005", "R$ 0,00"], ["-0,015", "-R$ 0,02"],
    ["1234567,89", "R$ 1.234.567,89"],
    ["999,995", "R$ 1.000,00"],
    ["9007199254740993,01", "R$ 9.007.199.254.740.993,01"],
  ])("formats %s as %s", (input, expected) => {
    expect(formatBRL(parseDecimal(input))).toBe(expected);
  });

  it("rejects a zero denominator", () => {
    expect(() => formatBRL(rational("1", "0"))).toThrow(/denominator/i);
  });

  it("rounds only the final display, not the hourly value used in later operations", () => {
    const hourly = divide(parseDecimal("2200"), parseDecimal("210"));
    expect(formatBRL(hourly)).toBe("R$ 10,48");

    const factor = multiply(parseDecimal("21"), parseDecimal("1,5"));
    const total = multiply(factor, hourly);
    expect(total).toEqual(rational("330"));
    expect(formatBRL(total)).toBe("R$ 330,00");
    expect(hourly).toEqual(rational("220", "21"));

    const prematurelyRoundedHourly = rational(roundHalfEven(hourly, 2).toString(), "100");
    expect(formatBRL(multiply(factor, prematurelyRoundedHourly))).toBe("R$ 330,12");
  });
});
