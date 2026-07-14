import { test, expect } from "@playwright/test";

test("dashboard loads with org stats", async ({ page }) => {
  await page.goto("/tr");
  await expect(page.getByRole("heading", { name: "Kontrol Paneli" })).toBeVisible();
  await expect(page.getByRole("link", { name: "SignatureOps" })).toBeVisible();
});

test("templates preview and copy html", async ({ page }) => {
  await page.goto("/tr/templates");
  await expect(page.getByRole("heading", { name: "Şablonlar" })).toBeVisible();
  await page.waitForResponse((res) => res.url().includes("users.list") && res.status() === 200);
  await page.getByRole("button", { name: "Önizleme" }).click();
  await page.waitForResponse((res) => res.url().includes("compilePreview") && res.status() === 200);
  await expect(page.getByRole("button", { name: "Gmail için kopyala" })).toBeVisible({ timeout: 5000 });
});

test("audit page analyzes client-side", async ({ page }) => {
  await page.goto("/tr/audit");
  await page.locator("textarea").fill('<div style="display:flex"><script></script></div>');
  await page.getByRole("button", { name: "Analiz Et" }).click();
  await expect(page.getByText("Flexbox detected")).toBeVisible();
});
