import { test, expect } from "@playwright/test";

test("seeded org shows quick actions, not onboarding or old dashboard blocks", async ({ page }) => {
  await page.goto("/tr/app/acme");
  await expect(page.getByRole("heading", { name: "İmza paneli" })).toBeVisible();

  await expect(page.getByRole("link", { name: "Kimlik Güncelle" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Yeni Kişi Ekle" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Kampanya Başlat" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Yeni Şablon Oluştur" })).toBeVisible();

  const quickActions = page.getByRole("region", { name: "Hızlı aksiyonlar" }).getByRole("link");
  await expect(quickActions).toHaveCount(4);
  await expect(quickActions.nth(0)).toHaveAccessibleName(/Kimlik Güncelle/);
  await expect(quickActions.nth(1)).toHaveAccessibleName(/Yeni Kişi Ekle/);
  await expect(quickActions.nth(2)).toHaveAccessibleName(/Kampanya Başlat/);
  await expect(quickActions.nth(3)).toHaveAccessibleName(/Yeni Şablon Oluştur/);

  await expect(page.getByRole("button", { name: "Şimdi Yap" })).toHaveCount(0);
  await expect(page.getByText("adım tamamlandı")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Yönetim" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Nasıl kullanılır" })).toHaveCount(0);

  await expect(page.getByText("Gmail'e nasıl eklerim?")).toBeVisible();
  await expect(page.getByText("Gmail → Ayarlar → Genel → İmza bölümüne yapıştırın")).not.toBeVisible();
  await page.getByText("Gmail'e nasıl eklerim?").click();
  await expect(page.getByText("Gmail → Ayarlar → Genel → İmza bölümüne yapıştırın")).toBeVisible();
});

test("quick actions open create flows and counts navigate", async ({ page }) => {
  await page.goto("/tr/app/acme");

  await page.getByRole("link", { name: "Yeni Kişi Ekle" }).click();
  await expect(page.getByRole("heading", { name: "Dizin" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "+ Kişi Ekle" })).toBeVisible();

  await page.goto("/tr/app/acme");
  await page.getByRole("link", { name: "Kampanya Başlat" }).click();
  await expect(page.getByRole("heading", { name: "Kampanyalar" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "+ Kampanya Oluştur" })).toBeVisible();

  await page.goto("/tr/app/acme");
  await page.getByRole("link", { name: "Yeni Şablon Oluştur" }).click();
  await expect(page.getByRole("heading", { name: "Şablonlar", exact: true })).toBeVisible();
  await expect(page.locator("#create-template").getByRole("heading", { name: "Yeni Şablon" })).toBeVisible();

  await page.goto("/tr/app/acme");
  await page.getByRole("link", { name: "Kimlik Güncelle" }).click();
  await expect(page.getByRole("heading", { name: "Kimlik öğeleri" })).toBeVisible();

  await page.goto("/tr/app/acme");
  await page.locator("main").getByRole("link", { name: "Şablonlar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Şablonlar", exact: true })).toBeVisible();

  await page.goto("/tr/app/acme");
  await page.locator("main").getByRole("link", { name: "Dizindeki kişiler", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dizin" })).toBeVisible();
});
