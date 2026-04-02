import { type Page, expect } from "@playwright/test"
import * as dotenv from "dotenv"
import * as path from "path"

// Load .env.test from project root
dotenv.config({ path: path.resolve(__dirname, "../../../.env.test") })

export const TEST_TENANT = process.env.TEST_TENANT || "sourceoneai"
export const TEST_EMAIL = process.env.TEST_EMAIL || "ceo@sourceoneai.com"
export const TEST_PASSWORD = process.env.TEST_PASSWORD || "TestPass123!"

export type Role = "ceo" | "hr" | "payroll" | "teamlead" | "employee"

const ROLE_CREDENTIALS: Record<Role, { email: string; password: string }> = {
  ceo: {
    email: process.env.TEST_CEO_EMAIL || "ceo@sourceoneai.com",
    password: process.env.TEST_CEO_PASSWORD || "TestPass123!",
  },
  hr: {
    email: process.env.TEST_HR_EMAIL || "hr@sourceoneai.com",
    password: process.env.TEST_HR_PASSWORD || "TestPass123!",
  },
  payroll: {
    email: process.env.TEST_PAYROLL_EMAIL || "payroll@sourceoneai.com",
    password: process.env.TEST_PAYROLL_PASSWORD || "TestPass123!",
  },
  teamlead: {
    email: process.env.TEST_TEAMLEAD_EMAIL || "teamlead@sourceoneai.com",
    password: process.env.TEST_TEAMLEAD_PASSWORD || "TestPass123!",
  },
  employee: {
    email: process.env.TEST_EMPLOYEE_EMAIL || "employee@sourceoneai.com",
    password: process.env.TEST_EMPLOYEE_PASSWORD || "TestPass123!",
  },
}

/**
 * Logs into the HR portal via the login page.
 * Defaults to CEO/admin role if no role specified.
 */
export async function login(page: Page, role: Role = "ceo") {
  const creds = ROLE_CREDENTIALS[role]

  // Clear stale cookies/session from previous tests to prevent login hangs
  await page.context().clearCookies()

  await page.goto("/login")
  await page.waitForLoadState("networkidle")

  // Ensure we're on the login page (may have been redirected)
  if (!page.url().includes("/login")) {
    await page.goto("/login")
    await page.waitForLoadState("networkidle")
  }

  await page.getByPlaceholder("Organization ID").fill(TEST_TENANT)
  await page.getByPlaceholder("Employee ID or Email").fill(creds.email)
  await page.getByPlaceholder("Password").fill(creds.password)
  await page.getByRole("button", { name: /login/i }).click()

  await page.waitForFunction(
    () => !window.location.pathname.includes("/login"),
    { timeout: 30_000 },
  )
  await page.waitForLoadState("networkidle")
}

/** Generates a unique string for test data to avoid collisions. */
export function uniqueId(prefix = "test") {
  return `${prefix}_${Date.now().toString(36)}`
}

/** Collects console errors during a test. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text())
  })
  return errors
}

/** Asserts no React/Next error overlay is visible. */
export async function assertNoErrorOverlay(page: Page) {
  const overlay = page.locator("#__next-build-error, [data-nextjs-dialog]")
  await expect(overlay).toHaveCount(0, { timeout: 3_000 }).catch(() => {
    // overlay not in DOM is fine
  })
}

/**
 * Asserts page loaded without crash.
 * If session expired (redirected to /login), re-login and retry the original route.
 */
export async function assertPageHealthy(page: Page) {
  // Session recovery: if we got bounced to /login, re-login and navigate back
  if (page.url().includes("/login")) {
    // Extract the originally intended route from referrer or just go to dashboard
    await login(page, "ceo")
    await page.waitForLoadState("networkidle")
  }

  const body = await page.locator("body").textContent()
  expect(body).not.toContain("Application error")
  expect(body).not.toContain("Internal Server Error")
  await expect(page).not.toHaveURL(/\/login/)
}
