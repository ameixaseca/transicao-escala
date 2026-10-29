import { isDateOnly } from "@/domain/dates/date-only";
import type { Result } from "@/domain/result";

export type LegalParameters = Readonly<{
  version: string;
  status: "provisório" | "aprovado";
  sourceUrl: string;
  publicationDate: string | null;
  weeklyHours: Readonly<{
    beforePhase1: number;
    phase1: number;
    phase2: number;
  }>;
}>;

export type ParameterSelectionError = {
  code:
    | "invalid-date"
    | "invalid-approved-parameters"
    | "overlapping-versions"
    | "no-approved-parameters";
};

export const PROVISIONAL_LEGAL_PARAMETERS: LegalParameters = Object.freeze({
  version: "ec-141-provisional",
  status: "provisório",
  sourceUrl:
    "https://www.in.gov.br/en/web/dou/-/emenda-constitucional-n-141-738818165",
  publicationDate: "2026-10-16",
  weeklyHours: Object.freeze({
    beforePhase1: 44,
    phase1: 42,
    phase2: 40,
  }),
});

export const getParametersForDate = (
  date: string,
  versions: LegalParameters[],
): Result<LegalParameters, ParameterSelectionError> => {
  if (!isDateOnly(date)) {
    return { ok: false, error: { code: "invalid-date" } };
  }

  const approvedVersions: Array<{
    parameters: LegalParameters;
    publicationDate: string;
  }> = [];
  for (const parameters of versions) {
    if (parameters.status !== "aprovado") continue;
    const publicationDate = parameters.publicationDate;
    if (publicationDate === null || !isDateOnly(publicationDate)) {
      return { ok: false, error: { code: "invalid-approved-parameters" } };
    }
    approvedVersions.push({ parameters, publicationDate });
  }

  const publicationDates = approvedVersions.map((version) => version.publicationDate);
  if (new Set(publicationDates).size !== publicationDates.length) {
    return { ok: false, error: { code: "overlapping-versions" } };
  }

  const selected = approvedVersions
    .filter((version) => version.publicationDate <= date)
    .reduce<(typeof approvedVersions)[number] | undefined>(
      (latest, version) =>
        !latest || version.publicationDate > latest.publicationDate
          ? version
          : latest,
      undefined,
    );

  if (!selected) {
    return { ok: false, error: { code: "no-approved-parameters" } };
  }

  return { ok: true, value: selected.parameters };
};
