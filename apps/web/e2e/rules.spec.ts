import { test, expect } from "@playwright/test";

test("hamburger includes Rules and Simulator", async ({ page }) => {
  await page.goto("/tr/app/acme");
  await page.getByRole("button", { name: "Menüyü aç" }).click();
  const menu = page.locator("aside");
  await expect(menu.getByRole("link", { name: /Kurallar/ })).toBeVisible();
  await expect(menu.getByRole("link", { name: /Simulator/ })).toBeVisible();

  await menu.getByRole("link", { name: /Kurallar/ }).click();
  await expect(page.getByRole("heading", { name: "Kurallar" })).toBeVisible();

  await page.getByRole("button", { name: "Menüyü aç" }).click();
  await page.locator("aside").getByRole("link", { name: /Simulator/ }).click();
  await expect(page.getByRole("heading", { name: "Simulator" })).toBeVisible();
});

test("seed rules open with full condition and action surface", async ({ page }) => {
  await page.goto("/tr/app/acme/rules");
  await expect(page.getByRole("heading", { name: "Kurallar" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Org Default" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sales External" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ayşe Executive Override" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Marketing Banner" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Internal Simplified" })).toBeVisible();

  const dialog = page.getByRole("dialog", { name: "Kuralı düzenle" });

  const card = (name: string) =>
    page.getByRole("heading", { name, exact: true }).locator("xpath=../..");

  await card("Org Default").getByRole("button", { name: "Düzenle" }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Koşul eklenmezse bu kural her zaman uygulanır.")).toBeVisible();
  await expect(dialog.getByLabel("Seviye")).toHaveValue("ORG");
  await expect(dialog.locator('select[id^="act-type-"]')).toHaveValue("select_template");
  await expect(dialog.locator('select[id^="act-template-"]')).toHaveValue("tpl-default");
  await dialog.getByRole("button", { name: "İptal" }).first().click();

  await card("Sales External").getByRole("button", { name: "Düzenle" }).click();
  await expect(dialog.getByLabel("Seviye")).toHaveValue("DEPT_OFFICE");
  await expect(dialog.locator('select[id^="cond-type-"]')).toHaveCount(2);
  await expect(dialog.locator('select[id^="cond-type-"]').nth(0)).toHaveValue("department");
  await expect(dialog.locator('input[id^="cond-value-"]')).toHaveValue("Sales");
  await expect(dialog.locator('select[id^="cond-type-"]').nth(1)).toHaveValue("recipient_type");
  await expect(dialog.locator('select[id^="cond-value-"]')).toHaveValue("external");
  await dialog.getByRole("button", { name: "İptal" }).first().click();

  await card("Ayşe Executive Override").getByRole("button", { name: "Düzenle" }).click();
  await expect(dialog.getByLabel("Seviye")).toHaveValue("USER");
  await expect(dialog.getByText("USER: belirli bir kişiye özel.")).toBeVisible();
  await expect(dialog.locator('select[id^="cond-type-"]')).toHaveValue("user");
  await expect(dialog.locator('select[id^="act-type-"]')).toHaveCount(2);
  await expect(dialog.locator('select[id^="act-type-"]').nth(0)).toHaveValue("select_template");
  await expect(dialog.locator('select[id^="act-type-"]').nth(1)).toHaveValue("select_disclaimer");
  await expect(dialog.getByLabel("Uyarı metni")).toHaveValue("Yönetici gizlilik bildirimi");
  await dialog.getByRole("button", { name: "İptal" }).first().click();

  await card("Marketing Banner").getByRole("button", { name: "Düzenle" }).click();
  await expect(dialog.getByLabel("Seviye")).toHaveValue("GROUP");
  await expect(dialog.locator('select[id^="cond-type-"]')).toHaveValue("group");
  await expect(dialog.locator('select[id^="cond-op-"]')).toHaveValue("in");
  await expect(dialog.getByRole("checkbox", { name: "Marketing Team" })).toBeChecked();
  await expect(dialog.locator('select[id^="act-type-"]')).toHaveValue("select_banner");
  await expect(dialog.locator('select[id^="act-campaign-"]')).toHaveValue("camp-spring");
  await dialog.getByRole("button", { name: "İptal" }).first().click();

  await card("Internal Simplified").getByRole("button", { name: "Düzenle" }).click();
  await expect(dialog.locator('select[id^="cond-type-"]')).toHaveValue("recipient_type");
  await expect(dialog.locator('select[id^="act-type-"]')).toHaveValue("hide_block");
  await expect(dialog.locator('select[id^="act-block-"]')).toHaveValue("legal_disclaimer");
  await dialog.getByRole("button", { name: "İptal" }).first().click();
});

test("rules can be created, toggled, edited, tested, and deleted", async ({ page }) => {
  await page.goto("/tr/app/acme/rules");
  await page.getByRole("button", { name: "Yeni Kural" }).click();
  const dialog = page.getByRole("dialog", { name: "Yeni Kural" });
  const name = `Kural ${Date.now()}`;
  await dialog.getByLabel("Ad").fill(name);
  await dialog.getByLabel("Seviye").selectOption("DEPT_OFFICE");
  await dialog.getByRole("button", { name: "+ Koşul Ekle" }).click();
  await dialog.locator('select[id^="cond-type-"]').selectOption("department");
  await dialog.locator('input[id^="cond-value-"]').fill("Sales");
  await dialog.getByRole("button", { name: "+ Koşul Ekle" }).click();
  await dialog.locator('select[id^="cond-type-"]').nth(1).selectOption("campaign_active");
  await dialog.locator('select[id^="cond-value-"]').selectOption("camp-spring");
  await dialog.locator('select[id^="act-type-"]').selectOption("select_template");
  await dialog.locator('select[id^="act-template-"]').selectOption("tpl-default");
  await dialog.getByRole("button", { name: "+ Aksiyon Ekle" }).click();
  await dialog.locator('select[id^="act-type-"]').nth(1).selectOption("override_brand_asset");
  await dialog.getByRole("button", { name: "Logo" }).click();
  await dialog.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();

  const row = page.getByRole("heading", { name, exact: true }).locator("xpath=../..");
  await row.getByRole("checkbox").uncheck();
  await expect(row.getByRole("checkbox")).not.toBeChecked();

  await row.getByRole("button", { name: "Düzenle" }).click();
  const edit = page.getByRole("dialog", { name: "Kuralı düzenle" });
  await expect(edit.getByLabel("Ad")).toHaveValue(name);
  await expect(edit.locator('select[id^="cond-type-"]').nth(1)).toHaveValue("campaign_active");
  await expect(edit.locator('select[id^="act-type-"]').nth(1)).toHaveValue("override_brand_asset");
  await edit.getByRole("button", { name: "İptal" }).first().click();

  await row.getByRole("link", { name: "Simulator'da Test Et" }).click();
  await expect(page.getByRole("heading", { name: "Simulator" })).toBeVisible();

  await page.goto("/tr/app/acme/rules");
  const created = page.getByRole("heading", { name, exact: true }).locator("xpath=../..");
  await created.getByRole("button", { name: "Sil" }).click();
  await expect(page.getByText("Bu kuralı silmek istiyor musunuz?")).toBeVisible();
  await page.getByRole("button", { name: "Evet, sil" }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toHaveCount(0);
});
