import { roundHalfEven } from "@/domain/money/decimal";
import type { Rational } from "@/domain/money/rational";

export function formatHours(value: Rational): string {
  const hundredths = roundHalfEven(value, 2);
  const negative = hundredths < BigInt(0);
  const digits = (negative ? -hundredths : hundredths)
    .toString()
    .padStart(3, "0");
  const integer = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}${integer},${digits.slice(-2)} h`;
}
