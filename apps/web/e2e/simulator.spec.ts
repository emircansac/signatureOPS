import { test, expect } from "@playwright/test";

test("landing page is public", async ({ page }) => {
  await page.goto("/tr");
  await expect(page.getByRole("heading", { name: /büyük bir fırsat/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "SignatureOps" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Giriş yap" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Google ile devam et" })).toHaveCount(0);
});

test("login page shows Google sign-in", async ({ page }) => {
  await page.goto("/tr/giris");
  await expect(page.getByRole("heading", { name: "Giriş yap" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Google ile devam et" })).toBeVisible();
});

test("admin panel redirects to login", async ({ page }) => {
  await page.goto("/tr/app/acme");
  await expect(page).toHaveURL(/\/tr\/giris/);
});
