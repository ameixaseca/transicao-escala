import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`generates and revises a weekly schedule at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByLabel("Quantos funcionários você tem hoje?").fill("2");
    await page.getByRole("button", { name: "Gerar escala" }).click();
    const output = page.getByRole("region", { name: "Sua escala semanal" });
    await expect(output).toBeVisible();
    await expect(output.getByText("Cobertura atendida nas verificações implementadas.")).toBeVisible();
    await expect(output.getByText("Cobertura não é aprovação jurídica")).toBeVisible();
    await expect(output.getByText(/Intervalo/).first()).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    await page.getByLabel("Quantos funcionários você tem hoje?").fill("3");
    await expect(page.getByRole("status")).toContainText("Dados alterados. Gere a escala novamente.");
    await expect(page.getByText(/Cobertura atendida/)).toHaveCount(0);
    await page.getByRole("link", { name: "Diagnóstico e custos detalhados" }).click();
    await expect(page.getByRole("heading", { name: "Premissas", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Voltar ao planejador de escalas" }).click();
    await expect(page.getByRole("heading", { name: "Monte sua escala de trabalho" })).toBeVisible();
  });
}

test("keeps insufficient coverage explicit and shows field errors accessibly", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Gerar escala" }).click();
  await expect(page.getByRole("alert", { name: "Revise os campos indicados" })).toBeVisible();
  await expect(page.getByLabel("Quantos funcionários você tem hoje?")).toBeFocused();
  await page.getByLabel("Quantos funcionários você tem hoje?").fill("1");
  await page.getByRole("button", { name: "Gerar escala" }).click();
  await expect(page.getByText("Ainda há horários sem cobertura.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Onde falta cobertura" })).toBeVisible();
  await expect(page.getByText(/Estimativa mínima de pessoas adicionais: 1/)).toBeVisible();
});

test("copies selected days and keeps planning data private and unsaved", async ({ page }) => {
  await page.goto("/");
  const saved = '{"sentinel":"preserve-detailed-assumptions"}';
  await page.evaluate(value => localStorage.setItem("transicao-escala:assumptions", value), saved);
  const requests: Array<{ url: string; body: string }> = [];
  page.on("request", request => requests.push({ url: request.url(), body: request.postData() ?? "" }));
  await page.getByLabel("Quantos funcionários você tem hoje?").fill("7");
  await page.getByLabel("Abertura — Segunda-feira", { exact: true }).fill("08:17");
  await page.getByLabel("Fechamento — Segunda-feira", { exact: true }).fill("17:43");
  await page.getByText("Repetir horários em outros dias", { exact: true }).click();
  await page.getByLabel("Copiar para Terça-feira", { exact: true }).check();
  await page.getByRole("button", { name: "Copiar para os dias selecionados" }).click();
  await expect(page.getByLabel("Abertura — Terça-feira", { exact: true })).toHaveValue("08:17");
  await expect(page.getByLabel("Abertura — Quarta-feira", { exact: true })).toHaveValue("09:00");
  await page.getByRole("button", { name: "Gerar escala" }).click();
  await expect(page.getByRole("region", { name: "Sua escala semanal" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("transicao-escala:assumptions"))).toBe(saved);
  expect(await page.evaluate(() => localStorage.length)).toBe(1);
  for (const request of requests) {
    const text = `${decodeURIComponent(request.url)} ${request.body}`;
    expect(text).not.toContain("08:17");
    expect(text).not.toContain("17:43");
    expect(request.body).toBe("");
  }
  await page.reload();
  await expect(page.getByLabel("Quantos funcionários você tem hoje?")).toHaveValue("");
});
