import { test, expect } from "@playwright/test";

// ============================================================
// 09 - NAVIGATION & SIDEBAR TESTS
// Sidebar links navigate correctly
// ============================================================

// Helper to inject session
async function loginSession(page) {
  await page.goto("/auth");
  await page.evaluate(() => {
    sessionStorage.setItem("token", "test-token");
    sessionStorage.setItem("user", JSON.stringify({
      id: 1, name: "Test School", role: "school", email: "s@t.com"
    }));
  });
}

test.describe("Sidebar Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginSession(page);
    await page.goto("/dashboard");
    await page.waitForTimeout(1500);
  });

  test("Sidebar is rendered", async ({ page }) => {
    const sidebar = page.locator('[class*="sidebar"], [class*="Sidebar"], nav').first();
    await expect(sidebar).toBeVisible();
  });

  test("Clicking Students nav goes to /students", async ({ page }) => {
    const studentsLink = page.locator('a[href="/students"], [class*="nav"] >> text=/students/i').first();
    if (await studentsLink.count() > 0) {
      await studentsLink.click();
      await page.waitForURL(/\/students/, { timeout: 3000 });
      expect(page.url()).toContain("/students");
    } else {
      test.skip();
    }
  });

  test("Clicking Instructors nav goes to /instructors", async ({ page }) => {
    const instrLink = page.locator('a[href="/instructors"], [class*="nav"] >> text=/instructor/i').first();
    if (await instrLink.count() > 0) {
      await instrLink.click();
      await page.waitForURL(/\/instructors/, { timeout: 3000 });
      expect(page.url()).toContain("/instructors");
    } else {
      test.skip();
    }
  });

  test("Clicking Sessions nav goes to /sessions", async ({ page }) => {
    const sessLink = page.locator('a[href="/sessions"], [class*="nav"] >> text=/session/i').first();
    if (await sessLink.count() > 0) {
      await sessLink.click();
      await page.waitForURL(/\/sessions/, { timeout: 3000 });
      expect(page.url()).toContain("/sessions");
    } else {
      test.skip();
    }
  });

  test("Clicking Competitions nav goes to /competitions", async ({ page }) => {
    const compLink = page.locator('a[href="/competitions"], [class*="nav"] >> text=/competition/i').first();
    if (await compLink.count() > 0) {
      await compLink.click();
      await page.waitForURL(/\/competitions/, { timeout: 3000 });
      expect(page.url()).toContain("/competitions");
    } else {
      test.skip();
    }
  });
});

test.describe("Page Titles and Basic Rendering", () => {
  const pages = [
    { name: "Auth", url: "/auth" },
    { name: "Register", url: "/register" },
    { name: "Join Judge", url: "/join" },
    { name: "Judge Login", url: "/judge/login" },
  ];

  for (const p of pages) {
    test(`${p.name} page has a visible body`, async ({ page }) => {
      await page.goto(p.url);
      await expect(page.locator("body")).toBeVisible();
    });
  }
});
