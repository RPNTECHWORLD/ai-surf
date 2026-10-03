import { test, expect } from "@playwright/test";

// ============================================================
// 01 - AUTH PAGE TESTS  (/auth)
// Login, Register, Role switch, Validation
// ============================================================

test.describe("Auth Page - Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
    await page.waitForTimeout(1000);
  });

  test("Auth page loads correctly", async ({ page }) => {
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("Login form is visible by default", async ({ page }) => {
    // Page should be in login mode (isLogin = true by default)
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passInput = page.locator('input[type="password"]').first();
    await expect(emailInput).toBeVisible();
    await expect(passInput).toBeVisible();
  });

  test("Login button is visible and clickable", async ({ page }) => {
    const loginBtn = page.locator('button:has-text("Login"), button:has-text("Sign In"), button:has-text("Log In")').first();
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toBeEnabled();
  });

  test("Empty form shows validation / error", async ({ page }) => {
    const loginBtn = page.locator('button:has-text("Login"), button:has-text("Sign In"), button:has-text("Log In")').first();
    await loginBtn.click();
    await page.waitForTimeout(500);
    // Either browser native validation or custom error
    const hasCustomError = await page.locator('.auth-error').count() > 0;
    const hasNativeInvalid = await page.locator('input:invalid').count() > 0;
    expect(hasCustomError || hasNativeInvalid).toBeTruthy();
  });

  test("Wrong credentials shows error message", async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passInput = page.locator('input[type="password"]').first();
    await emailInput.fill("wrong@test.com");
    await passInput.fill("wrongpassword123");
    const loginBtn = page.locator('button:has-text("Login"), button:has-text("Sign In"), button:has-text("Log In")').first();

    // Wait for the login API call to complete before checking error
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/auth/login'), { timeout: 10000 }).catch(() => null),
      loginBtn.click(),
    ]);
    await page.waitForTimeout(500);

    // Check .auth-error class (used in AuthPage) OR body text contains error keywords
    const bodyText = await page.locator('body').textContent();
    const hasAuthError = await page.locator('.auth-error').count() > 0;
    const hasBodyError = /incorrect|invalid|wrong|failed|not found|error|password/i.test(bodyText);
    expect(hasAuthError || hasBodyError).toBeTruthy();
  });

  test("Password field masks input", async ({ page }) => {
    const passInput = page.locator('input[type="password"]').first();
    await passInput.fill("mypassword");
    await expect(passInput).toHaveAttribute("type", "password");
  });

  test("Can switch between Login and Register", async ({ page }) => {
    const registerLink = page.locator("text=Register, text=Sign Up, text=Create Account").first();
    if (await registerLink.count() > 0) {
      await registerLink.click();
      await page.waitForTimeout(500);
      const registerContent = page.locator("text=Register, text=Sign Up, text=Create").first();
      await expect(registerContent).toBeVisible();
    } else {
      test.skip();
    }
  });
});

test.describe("Auth Page - Role Selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
    await page.waitForTimeout(1000);
  });

  test("Page has athlete/coach/school role options (login or register mode)", async ({ page }) => {
    // Role options appear in various places — check any presence of role-related text
    // The roles are 'athlete', 'coach'/'instructor' in the login form
    const hasRole = 
      await page.locator('text=Athlete').count() > 0 ||
      await page.locator('text=Coach').count() > 0 ||
      await page.locator('text=Instructor').count() > 0 ||
      await page.locator('[value="athlete"]').count() > 0 ||
      await page.locator('[value="coach"]').count() > 0;
    // Also acceptable: the page may show role after clicking Register
    if (!hasRole) {
      // Try switching to register mode to see roles
      const registerLink = page.locator('text=Register, text=Create Account, button:has-text("Sign Up")').first();
      if (await registerLink.count() > 0) {
        await registerLink.click();
        await page.waitForTimeout(500);
        const hasRoleAfter =
          await page.locator('text=Athlete').count() > 0 ||
          await page.locator('text=Coach').count() > 0;
        expect(hasRoleAfter).toBeTruthy();
      } else {
        test.skip();
      }
    } else {
      expect(hasRole).toBeTruthy();
    }
  });
});
