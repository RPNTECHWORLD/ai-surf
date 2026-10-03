import { test, expect } from "@playwright/test";

// ============================================================
// 02 - ROUTE PROTECTION TESTS
// Protected pages should redirect to /auth without a token
// ============================================================

const PROTECTED_ROUTES = [
  "/dashboard",
  "/instructors",
  "/students",
  "/analytics",
  "/sessions",
  "/sessions/new",
  "/competitions",
  "/analysis",
  "/athlete-intelligence",
];

test.describe("Protected Routes - Redirect to /auth without login", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route} redirects to /auth when not logged in`, async ({ page }) => {
      // Clear any existing session
      await page.context().clearCookies();
      await page.addInitScript(() => {
        try { sessionStorage.clear(); localStorage.clear(); } catch (e) {}
      });
      await page.goto(route);
      await page.waitForURL(/\/auth/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/auth/);
    });
  }
});

test.describe("Public Routes - Accessible without login", () => {
  test("/auth page loads without login", async ({ page }) => {
    await page.goto("/auth");
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("/register page loads without login", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("body")).toBeVisible();
  });

  test("/join page loads without login", async ({ page }) => {
    await page.goto("/join");
    await expect(page.locator("body")).toBeVisible();
  });

  test("/judge/login page loads without login", async ({ page }) => {
    await page.goto("/judge/login");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Session Token - Access after login", () => {
  test("Dashboard accessible after injecting valid session token", async ({ page }) => {
    // Inject a fake token into sessionStorage to simulate logged-in state
    await page.goto("/auth");
    await page.evaluate(() => {
      sessionStorage.setItem("token", "fake-test-token");
      sessionStorage.setItem("user", JSON.stringify({
        id: 1,
        name: "Test School",
        role: "school",
        email: "test@school.com"
      }));
    });
    await page.goto("/dashboard");
    // Should NOT redirect back to /auth (stays on dashboard or shows content)
    await page.waitForTimeout(1500);
    const url = page.url();
    expect(url).toContain("/dashboard");
  });
});
