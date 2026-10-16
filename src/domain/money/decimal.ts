import { normalizeRational, type Rational } from "./rational";

export function parseDecimal(input: string): Rational {
  const text = input.trim();
  if (!/^-?(?:[0-9]+|[0-9]{1,3}(?:\.[0-9]{3})+)(?:,[0-9]+)?$/.test(text)) {
    throw new SyntaxError("Invalid Brazilian decimal.");
  }

  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [integer, fraction = ""] = unsigned.replace(/\./g, "").split(",");
  const numerator = BigInt(integer + fraction);
  return normalizeRational({
    numerator: negative ? -numerator : numerator,
    denominator: BigInt(10) ** BigInt(fraction.length),
  });
}

/** Returns integer units at the requested decimal scale without changing the input. */
export function roundHalfEven(value: Rational, decimalPlaces: number): bigint {
  if (!Number.isSafeInteger(decimalPlaces) || decimalPlaces < 0) {
    throw new RangeError("Decimal places must be a non-negative safe integer.");
  }
  const { numerator, denominator } = normalizeRational(value);
  const zero = BigInt(0);
  const two = BigInt(2);
  const negative = numerator < zero;
  const scaled = (negative ? -numerator : numerator) * BigInt(10) ** BigInt(decimalPlaces);
  let rounded = scaled / denominator;
  const twiceRemainder = (scaled % denominator) * two;
  if (twiceRemainder > denominator || (twiceRemainder === denominator && rounded % two !== zero)) {
    rounded += BigInt(1);
  }
  return negative ? -rounded : rounded;
}
