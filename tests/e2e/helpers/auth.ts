import { type Page, expect } from "@playwright/test"

export const TEST_TENANT = process.env.TEST_TENANT || ""
export const TEST_EMAIL = process.env.TEST_EMAIL || ""
export const TEST_PASSWORD = process.env.TEST_PASSWORD || ""

/**
 * Logs into the HR portal via the login page.
 * Waits until the login page is no longer shown.
 */
export async function login(page: Page) {
  await page.goto("/login")
  await page.waitForLoadState("networkidle")

  // Fill tenant slug
  await page.getByPlaceholder("Organization ID").fill(TEST_TENANT)
  // Fill email
  await page.getByPlaceholder("Employee ID or Email").fill(TEST_EMAIL)
  // Fill password
  await page.getByPlaceholder("Password").fill(TEST_PASSWORD)

  // Submit
  await page.getByRole("button", { name: /login/i }).click()

  // Wait for navigation away from login (dashboard or any authenticated page)
  await page.waitForFunction(
    () => !window.location.pathname.includes("/login"),
    { timeout: 20_000 }
  )
  await page.waitForLoadState("networkidle")
}

/**
 * Generates a unique string for test data to avoid collisions.
 */
export function uniqueId(prefix = "test") {
  return `${prefix}_${Date.now().toString(36)}`
}
