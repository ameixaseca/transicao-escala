import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseDecimal } from "@/domain/money/decimal";
import { CsvImport } from "@/features/import/csv-import";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const createCsvFile = (contents: string) =>
  new File([contents], "equipe.csv", { type: "text/csv" });

const selectFile = (file: File) =>
  fireEvent.change(screen.getByLabelText("Arquivo CSV da equipe"), {
    target: { files: [file] },
  });

const validCsv = [
  "salario_mensal,horas_semanais,tipo_contrato,email",
  '"2.200,50","42,75",full-time,nome-secreto@example.test',
].join("\n");

describe("CSV team import", () => {
  it("previews only normalized required fields until explicitly confirmed", async () => {
    const onImport = vi.fn();
    render(<CsvImport onImport={onImport} />);

    selectFile(createCsvFile(validCsv));

    const preview = await screen.findByRole("table", { name: "Prévia da equipe" });
    expect(preview).toBeInTheDocument();
    expect(screen.queryByText("nome-secreto@example.test")).not.toBeInTheDocument();
    expect(onImport).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Aplicar linhas válidas" }));

    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledWith([
      {
        localId: "csv-row-2",
        salary: { numerator: BigInt(4401), denominator: BigInt(2) },
        weeklyHours: { numerator: BigInt(171), denominator: BigInt(4) },
        contractType: "full-time",
      },
    ]);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "A equipe importada ainda não foi salva.",
    );
  });

  it("requires confirmation before applying valid rows from a partial import", async () => {
    const onImport = vi.fn();
    render(<CsvImport onImport={onImport} />);
    selectFile(
      createCsvFile(
        [
          "salario_mensal,horas_semanais,tipo_contrato",
          '"2.200,50","42,75",full-time',
          '"inválido",40,part-time',
        ].join("\n"),
      ),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Informe um salário mensal numérico válido.",
    );
    expect(onImport).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Aplicar linhas válidas" }));

    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledWith([
      {
        localId: "csv-row-2",
        salary: parseDecimal("2.200,50"),
        weeklyHours: parseDecimal("42,75"),
        contractType: "full-time",
      },
    ]);
  });

  it("discards a preview when cancelled", async () => {
    const onImport = vi.fn();
    render(<CsvImport onImport={onImport} />);
    selectFile(createCsvFile(validCsv));
    await screen.findByRole("table", { name: "Prévia da equipe" });

    fireEvent.click(screen.getByRole("button", { name: "Cancelar prévia" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("table", { name: "Prévia da equipe" }),
      ).not.toBeInTheDocument(),
    );
    expect(onImport).not.toHaveBeenCalled();
  });

  it("rejects oversized files before reading their bytes", async () => {
    const file = createCsvFile("x");
    const readBytes = vi.spyOn(file, "arrayBuffer");
    Object.defineProperty(file, "size", { value: 5 * 1024 * 1024 + 1 });
    const onImport = vi.fn();
    render(<CsvImport onImport={onImport} />);

    selectFile(file);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O arquivo excede o limite de 5 MiB.",
    );
    expect(readBytes).not.toHaveBeenCalled();
    expect(onImport).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid UTF-8 bytes", new Uint8Array([0xc3, 0x28])],
    [
      "malformed CSV quotes",
      '"salario_mensal,horas_semanais,tipo_contrato\n"2200,00,44,full-time',
    ],
  ])("exposes an accessible error for %s", async (_description, contents) => {
    const file = new File([contents], "inválido.csv", { type: "text/csv" });
    const onImport = vi.fn();
    render(<CsvImport onImport={onImport} />);

    selectFile(file);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onImport).not.toHaveBeenCalled();
  });

  it("reports an unreadable file and leaves the import control active", async () => {
    const file = createCsvFile(validCsv);
    vi.spyOn(file, "arrayBuffer").mockRejectedValue(
      new DOMException("File is no longer available.", "NotReadableError"),
    );
    const onImport = vi.fn();
    render(<CsvImport onImport={onImport} />);

    selectFile(file);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O arquivo não pôde ser lido.",
    );
    expect(screen.getByLabelText("Arquivo CSV da equipe")).toBeEnabled();
    expect(onImport).not.toHaveBeenCalled();
  });
});
