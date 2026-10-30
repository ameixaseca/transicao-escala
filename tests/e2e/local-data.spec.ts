import { expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";
const storageKey = "transicao-escala:assumptions";

test("saves diagnostic assumptions only on request and restores them after reload", async ({
  page,
}) => {
  await page.goto(baseUrl);
  await page.getByRole("link", { name: "Diagnóstico e custos detalhados" }).click();

  await page.getByLabel("Salário mensal — Pessoa 1").fill("98765,43");
  await expect(page.getByRole("button", { name: "Salvar neste navegador" })).toBeEnabled();
  await page.getByRole("button", { name: "Salvar neste navegador" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Premissas salvas neste navegador.",
  );
  await expect
    .poll(() =>
      page.evaluate((key) => localStorage.getItem(key), storageKey),
    )
    .toContain("98765,43");

  await page.reload();
  await expect(page.getByLabel("Salário mensal — Pessoa 1")).toHaveValue(
    "98765,43",
  );
  await expect(page.getByLabel("Salário mensal de reposição")).toHaveValue(
    "3.000,00",
  );
  await expect(page.getByText("Diagnóstico pendente.")).toBeVisible();
  await expect(page.getByText("Resultados pendentes.")).toBeVisible();
});

test("cancelling deletion preserves both the stored record and active form", async ({
  page,
}) => {
  await page.goto(baseUrl);
  await page.getByRole("link", { name: "Diagnóstico e custos detalhados" }).click();
  await page.getByLabel("Salário mensal — Pessoa 1").fill("98765,43");
  await page.getByRole("button", { name: "Salvar neste navegador" }).click();
  const savedBefore = await page.evaluate(
    (key) => localStorage.getItem(key),
    storageKey,
  );

  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Excluir dados salvos" }).click();

  await expect(page.getByLabel("Salário mensal — Pessoa 1")).toHaveValue(
    "98765,43",
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe(savedBefore);
});

test("confirmed deletion clears storage and all active dashboard state", async ({
  page,
}) => {
  await page.goto(baseUrl);
  await page.getByRole("link", { name: "Diagnóstico e custos detalhados" }).click();
  await page.getByLabel("Salário mensal — Pessoa 1").fill("98765,43");
  await page.getByRole("button", { name: "Salvar neste navegador" }).click();

  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText(/Etapa aplicável na data de referência:/)).toBeVisible();
  await page.getByLabel("Salário mensal de reposição").fill("87654,32");
  await page.getByRole("button", { name: "Calcular cenários" }).click();
  await expect(page.getByRole("region", { name: /Resultados —/ }).first()).toBeVisible();

  const validCheck = page.getByRole("radio", { name: "Válido" }).first();
  await validCheck.check();
  const timelineCheck = page.getByLabel(
    "Revisar limite de jornada e instrumento coletivo aplicável",
  ).first();
  await timelineCheck.check();
  await page.getByRole("button", { name: "Calcular cenários" }).click();
  await expect(page.getByRole("region", { name: /Resultados —/ })).toHaveCount(3);

  await page.getByRole("link", { name: "Cenários" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Excluir dados salvos" }).click();

  await expect(page.getByLabel("Salário mensal — Pessoa 1")).toHaveValue(
    "2.200,00",
  );
  await expect(page.getByLabel("Salário mensal de reposição")).toHaveValue(
    "3.000,00",
  );
  await expect(page.getByText("Diagnóstico pendente.")).toBeVisible();
  await expect(page.getByText("Resultados pendentes.")).toBeVisible();
  await expect(page.getByLabel("Data de referência")).toHaveValue(/\d{4}-\d{2}-\d{2}/);
  await expect(page.getByLabel("Revisar limite de jornada e instrumento coletivo aplicável").first()).not.toBeChecked();
  await expect(page.getByRole("link", { name: "Premissas" })).toHaveAttribute(
    "aria-current",
    "location",
  );
  await expect(page.getByRole("region", { name: /Resultados —/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByRole("radio", { name: "Não verificado", checked: true }),
  ).toHaveCount(15);
  await expect(page.getByText("Resultados pendentes.")).toBeVisible();

  await page.reload();
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), storageKey))
    .toBeNull();
  await expect(page.getByLabel("Salário mensal — Pessoa 1")).toHaveValue(
    "2.200,00",
  );
  await expect(page.getByLabel("Salário mensal de reposição")).toHaveValue(
    "3.000,00",
  );
});
