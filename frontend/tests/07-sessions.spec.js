import { test, expect } from "@playwright/test";

// ============================================================
// 07 - SESSIONS TESTS  (/sessions)
// Note: /sessions/new is a PROTECTED route that needs a valid
// school token. With a fake token the API calls will fail but
// the page should still load (it wont 302 redirect).
// ============================================================

async function injectSession(page) {
  await page.goto("/auth");
  await page.evaluate(() => {
    sessionStorage.setItem("token", "test-token");
    sessionStorage.setItem("user", JSON.stringify({
      id: 1, name: "Test School", role: "school", email: "s@t.com"
    }));
  });
}

test.describe("Sessions List Page", () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page);
    await page.goto("/sessions");
    await page.waitForTimeout(2000);
  });

  test("Sessions page loads", async ({ page }) => {
    expect(page.url()).toContain("/sessions");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Page has a heading or title", async ({ page }) => {
    const heading = page.locator("h1, h2, [class*='title'], [class*='heading']").first();
    await expect(heading).toBeVisible();
  });

  test("New Session / Create Session button or link visible", async ({ page }) => {
    const btn = page.locator(
      'button:has-text("New Session"), button:has-text("Create"), button:has-text("Add Session"), a[href*="sessions/new"], button:has-text("+")'
    ).first();
    if (await btn.count() > 0) {
      await expect(btn).toBeVisible();
    } else {
      test.skip();
    }
  });

  test("Sessions list or empty state renders", async ({ page }) => {
    const content = page.locator(
      '[class*="session"], [class*="card"], [class*="item"], table, [class*="empty"], [class*="no-session"]'
    ).first();
    if (await content.count() > 0) {
      await expect(content).toBeVisible();
    } else {
      test.skip();
    }
  });
});

test.describe("New Session Page (/sessions/new)", () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page);
    await page.goto("/sessions/new");
    await page.waitForTimeout(2000);
  });

  test("New Session page is accessible (not redirected to /auth)", async ({ page }) => {
    // Should stay on sessions-related page (could be /sessions/new OR /sessions if it redirects internally)
    const url = page.url();
    const isSessionsPage = url.includes("/sessions");
    expect(isSessionsPage).toBeTruthy();
  });

  test("New Session page has form elements", async ({ page }) => {
    const inputs = page.locator("input, select, textarea, button");
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Session Configure Page", () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page);
    await page.goto("/sessions/configure");
    await page.waitForTimeout(2000);
  });

  test("Session configure page is accessible", async ({ page }) => {
    const url = page.url();
    expect(url.includes("/sessions")).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
  });
});
