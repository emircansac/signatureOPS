import { test, expect } from "@playwright/test";

test("landing page is public", async ({ page }) => {
  await page.goto("/tr");
  await expect(page.getByRole("heading", { name: /büyük bir fırsat/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "SignatureOps" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Giriş yap" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Google ile devam et" })).toHaveCount(0);
});

test("login skips Google and opens the signature panel", async ({ page }) => {
  await page.goto("/tr/giris");
  await expect(page).toHaveURL(/\/tr\/app\/[^/]+/);
  await expect(page.getByRole("heading", { name: "İmza paneli" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Google ile devam et" })).toHaveCount(0);
});

test("admin panel is reachable without Google login", async ({ page }) => {
  await page.goto("/tr/app/acme");
  await expect(page).not.toHaveURL(/\/giris/);
  await expect(page.getByRole("heading", { name: "İmza paneli" })).toBeVisible();
});
