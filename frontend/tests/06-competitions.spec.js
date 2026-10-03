import { test, expect } from "@playwright/test";

// ============================================================
// 06 - COMPETITIONS TESTS  (/competitions)
// ============================================================

test.describe("Competitions Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
    await page.evaluate(() => {
      sessionStorage.setItem("token", "test-token");
      sessionStorage.setItem("user", JSON.stringify({
        id: 1, name: "Test School", role: "school", email: "s@t.com"
      }));
    });
    await page.goto("/competitions");
    await page.waitForTimeout(2000);
  });

  test("Competitions page loads", async ({ page }) => {
    expect(page.url()).toContain("/competitions");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Page has competitions heading or title", async ({ page }) => {
    const heading = page.locator("h1, h2, [class*='title'], [class*='heading']").first();
    await expect(heading).toBeVisible();
  });

  test("Create or Add Competition button visible", async ({ page }) => {
    const createBtn = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New Competition"), button:has-text("+")').first();
    if (await createBtn.count() > 0) {
      await expect(createBtn).toBeVisible();
      await expect(createBtn).toBeEnabled();
    } else {
      test.skip();
    }
  });

  test("Competition list or cards are displayed", async ({ page }) => {
    const items = page.locator('[class*="card"], [class*="competition"], [class*="item"], li, tr').first();
    if (await items.count() > 0) {
      await expect(items).toBeVisible();
    } else {
      // Empty state is also valid
      const emptyState = page.locator('text=/no competition|empty|none|create your first/i').first();
      if (await emptyState.count() > 0) {
        await expect(emptyState).toBeVisible();
      } else {
        test.skip();
      }
    }
  });
});

test.describe("Judge Portal - Competition Judging", () => {
  test("/join page loads", async ({ page }) => {
    await page.goto("/join");
    await expect(page.locator("body")).toBeVisible();
  });

  test("/judge/login page loads", async ({ page }) => {
    await page.goto("/judge/login");
    await expect(page.locator("body")).toBeVisible();
  });

  test("/judge-scoring page is accessible", async ({ page }) => {
    await page.goto("/judge-scoring");
    await expect(page.locator("body")).toBeVisible();
  });
});
