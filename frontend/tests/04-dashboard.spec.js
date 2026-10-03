import { test, expect } from "@playwright/test";

// ============================================================
// 04 - DASHBOARD TESTS  (/dashboard)
// Requires fake session token
// ============================================================

test.describe("School Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Inject fake session to bypass PrivateRoute
    await page.goto("/auth");
    await page.evaluate(() => {
      sessionStorage.setItem("token", "test-token-dashboard");
      sessionStorage.setItem("user", JSON.stringify({
        id: 1,
        name: "Test Surf School",
        role: "school",
        email: "school@test.com"
      }));
    });
    await page.goto("/dashboard");
    await page.waitForTimeout(1500);
  });

  test("Dashboard page loads after login", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
    // Should not redirect to /auth
    expect(page.url()).toContain("/dashboard");
  });

  test("Sidebar is visible", async ({ page }) => {
    const sidebar = page.locator('[class*="sidebar"], nav, [class*="nav"]').first();
    await expect(sidebar).toBeVisible();
  });

  test("Navigation links exist", async ({ page }) => {
    // Should have links to key pages
    const navLinks = page.locator("a, [class*='nav-item'], [class*='menu-item']");
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(2);
  });

  test("Dashboard has some content (stats or cards)", async ({ page }) => {
    const content = page.locator('[class*="card"], [class*="stat"], [class*="widget"], main, [class*="dashboard"]').first();
    await expect(content).toBeVisible();
  });
});
