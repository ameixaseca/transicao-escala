import { expect, test, type Locator, type Page } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";

const expectNoHorizontalOverflow = async (page: Page) => {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document, "page should not overflow horizontally").toBeLessThanOrEqual(
    dimensions.viewport,
  );
};

const expectPrimaryUsable = async (page: Page, control: Locator) => {
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeVisible();
  await expect(control).toBeEnabled();
  const isUnblocked = await control.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const hit = document.elementFromPoint(x, y);
    return (
      bounds.width > 0 &&
      bounds.height > 0 &&
      x >= 0 &&
      x <= document.documentElement.clientWidth &&
      y >= 0 &&
      y <= document.documentElement.clientHeight &&
      (hit === element || element.contains(hit))
    );
  });
  expect(isUnblocked, "primary control should be unobstructed in the viewport").toBe(
    true,
  );
};

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`completes the diagnostic and scenario flow at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(baseUrl);

    const start = page.getByRole("link", { name: "Diagnóstico e custos detalhados" });
    await expectNoHorizontalOverflow(page);
    await expectPrimaryUsable(page, start);
    await start.click();

    const continueButton = page.getByRole("button", { name: "Continuar" });
    await expect(
      page.getByRole("heading", { name: "Premissas", exact: true }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectPrimaryUsable(page, continueButton);

    await page.getByLabel("Salário mensal — Pessoa 1").fill("98765,43");
    await continueButton.click();
    await expect(
      page.getByText(/Etapa aplicável na data de referência:/),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("link", { name: "Cenários" }).click();
    const calculateButton = page.getByRole("button", { name: "Calcular cenários" });
    await page.getByLabel("Salário mensal de reposição").fill("87654,32");
    await expectNoHorizontalOverflow(page);
    await expectPrimaryUsable(page, calculateButton);
    await calculateButton.click();
    await expect(
      page.getByRole("region", { name: /Resultados —/ }).first(),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByLabel("Perda mensal de receita").fill("12345,67");
    await expect(page.getByText("Resultados pendentes.")).toBeVisible();
    await expectPrimaryUsable(page, calculateButton);
    await calculateButton.click();
    await expect(
      page.getByRole("region", { name: /Resultados —/ }).first(),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}
