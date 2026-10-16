export type Rational = { numerator: bigint; denominator: bigint };

const ZERO = BigInt(0);
const ONE = BigInt(1);

export function normalizeRational(value: Rational): Rational {
  let { numerator, denominator } = value;
  if (denominator === ZERO) {
    throw new RangeError("Rational denominator cannot be zero.");
  }
  if (numerator === ZERO) {
    return { numerator: ZERO, denominator: ONE };
  }
  if (denominator < ZERO) {
    numerator = -numerator;
    denominator = -denominator;
  }

  let a = numerator < ZERO ? -numerator : numerator;
  let b = denominator;
  while (b !== ZERO) {
    [a, b] = [b, a % b];
  }
  return { numerator: numerator / a, denominator: denominator / a };
}

export function add(a: Rational, b: Rational): Rational {
  const left = normalizeRational(a);
  const right = normalizeRational(b);
  return normalizeRational({
    numerator: left.numerator * right.denominator + right.numerator * left.denominator,
    denominator: left.denominator * right.denominator,
  });
}

export function multiply(a: Rational, b: Rational): Rational {
  const left = normalizeRational(a);
  const right = normalizeRational(b);
  return normalizeRational({
    numerator: left.numerator * right.numerator,
    denominator: left.denominator * right.denominator,
  });
}

export function divide(a: Rational, b: Rational): Rational {
  const left = normalizeRational(a);
  const right = normalizeRational(b);
  if (right.numerator === ZERO) {
    throw new RangeError("Cannot divide by zero.");
  }
  return normalizeRational({
    numerator: left.numerator * right.denominator,
    denominator: left.denominator * right.numerator,
  });
}
