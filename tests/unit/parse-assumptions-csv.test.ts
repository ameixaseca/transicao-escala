import { describe, expect, it } from "vitest";
import {
  decodeCsvBytes,
  parseAssumptionsCsv,
} from "@/features/import/parse-assumptions-csv";

describe("CSV decoding", () => {
  it("decodes UTF-8 and accepts a UTF-8 BOM", async () => {
    const bytes = new TextEncoder().encode(
      "\uFEFFsalario_mensal;horas_semanais;tipo_contrato\n2.200,50;42;full-time",
    );
    const decoded = decodeCsvBytes(await new Blob([bytes]).arrayBuffer());
    expect(decoded).toEqual({
      ok: true,
      value:
        "salario_mensal;horas_semanais;tipo_contrato\n2.200,50;42;full-time",
    });
  });

  it("rejects invalid UTF-8 bytes", async () => {
    const decoded = decodeCsvBytes(
      await new Blob([Uint8Array.of(0xff)]).arrayBuffer(),
    );
    expect(decoded).toMatchObject({
      ok: false,
      error: [{ row: 0, field: "arquivo", code: "invalid-encoding" }],
    });
  });
});

describe("parseAssumptionsCsv", () => {
  it("parses Brazilian decimals with semicolon and quoted comma delimiters", () => {
    const semicolon = parseAssumptionsCsv(
      "salario_mensal;horas_semanais;tipo_contrato\n2.200,50;42;full-time",
    );
    const comma = parseAssumptionsCsv(
      'salario_mensal,horas_semanais,tipo_contrato\n"2.200,50",42,full-time',
    );

    expect(semicolon).toEqual({
      ok: true,
      value: {
        validRows: [
          {
            localId: "csv-row-2",
            salary: { numerator: BigInt(4401), denominator: BigInt(2) },
            weeklyHours: { numerator: BigInt(42), denominator: BigInt(1) },
            contractType: "full-time",
          },
        ],
        errors: [],
      },
    });
    expect(comma).toEqual(semicolon);
  });

  it.each([
    ["empty input", "", "empty-file"],
    ["missing header", "2.200,50;42;full-time", "missing-header"],
    [
      "duplicate headers after trimming",
      "salario_mensal; horas_semanais;horas_semanais;tipo_contrato",
      "duplicate-header",
    ],
    [
      "missing required header",
      "salario_mensal;horas_semanais\n2.200,50;42",
      "missing-required-header",
    ],
    [
      "malformed CSV quotes",
      'salario_mensal;horas_semanais;tipo_contrato\n2.200,50;42;full-time\n"2200;42;full-time',
      "malformed-csv",
    ],
  ])("rejects structurally invalid file: %s", (_description, contents, code) => {
    const parsed = parseAssumptionsCsv(contents);
    expect(parsed).toMatchObject({
      ok: false,
      error: [{ row: 0, field: "arquivo", code }],
    });
    expect(parsed).not.toHaveProperty("value");
  });

  it("rejects input larger than 5 MiB before parsing records", () => {
    const contents = "x".repeat(5 * 1024 * 1024 + 1);
    expect(new TextEncoder().encode(contents).byteLength).toBeGreaterThan(
      5 * 1024 * 1024,
    );
    expect(parseAssumptionsCsv(contents)).toMatchObject({
      ok: false,
      error: [{ row: 0, field: "arquivo", code: "file-too-large" }],
    });
  });

  it("keeps valid rows and reports invalid fields with CSV record numbers", () => {
    const parsed = parseAssumptionsCsv(
      "salario_mensal;horas_semanais;tipo_contrato\n2.200,50;42;full-time\ninválido;40;part-time",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("Expected a row-level preview.");
    expect(parsed.value.validRows).toHaveLength(1);
    expect(parsed.value.errors).toContainEqual({
      row: 3,
      field: "salario_mensal",
      code: "invalid-decimal",
      message: expect.any(String),
    });
  });

  it.each([
    [";42;full-time", "salario_mensal", "invalid-decimal"],
    ["2.200,50;;full-time", "horas_semanais", "invalid-decimal"],
    ["inválido;42;full-time", "salario_mensal", "invalid-decimal"],
    ["2.200,50;inválido;full-time", "horas_semanais", "invalid-decimal"],
    ["0;42;full-time", "salario_mensal", "non-positive-value"],
    ["-1;42;full-time", "salario_mensal", "non-positive-value"],
    ["2.200,50;0;full-time", "horas_semanais", "non-positive-value"],
    ["2.200,50;-1;full-time", "horas_semanais", "non-positive-value"],
    ["2.200,50;42;unknown", "tipo_contrato", "unsupported-contract"],
  ])("reports row errors for invalid values: %s", (row, field, code) => {
    const parsed = parseAssumptionsCsv(
      `salario_mensal;horas_semanais;tipo_contrato\n${row}`,
    );

    expect(parsed).toMatchObject({
      ok: true,
      value: {
        validRows: [],
        errors: [{ row: 2, field, code }],
      },
    });
  });

  it("accepts part-time contracts", () => {
    expect(
      parseAssumptionsCsv(
        "salario_mensal;horas_semanais;tipo_contrato\n2.200,50;20;part-time",
      ),
    ).toMatchObject({
      ok: true,
      value: {
        validRows: [
          {
            weeklyHours: { numerator: BigInt(20), denominator: BigInt(1) },
            contractType: "part-time",
          },
        ],
        errors: [],
      },
    });
  });

  it("drops extra identifier columns and reports later normalized duplicates", () => {
    const parsed = parseAssumptionsCsv(
      "salario_mensal;horas_semanais;tipo_contrato;email\n2.200,50;42;full-time;nome-secreto@example.test\n2200,5;42;full-time;outro@example.test",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("Expected a row-level preview.");
    expect(parsed.value.validRows).toHaveLength(1);
    expect(parsed.value.validRows[0]).not.toHaveProperty("email");
    expect(parsed.value.errors).toContainEqual({
      row: 3,
      field: "registro",
      code: "duplicate-row",
      message: expect.any(String),
    });
    const normalizedJson = JSON.stringify(parsed.value.validRows, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value,
    );
    expect(normalizedJson).not.toContain("nome-secreto@example.test");
  });
});
