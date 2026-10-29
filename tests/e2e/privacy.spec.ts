import { expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";

const decodeRequestData = (value: string): string => {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
};

test("keeps operational assumptions and results in browser memory only", async ({
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

  await page.getByRole("link", { name: "Começar diagnóstico" }).click();
  await expect(page.getByText("Nenhum dado é enviado ou salvo.")).toBeVisible();
  await expect(
    page.getByText(
      "Parâmetros legais provisórios · publicados em 16/10/2026 · GJ-04 permanece como bloqueador de lançamento.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByLabel("Salário mensal — Pessoa 1").fill(salary);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByText(/Etapa aplicável na data de referência:/),
  ).toBeVisible();

  await page.getByRole("link", { name: "Cenários" }).click();
  await page.getByLabel("Salário mensal de reposição").fill(replacementSalary);
  await page.getByLabel("Perda mensal de receita").fill(revenueLoss);
  await page.getByRole("button", { name: "Calcular cenários" }).click();
  const firstResults = page.getByRole("region", { name: /Resultados —/ }).first();
  await expect(firstResults).toBeVisible();
  const resultValues =
    (await firstResults.innerText()).match(/R\$\s*[\d.,]+/g) ?? [];

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
  for (const value of [salary, replacementSalary, revenueLoss, ...resultValues]) {
    expect(requestText).not.toContain(value);
    expect(requestText).not.toContain(encodeURIComponent(value));
    expect(externalRequestText).not.toContain(value);
    expect(externalRequestText).not.toContain(encodeURIComponent(value));
  }

  await page.reload();
  await expect(page.getByLabel("Salário mensal — Pessoa 1")).toHaveValue("2.200,00");
  await expect(page.getByLabel("Salário mensal de reposição")).toHaveValue(
    "3.000,00",
  );
  await expect(page.getByLabel("Perda mensal de receita")).toHaveValue("0");
  await expect(page.getByText("Diagnóstico pendente.")).toBeVisible();
  await expect(page.getByText("Resultados pendentes.")).toBeVisible();
});
