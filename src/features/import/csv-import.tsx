"use client";

import { useState, type ChangeEvent } from "react";
import { formatDecimal } from "@/domain/money/decimal";
import type { EmployeeAssumption } from "@/domain/diagnostic/types";
import {
  decodeCsvBytes,
  parseAssumptionsCsv,
  type CsvImportError,
  type ImportPreview,
} from "@/features/import/parse-assumptions-csv";

type CsvImportProps = {
  onImport: (rows: EmployeeAssumption[]) => void;
};

const MAX_CSV_BYTES = 5 * 1024 * 1024;
const fileReadError: CsvImportError = {
  row: 0,
  field: "arquivo",
  code: "file-read-error",
  message: "Não foi possível ler o arquivo CSV. Selecione-o novamente.",
};
const unreadableFileError: CsvImportError = {
  row: 0,
  field: "arquivo",
  code: "file-not-readable",
  message: "O arquivo não pôde ser lido. Verifique se ele continua disponível e tente novamente.",
};

const describeError = ({ row, field, message }: CsvImportError) =>
  `${row > 0 ? `Linha ${row}, ` : ""}${field === "arquivo" ? "" : `${field}: `}${message}`;

export function CsvImport({ onImport }: CsvImportProps) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [errors, setErrors] = useState<CsvImportError[]>([]);
  const [isReading, setIsReading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    setPreview(null);
    setErrors([]);
    setStatusMessage("");

    if (!file) return;
    if (file.size > MAX_CSV_BYTES) {
      setErrors([
        {
          row: 0,
          field: "arquivo",
          code: "file-too-large",
          message: "O arquivo excede o limite de 5 MiB.",
        },
      ]);
      return;
    }

    setIsReading(true);
    try {
      const decoded = decodeCsvBytes(await file.arrayBuffer());
      if (!decoded.ok) {
        setErrors(decoded.error);
        return;
      }

      const parsed = parseAssumptionsCsv(decoded.value);
      if (!parsed.ok) {
        setErrors(parsed.error);
        return;
      }

      setPreview(parsed.value);
    } catch (error) {
      setErrors([
        error instanceof DOMException && error.name === "NotReadableError"
          ? unreadableFileError
          : fileReadError,
      ]);
    } finally {
      setIsReading(false);
    }
  };

  const cancelPreview = () => {
    setPreview(null);
    setErrors([]);
    setStatusMessage("");
  };

  const applyRows = () => {
    if (!preview || preview.validRows.length === 0) return;
    onImport(preview.validRows);
    setPreview(null);
    setErrors([]);
    setStatusMessage("A equipe importada ainda não foi salva.");
  };

  const previewErrors = preview?.errors ?? [];
  const visibleErrors = [...errors, ...previewErrors];

  return (
    <div>
      <label htmlFor="csv-team-import">Arquivo CSV da equipe</label>
      <input
        id="csv-team-import"
        accept=".csv,text/csv"
        disabled={isReading}
        type="file"
        onChange={selectFile}
      />

      {visibleErrors.length > 0 && (
        <ul aria-live="assertive" role="alert">
          {visibleErrors.map((error, index) => (
            <li key={`${error.row}-${error.field}-${error.code}-${index}`}>
              {describeError(error)}
            </li>
          ))}
        </ul>
      )}

      <div
        aria-busy={isReading}
        aria-label="Importação CSV"
        aria-live="polite"
        role="region"
      >
        {isReading && <p role="status">Lendo arquivo CSV…</p>}
        {statusMessage && <p role="status">{statusMessage}</p>}
        {preview && (
          <section aria-label="Prévia da equipe">
            {previewErrors.length > 0 && (
              <p>
                Somente as {preview.validRows.length} linhas válidas serão aplicadas;
                {` ${previewErrors.length} erro(s) serão ignorados.`}
              </p>
            )}
            <table aria-label="Prévia da equipe">
              <thead>
                <tr>
                  <th scope="col">Salário mensal</th>
                  <th scope="col">Horas semanais</th>
                  <th scope="col">Tipo de contrato</th>
                </tr>
              </thead>
              <tbody>
                {preview.validRows.map((employee) => (
                  <tr key={employee.localId}>
                    <td>{formatDecimal(employee.salary)}</td>
                    <td>{formatDecimal(employee.weeklyHours)}</td>
                    <td>
                      {employee.contractType === "full-time"
                        ? "Tempo integral"
                        : "Tempo parcial"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              disabled={preview.validRows.length === 0}
              onClick={applyRows}
              type="button"
            >
              Aplicar linhas válidas
            </button>
            <button onClick={cancelPreview} type="button">
              Cancelar prévia
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
