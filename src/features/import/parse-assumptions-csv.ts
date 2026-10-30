import Papa from "papaparse";
import { parseDecimal } from "@/domain/money/decimal";
import type { Rational } from "@/domain/money/rational";
import type { EmployeeAssumption } from "@/domain/diagnostic/types";
import type { Result } from "@/domain/result";

export type CsvImportError = {
  row: number;
  field: string;
  code: string;
  message: string;
};

export type ImportPreview = {
  validRows: EmployeeAssumption[];
  errors: CsvImportError[];
};

const MAX_CSV_BYTES = 5 * 1024 * 1024;
const REQUIRED_HEADERS = [
  "salario_mensal",
  "horas_semanais",
  "tipo_contrato",
] as const;

function fileError(code: string, message: string): CsvImportError[] {
  return [{ row: 0, field: "arquivo", code, message }];
}

export function decodeCsvBytes(
  bytes: ArrayBuffer,
): Result<string, CsvImportError[]> {
  try {
    return {
      ok: true,
      value: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    };
  } catch (error) {
    if (error instanceof TypeError) {
      return {
        ok: false,
        error: fileError("invalid-encoding", "O arquivo não contém UTF-8 válido."),
      };
    }
    throw error;
  }
}

export function parseAssumptionsCsv(
  contents: string,
): Result<ImportPreview, CsvImportError[]> {
  if (new TextEncoder().encode(contents).byteLength > MAX_CSV_BYTES) {
    return {
      ok: false,
      error: fileError("file-too-large", "O arquivo excede o limite de 5 MiB."),
    };
  }
  if (!contents.trim()) {
    return {
      ok: false,
      error: fileError("empty-file", "O arquivo CSV está vazio."),
    };
  }

  const parsed = Papa.parse<string[]>(contents, {
    header: false,
    dynamicTyping: false,
    skipEmptyLines: "greedy",
  });
  const syntaxError = parsed.errors.find(
    (error) => error.code === "MissingQuotes" || error.code === "InvalidQuotes",
  );
  if (syntaxError) {
    return {
      ok: false,
      error: fileError("malformed-csv", "O arquivo contém aspas CSV inválidas."),
    };
  }

  const headerRow = parsed.data[0];
  if (!headerRow || headerRow.every((header) => !header.trim())) {
    return {
      ok: false,
      error: fileError("missing-header", "O arquivo não contém cabeçalho."),
    };
  }

  const headers = headerRow.map((header) => header.trim());
  if (new Set(headers).size !== headers.length) {
    return {
      ok: false,
      error: fileError("duplicate-header", "O cabeçalho contém nomes duplicados."),
    };
  }

  const presentRequiredHeaders = REQUIRED_HEADERS.filter((header) =>
    headers.includes(header),
  );
  if (presentRequiredHeaders.length === 0) {
    return {
      ok: false,
      error: fileError("missing-header", "O arquivo não contém cabeçalho."),
    };
  }
  const indexes = new Map<string, number>();
  for (const requiredHeader of REQUIRED_HEADERS) {
    const index = headers.indexOf(requiredHeader);
    if (index < 0) {
      return {
        ok: false,
        error: fileError(
          "missing-required-header",
          `O cabeçalho obrigatório "${requiredHeader}" não foi encontrado.`,
        ),
      };
    }
    indexes.set(requiredHeader, index);
  }

  const salaryIndex = indexes.get("salario_mensal") as number;
  const hoursIndex = indexes.get("horas_semanais") as number;
  const contractIndex = indexes.get("tipo_contrato") as number;
  const validRows: EmployeeAssumption[] = [];
  const errors: CsvImportError[] = [];
  const seenRows = new Set<string>();

  for (let index = 1; index < parsed.data.length; index += 1) {
    const record = parsed.data[index];
    const row = index + 1;
    const salaryText = (record[salaryIndex] ?? "").trim();
    const hoursText = (record[hoursIndex] ?? "").trim();
    const contractText = (record[contractIndex] ?? "").trim();
    const rowErrors: CsvImportError[] = [];
    let salary: Rational | undefined;
    let weeklyHours: Rational | undefined;

    try {
      salary = parseDecimal(salaryText);
      if (salary.numerator <= BigInt(0)) {
        rowErrors.push({
          row,
          field: "salario_mensal",
          code: "non-positive-value",
          message: "O salário mensal deve ser maior que zero.",
        });
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      rowErrors.push({
        row,
        field: "salario_mensal",
        code: "invalid-decimal",
        message: "Informe um salário mensal numérico válido.",
      });
    }

    try {
      weeklyHours = parseDecimal(hoursText);
      if (weeklyHours.numerator <= BigInt(0)) {
        rowErrors.push({
          row,
          field: "horas_semanais",
          code: "non-positive-value",
          message: "A jornada semanal deve ser maior que zero.",
        });
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      rowErrors.push({
        row,
        field: "horas_semanais",
        code: "invalid-decimal",
        message: "Informe uma jornada semanal numérica válida.",
      });
    }

    if (contractText !== "full-time" && contractText !== "part-time") {
      rowErrors.push({
        row,
        field: "tipo_contrato",
        code: "unsupported-contract",
        message: "O tipo de contrato deve ser full-time ou part-time.",
      });
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    const contractType = contractText as EmployeeAssumption["contractType"];
    const duplicateKey = [
      salary?.numerator,
      salary?.denominator,
      weeklyHours?.numerator,
      weeklyHours?.denominator,
      contractType,
    ].join(":");
    if (seenRows.has(duplicateKey)) {
      errors.push({
        row,
        field: "registro",
        code: "duplicate-row",
        message: "Este registro repete uma linha válida anterior.",
      });
      continue;
    }

    seenRows.add(duplicateKey);
    validRows.push({
      localId: `csv-row-${row}`,
      salary: salary as Rational,
      weeklyHours: weeklyHours as Rational,
      contractType,
    });
  }

  return { ok: true, value: { validRows, errors } };
}
