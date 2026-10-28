import { getStageDates } from "@/domain/dates/stages";
import type { Result } from "@/domain/result";
import {
  add,
  divide,
  multiply,
  normalizeRational,
  type Rational,
} from "@/domain/money/rational";
import { validateDiagnosticInput } from "./validate-diagnostic-input";
import type {
  DiagnosticInput,
  DiagnosticResult,
  DiagnosticStageResult,
  DiagnosticValidationError,
} from "./types";

const ZERO: Rational = { numerator: BigInt(0), denominator: BigInt(1) };
const DENOMINATOR = BigInt(1);

const compare = (left: Rational, right: Rational): number => {
  const normalizedLeft = normalizeRational(left);
  const normalizedRight = normalizeRational(right);
  const difference =
    normalizedLeft.numerator * normalizedRight.denominator -
    normalizedRight.numerator * normalizedLeft.denominator;

  if (difference < BigInt(0)) return -1;
  if (difference > BigInt(0)) return 1;
  return 0;
};

const calculateRequiredPersonHours = (input: DiagnosticInput): Rational =>
  input.coverage.reduce(
    (total, coverage) =>
      add(
        total,
        multiply(
          {
            numerator: BigInt(coverage.endMinute - coverage.startMinute),
            denominator: BigInt(60),
          },
          {
            numerator: BigInt(coverage.minimumPeople),
            denominator: DENOMINATOR,
          },
        ),
      ),
    ZERO,
  );

const calculateStage = (
  input: DiagnosticInput,
  stageId: string,
  weeklyLimit: number,
  requiredPersonHours: Rational,
): DiagnosticStageResult => {
  const stageLimit: Rational = {
    numerator: BigInt(weeklyLimit),
    denominator: DENOMINATOR,
  };
  const availableHours = input.employees.reduce(
    (total, employee) =>
      add(
        total,
        compare(employee.weeklyHours, stageLimit) <= 0
          ? employee.weeklyHours
          : stageLimit,
      ),
    ZERO,
  );
  const deficitPersonHours =
    compare(requiredPersonHours, availableHours) > 0
      ? add(requiredPersonHours, {
          numerator: -availableHours.numerator,
          denominator: availableHours.denominator,
        })
      : ZERO;
  const hourlyCostByLocalId = Object.fromEntries(
    input.employees.map((employee) => [
      employee.localId,
      divide(employee.salary, {
        numerator: BigInt(weeklyLimit) * BigInt(5),
        denominator: DENOMINATOR,
      }),
    ]),
  );

  return {
    stageId,
    weeklyLimitHours: stageLimit,
    availableHours,
    requiredPersonHours,
    deficitPersonHours,
    hourlyCostByLocalId,
  };
};

export const calculateDiagnostic = (
  input: DiagnosticInput,
): Result<DiagnosticResult, DiagnosticValidationError[]> => {
  const validation = validateDiagnosticInput(input);
  if (!validation.ok) return validation;

  const stageDates = getStageDates(input.legalParameters);
  if (!stageDates.ok) {
    return {
      ok: false,
      error: [
        {
          field: "legalParameters.publicationDate",
          message:
            "Não foi possível determinar as datas das etapas a partir dos parâmetros legais.",
        },
      ],
    };
  }

  const requiredPersonHours = calculateRequiredPersonHours(input);
  const { weeklyHours } = input.legalParameters;

  return {
    ok: true,
    value: {
      referenceDate: input.referenceDate,
      legalParameterVersion: input.legalParameters.version,
      stages: [
        calculateStage(
          input,
          "before-phase-1",
          weeklyHours.beforePhase1,
          requiredPersonHours,
        ),
        calculateStage(
          input,
          "phase-1",
          weeklyHours.phase1,
          requiredPersonHours,
        ),
        calculateStage(
          input,
          "phase-2",
          weeklyHours.phase2,
          requiredPersonHours,
        ),
      ],
    },
  };
};
