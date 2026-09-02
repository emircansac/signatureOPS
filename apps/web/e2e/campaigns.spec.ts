import { test, expect } from "@playwright/test";

test("campaign create, status badge, and active delete confirm", async ({ page }) => {
  await page.goto("/tr/app/acme/campaigns");
  await expect(page.getByRole("heading", { name: "Kampanyalar" })).toBeVisible();
  await expect(page.getByText("Bitti").first()).toBeVisible();

  await page.getByRole("button", { name: "+ Kampanya Oluştur" }).click();
  const name = `Kampanya ${Date.now()}`;
  await page.getByLabel(/Ad/).fill(name);
  await page.getByLabel(/Başlangıç/).fill("2026-09-01");
  await page.getByLabel(/Bitiş/).fill("2026-08-01");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByText("Bitiş tarihi başlangıçtan önce olamaz")).toBeVisible();

  await page.getByLabel(/Bitiş/).fill("2026-09-30");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByText("Banner seçin")).toBeVisible();

  await page.getByRole("button", { name: "Banner", exact: true }).click();
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText("Aktif").first()).toBeVisible();

  await page.getByRole("heading", { name }).locator("xpath=../..").getByRole("button", { name: "Sil" }).click();
  await expect(
    page.getByText("Bu kampanya şu an aktif, silinirse ilgili şablonlar hemen orijinal haline döner"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Evet, sil" }).click();
  await expect(page.getByRole("heading", { name })).toHaveCount(0);
});
