import { expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";

const decodeRequestData = (value: string): string => {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
};

test("saves only diagnostic assumptions locally and sends no operational data", async ({
  page,
}) => {
  const requests: Array<{ url: string; body: string | null }> = [];
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl);
  const origin = new URL(page.url()).origin;

  page.on("request", (request) => {
    requests.push({ url: request.url(), body: request.postData() });
  });

  const salary = "98765,43";
  const replacementSalary = "87654,32";
  const revenueLoss = "12345,67";

  await page.getByRole("link", { name: "Diagnóstico e custos detalhados" }).click();
  await expect(
    page.getByText(
      "Informe dados de operação para estimativas locais. Nada é enviado; salvar neste navegador é opcional.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Parâmetros legais provisórios · publicados em 16/10/2026 · GJ-04 permanece como bloqueador de lançamento.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByLabel("Salário mensal — Pessoa 1").fill(salary);
  await page.getByLabel("Início — Faixa 1").fill("08:17");
  await page.getByLabel("Fim — Faixa 1").fill("17:43");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("transicao-escala:assumptions"),
    ),
  ).toBeNull();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByText(/Etapa aplicável na data de referência:/),
  ).toBeVisible();

  await page.getByRole("link", { name: "Cenários" }).click();
  await page.getByLabel("Salário mensal de reposição").fill(replacementSalary);
  await page.getByLabel("Perda mensal de receita").fill(revenueLoss);
  await page.getByRole("button", { name: "Calcular cenários" }).click();
  const resultRegions = page.getByRole("region", { name: /Resultados —/ });
  await expect(resultRegions).toHaveCount(3);
  const resultValues = (await resultRegions.allInnerTexts()).flatMap(
    (text) => text.match(/R\$\s*[\d.,]+/g) ?? [],
  );

  for (const region of await resultRegions.all()) {
    await expect(region).toBeVisible();
    const stageValues = (await region.innerText()).match(/R\$\s*[\d.,]+/g) ?? [];
    expect(stageValues.length).toBeGreaterThan(0);
    expect(resultValues).toEqual(expect.arrayContaining(stageValues));
  }

  await page.getByRole("button", { name: "Salvar neste navegador" }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("transicao-escala:assumptions"),
      ),
    )
    .toContain(salary);
  const savedRecord = await page.evaluate(() =>
    localStorage.getItem("transicao-escala:assumptions"),
  );
  expect(savedRecord).toContain('"startMinute":497');
  expect(savedRecord).toContain('"endMinute":1063');
  for (const value of [replacementSalary, revenueLoss, ...resultValues]) {
    expect(savedRecord).not.toContain(value);
  }

  const requestText = requests
    .flatMap(({ url, body }) => [
      url,
      decodeRequestData(url),
      body ?? "",
      decodeRequestData(body ?? ""),
    ])
    .join("\n");
  const externalRequestText = requests
    .filter(({ url }) => new URL(url).origin !== origin)
    .flatMap(({ url, body }) => [
      url,
      decodeRequestData(url),
      body ?? "",
      decodeRequestData(body ?? ""),
    ])
    .join("\n");
  for (const value of [
    salary,
    replacementSalary,
    revenueLoss,
    "08:17",
    "17:43",
    "497",
    "1063",
    ...resultValues,
  ]) {
    expect(requestText).not.toContain(value);
    expect(requestText).not.toContain(encodeURIComponent(value));
    expect(externalRequestText).not.toContain(value);
    expect(externalRequestText).not.toContain(encodeURIComponent(value));
  }

  await page.reload();
  await expect(page.getByLabel("Salário mensal — Pessoa 1")).toHaveValue(salary);
  await expect(page.getByLabel("Início — Faixa 1")).toHaveValue("08:17");
  await expect(page.getByLabel("Fim — Faixa 1")).toHaveValue("17:43");
  await expect(page.getByLabel("Salário mensal de reposição")).toHaveValue(
    "3.000,00",
  );
  await expect(page.getByLabel("Perda mensal de receita")).toHaveValue("0");
  await expect(page.getByText("Diagnóstico pendente.")).toBeVisible();
  await expect(page.getByText("Resultados pendentes.")).toBeVisible();
});
