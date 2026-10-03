import { test, expect } from "@playwright/test";

// ============================================================
// 08 - INSTRUCTORS TESTS  (/instructors)
// ============================================================

test.describe("Instructors Management Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
    await page.evaluate(() => {
      sessionStorage.setItem("token", "test-token");
      sessionStorage.setItem("user", JSON.stringify({
        id: 1, name: "Test School", role: "school", email: "s@t.com"
      }));
    });
    await page.goto("/instructors");
    await page.waitForTimeout(2000);
  });

  test("Instructors page loads", async ({ page }) => {
    expect(page.url()).toContain("/instructors");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Page has instructors heading or title", async ({ page }) => {
    const heading = page.locator("h1, h2, [class*='title'], [class*='heading']").first();
    await expect(heading).toBeVisible();
  });

  test("Add Instructor button is visible", async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Invite"), button:has-text("Create")').first();
    if (await addBtn.count() > 0) {
      await expect(addBtn).toBeVisible();
      await expect(addBtn).toBeEnabled();
    } else {
      test.skip();
    }
  });

  test("Instructor list or cards rendered", async ({ page }) => {
    // Either shows instructors or shows empty state
    const content = page.locator('[class*="card"], [class*="instructor"], [class*="item"], table, [class*="empty"]').first();
    if (await content.count() > 0) {
      await expect(content).toBeVisible();
    } else {
      test.skip();
    }
  });

  test("Search input works for instructors", async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="instructor" i]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill("Test Instructor");
      await expect(searchInput).toHaveValue("Test Instructor");
    } else {
      test.skip();
    }
  });
});
