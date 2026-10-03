import { test, expect } from "@playwright/test";

// ============================================================
// 03 - SCHOOL REGISTRATION TESTS  (/register)
// Note: SchoolRegistration is a CONTACT/ENQUIRY form (no password field).
// Fields: schoolName, country, city, ownerName, email, phone, website
// ============================================================

test.describe("School Registration Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
    await page.waitForTimeout(1000);
  });

  test("Registration page loads", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
    const form = page.locator("form, input").first();
    await expect(form).toBeVisible();
  });

  test("School name field is visible", async ({ page }) => {
    const nameInput = page.locator(
      'input[name="schoolName"], input[name="school_name"], input[placeholder*="school" i], input[placeholder*="name" i]'
    ).first();
    await expect(nameInput).toBeVisible();
  });

  test("Email field is visible", async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible();
  });

  test("Owner / Contact name field is visible", async ({ page }) => {
    const ownerInput = page.locator(
      'input[name="ownerName"], input[name="owner_name"], input[placeholder*="owner" i], input[placeholder*="contact" i], input[placeholder*="your name" i]'
    ).first();
    await expect(ownerInput).toBeVisible();
  });

  test("Submit / Register button is visible", async ({ page }) => {
    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("Register"), button:has-text("Submit"), button:has-text("Apply"), button:has-text("Request")'
    ).first();
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });

  test("Can type into email field", async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.fill("testschool@example.com");
    await expect(emailInput).toHaveValue("testschool@example.com");
  });

  test("Can type into school name field", async ({ page }) => {
    const nameInput = page.locator(
      'input[name="schoolName"], input[placeholder*="school" i], input[placeholder*="name" i]'
    ).first();
    await nameInput.fill("Test Surf School");
    await expect(nameInput).toHaveValue("Test Surf School");
  });

  test("Page shows success or error after submit", async ({ page }) => {
    // Fill all required fields and submit
    const inputs = page.locator("input");
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const type = await input.getAttribute("type");
      if (type === "email") {
        await input.fill("testschool@example.com");
      } else if (type !== "submit" && type !== "hidden") {
        await input.fill("Test Value");
      }
    }
    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("Register"), button:has-text("Submit")'
    ).first();
    await submitBtn.click();
    await page.waitForTimeout(3000);
    // Either success state or error message — both are valid responses
    const bodyText = await page.locator('body').textContent();
    const hasCssClass = (
      await page.locator('[class*="success"]').count() > 0 ||
      await page.locator('[class*="error"]').count() > 0
    );
    const hasKeyword = /thank|success|error|failed|registered|sent/i.test(bodyText);
    expect(hasCssClass || hasKeyword).toBeTruthy();
  });
});
