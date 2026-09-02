import { test, expect } from "@playwright/test";

test("directory add, duplicate email, and csv import", async ({ page }) => {
  await page.goto("/tr/app/acme/directory");
  await expect(page.getByRole("heading", { name: "Dizin" })).toBeVisible();

  await page.getByRole("button", { name: "+ Kişi Ekle" }).click();
  const uniqueEmail = `test.kisi.${Date.now()}@acme.com`;
  await page.getByLabel(/Ad/).fill("Test Kişi");
  await page.getByLabel(/Pozisyon/).fill("Analist");
  await page.getByLabel(/E-posta/).fill("not-an-email");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByText("Geçersiz e-posta")).toBeVisible();

  await page.getByLabel(/E-posta/).fill("ayse@acme.com");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByText("Bu e-posta zaten kayıtlı")).toBeVisible();

  await page.getByLabel(/E-posta/).fill(uniqueEmail);
  await page.getByLabel(/Mobil/).fill("5550001111");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByRole("cell", { name: uniqueEmail })).toBeVisible();
  const addedRow = page.locator("tr", { hasText: uniqueEmail });
  await expect(addedRow.getByText("Fotoğraf")).toBeVisible();
  await expect(addedRow.getByText("Mobil")).toHaveCount(0);

  await addedRow.getByRole("button", { name: "Düzenle" }).click();
  await expect(page.getByRole("dialog", { name: "Kişiyi düzenle" })).toBeVisible();
  await page.getByLabel(/Departman/).fill("Satış");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(addedRow.getByText("Satış")).toBeVisible();

  await page.getByRole("button", { name: "İçe Aktar" }).click();
  const stamp = Date.now();
  const importName = `Import ${stamp}`;
  const csv = [
    "Full Name,Job Title,Email,Phone",
    `${importName},Designer,import.new.${stamp}@acme.com,5552223344`,
    "Ayşe Yılmaz,Sales Manager,ayse@acme.com,5551234567",
    "Broken,,bad-email,",
  ].join("\n");
  await page.locator('input[type="file"]').setInputFiles({
    name: "people.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(page.getByRole("button", { name: "İleri" })).toBeVisible();
  await page.getByRole("button", { name: "İleri" }).click();
  await expect(page.getByText("2 satır geçerli")).toBeVisible();
  await expect(page.getByText("1 satır hatalı")).toBeVisible();
  await page.getByRole("button", { name: "Geçerli satırları içe aktar" }).click();
  await expect(page.getByText("1 kişi eklendi, 1 kişi güncellendi, 1 satır hatalı")).toBeVisible();
  await page.getByRole("button", { name: "Kapat", exact: true }).click();
  await expect(page.getByRole("cell", { name: importName })).toBeVisible();

  await addedRow.getByRole("button", { name: "Sil" }).click();
  await expect(page.getByText("Bu kişiyi silmek istiyor musunuz?")).toBeVisible();
  await page.getByRole("button", { name: "Evet, sil" }).click();
  await expect(page.getByRole("cell", { name: uniqueEmail })).toHaveCount(0);
});

test("directory accepts xlsx and auto-maps headers", async ({ page }) => {
  const XLSX = await import("xlsx");
  const stamp = Date.now();
  const email = `xlsx.${stamp}@acme.com`;
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Full Name", "Job Title", "Email", "Phone"],
    [`Xlsx ${stamp}`, "Analyst", email, "5553334444"],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "People");
  const buffer = Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as ArrayBuffer);

  await page.goto("/tr/app/acme/directory");
  await page.getByRole("button", { name: "İçe Aktar" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "people.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer,
  });
  await expect(page.getByRole("button", { name: "İleri" })).toBeVisible();
  await expect(page.getByRole("combobox").nth(0)).toHaveValue("Full Name");
  await expect(page.getByRole("combobox").nth(1)).toHaveValue("Job Title");
  await expect(page.getByRole("combobox").nth(2)).toHaveValue("Email");
  await page.getByRole("button", { name: "İleri" }).click();
  await expect(page.getByText("1 satır geçerli")).toBeVisible();
  await page.getByRole("button", { name: "Geçerli satırları içe aktar" }).click();
  await expect(page.getByText("1 kişi eklendi, 0 kişi güncellendi, 0 satır hatalı")).toBeVisible();
  await page.getByRole("button", { name: "Kapat", exact: true }).click();
  await expect(page.getByRole("cell", { name: email })).toBeVisible();
});
