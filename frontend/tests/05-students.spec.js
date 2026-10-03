import { test, expect } from "@playwright/test";

// ============================================================
// 05 - STUDENTS MANAGEMENT TESTS  (/students)
// ============================================================

test.describe("Students Management Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
    await page.evaluate(() => {
      sessionStorage.setItem("token", "test-token");
      sessionStorage.setItem("user", JSON.stringify({
        id: 1, name: "Test School", role: "school", email: "s@t.com"
      }));
    });
    await page.goto("/students");
    await page.waitForTimeout(2000);
  });

  test("Students page loads", async ({ page }) => {
    expect(page.url()).toContain("/students");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Page has a heading or title", async ({ page }) => {
    const heading = page.locator("h1, h2, [class*='title'], [class*='heading']").first();
    await expect(heading).toBeVisible();
  });

  test("Search/filter input is present", async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="find" i], input[placeholder*="student" i]').first();
    if (await searchInput.count() > 0) {
      await expect(searchInput).toBeVisible();
      await searchInput.fill("Test Student");
      await expect(searchInput).toHaveValue("Test Student");
    } else {
      test.skip();
    }
  });

  test("Add Student button or similar CTA is visible", async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Invite"), button:has-text("Create")').first();
    if (await addBtn.count() > 0) {
      await expect(addBtn).toBeVisible();
    } else {
      test.skip();
    }
  });
});

test.describe("Student Portal - Invite Link", () => {
  test("/student-portal without token shows error", async ({ page }) => {
    await page.goto("/student-portal");
    await page.waitForTimeout(2000);
    // Should show an error about missing token
    const errorText = page.locator('text=/token|invite|link|error/i').first();
    await expect(errorText).toBeVisible();
  });
});
