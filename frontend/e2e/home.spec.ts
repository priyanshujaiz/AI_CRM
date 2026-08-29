import { test, expect } from "@playwright/test";

/**
 * Frontend-only smoke tests (no backend, no OpenAI).
 * These assert the core landing-page surface of the AI CSV importer:
 * page renders, the CSV upload/dropzone entry point is reachable,
 * and the theme toggle switches between light and dark mode.
 */

test("homepage renders", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Manage Your Leads" })
  ).toBeVisible();
  await expect(
    page.getByText(/Upload any CSV format/)
  ).toBeVisible();
});

test("CSV upload / dropzone UI is present", async ({ page }) => {
  await page.goto("/");

  // Trigger button opens the import modal
  const importButton = page.locator("#import-csv-btn");
  await expect(importButton).toBeVisible();
  await expect(importButton).toContainText("Import Leads via CSV");

  await importButton.click();

  // Dropzone + format hints inside the modal
  await expect(page.getByText("Drop your CSV file here")).toBeVisible();
  await expect(page.getByText("or click to browse files")).toBeVisible();
  await expect(page.getByText("Supported file: .csv (max 5MB)")).toBeVisible();
});

test("theme toggle exists and switches theme", async ({ page }) => {
  await page.goto("/");

  const toggle = page.getByTitle("Toggle theme");
  await expect(toggle).toBeVisible();

  // next-themes is configured with attribute="class", so toggling flips the
  // `dark` class on <html>.
  await toggle.click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await toggle.click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});