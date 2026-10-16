import { roundHalfEven } from "./decimal";
import type { Rational } from "./rational";

/** Formats final display values using ASCII spaces and half-even cents. */
export function formatBRL(value: Rational): string {
  const cents = roundHalfEven(value, 2);
  const negative = cents < BigInt(0);
  const digits = (negative ? -cents : cents).toString().padStart(3, "0");
  const integer = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}R$ ${integer},${digits.slice(-2)}`;
}
