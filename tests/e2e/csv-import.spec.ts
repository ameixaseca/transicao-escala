import { expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";
const storageKey = "transicao-escala:assumptions";
const privacyMarker = "nome-secreto@example.test";

const csvFile = (contents: string) => ({
  name: "equipe.csv",
  mimeType: "text/csv",
  buffer: Buffer.from(contents, "utf8"),
});

const validCsv = [
  "salario_mensal,horas_semanais,tipo_contrato,email",
  '"2.200,50","42,75",full-time,nome-secreto@example.test',
  '"3.100,25","36,5",part-time,outra-pessoa@example.test',
].join("\n");

test("applies a confirmed CSV preview and preserves date and coverage", async ({
  page,
}) => {
  await page.goto(baseUrl);
  await page.getByRole("link", { name: "Começar diagnóstico" }).click();

  const date = page.getByLabel("Data de referência");
  const coverageStart = page.getByLabel("Início — Faixa 1");
  const coverageEnd = page.getByLabel("Fim — Faixa 1");
  const initialDate = await date.inputValue();
  const initialStart = await coverageStart.inputValue();
  const initialEnd = await coverageEnd.inputValue();
  await page.getByLabel("Arquivo CSV da equipe").setInputFiles(csvFile(validCsv));

  await expect(page.getByRole("table", { name: "Prévia da equipe" })).toBeVisible();
  await expect(page.getByLabel("Salário mensal — Pessoa 1")).toHaveValue("2.200,00");
  await expect(page.getByText("Diagnóstico pendente.")).toBeVisible();

  await page.getByRole("button", { name: "Aplicar linhas válidas" }).click();

  await expect(page.getByLabel("Salário mensal — Pessoa 1")).toHaveValue("2200,5");
  await expect(page.getByLabel("Horas semanais — Pessoa 1")).toHaveValue("42,75");
  await expect(page.getByLabel("Salário mensal — Pessoa 2")).toHaveValue("3100,25");
  await expect(page.getByLabel("Horas semanais — Pessoa 2")).toHaveValue("36,5");
  await expect(page.getByLabel("Salário mensal — Pessoa 3")).toHaveCount(0);
  await expect(date).toHaveValue(initialDate);
  await expect(coverageStart).toHaveValue(initialStart);
  await expect(coverageEnd).toHaveValue(initialEnd);
  await expect(page.getByText("Diagnóstico pendente.")).toBeVisible();
  await expect(page.getByText("Resultados pendentes.")).toBeVisible();
});

test("applies only valid rows after confirmation and preserves the team on cancel", async ({
  page,
}) => {
  await page.goto(baseUrl);
  await page.getByRole("link", { name: "Começar diagnóstico" }).click();
  await page.getByLabel("Arquivo CSV da equipe").setInputFiles(
    csvFile(
      [
        "salario_mensal,horas_semanais,tipo_contrato",
        '"2.200,50","42,75",full-time',
        '"inválido",40,part-time',
      ].join("\n"),
    ),
  );
  await expect(
    page.getByRole("alert").filter({
      hasText: "Informe um salário mensal numérico válido.",
    }),
  ).toContainText(
    "Informe um salário mensal numérico válido.",
  );
  await expect(page.getByLabel("Salário mensal — Pessoa 1")).toHaveValue("2.200,00");

  await page.getByRole("button", { name: "Aplicar linhas válidas" }).click();
  await expect(page.getByLabel("Salário mensal — Pessoa 1")).toHaveValue("2200,5");
  await expect(page.getByLabel("Salário mensal — Pessoa 2")).toHaveCount(0);

  await page.getByLabel("Arquivo CSV da equipe").setInputFiles(csvFile(validCsv));
  await expect(page.getByRole("table", { name: "Prévia da equipe" })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar prévia" }).click();
  await expect(page.getByRole("table", { name: "Prévia da equipe" })).toHaveCount(0);
  await expect(page.getByLabel("Salário mensal — Pessoa 1")).toHaveValue("2200,5");
});

test("keeps CSV import local, private, and opt-in for persistence", async ({
  page,
}) => {
  const requests: Array<{ url: string; body: string; method: string }> = [];
  page.on("request", (request) => {
    requests.push({
      url: request.url(),
      body: request.postData() ?? "",
      method: request.method(),
    });
  });
  await page.addInitScript(
    ({ key }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          schemaVersion: 1,
          savedAt: "2026-10-29T12:00:00.000Z",
          assumptions: {
            employeeRows: [
              {
                localId: "stored-person",
                salaryDecimal: "98.765,43",
                weeklyHoursDecimal: "42,75",
                contractType: "part-time",
              },
            ],
            coverage: [
              { weekday: 1, startMinute: 540, endMinute: 1080, minimumPeople: 1 },
            ],
            referenceDate: "2026-12-16",
            legalParameterVersion: "provisional-2026-10-16",
          },
        }),
      );
    },
    { key: storageKey },
  );
  await page.goto(baseUrl);
  await page.getByRole("link", { name: "Começar diagnóstico" }).click();
  const storedBefore = await page.evaluate((key) => localStorage.getItem(key), storageKey);
  const origin = new URL(baseUrl).origin;

  await page.getByLabel("Arquivo CSV da equipe").setInputFiles(csvFile(validCsv));
  await expect(page.getByRole("table", { name: "Prévia da equipe" })).toBeVisible();
  await page.getByRole("button", { name: "Aplicar linhas válidas" }).click();

  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe(storedBefore);
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.some(({ url }) => new URL(url).origin === origin)).toBe(true);
  expect(requests.some(({ method }) => method === "POST")).toBe(false);
  const decode = (value: string) => {
    try {
      return decodeURIComponent(value.replace(/\+/g, " "));
    } catch {
      return value;
    }
  };
  const requestText = requests
    .flatMap(({ url, body }) => [url, decode(url), body, decode(body)])
    .join("\n");
  const externalRequests = requests.filter(
    ({ url }) => new URL(url).origin !== origin,
  );
  const externalRequestText = externalRequests
    .flatMap(({ url, body }) => [url, decode(url), body, decode(body)])
    .join("\n");

  for (const value of [
    privacyMarker,
    "outra-pessoa@example.test",
    "2.200,50",
    "42,75",
    "3.100,25",
    "36,5",
    "full-time",
    "part-time",
  ]) {
    expect(requestText).not.toContain(value);
    expect(requestText).not.toContain(encodeURIComponent(value));
    expect(externalRequestText).not.toContain(value);
    expect(externalRequestText).not.toContain(encodeURIComponent(value));
  }
});
