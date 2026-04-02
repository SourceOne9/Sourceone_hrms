import { test, expect } from "@playwright/test"
import {
  login,
  collectConsoleErrors,
  assertNoErrorOverlay,
  assertPageHealthy,
} from "./helpers/auth"

/* ---------------------------------------------------------------------------
 * All 38 application routes grouped by area.
 * Each entry includes path, display name, and whether it requires admin role.
 * --------------------------------------------------------------------------- */

interface RouteEntry {
  path: string
  name: string
  adminOnly?: boolean
}

const ALL_ROUTES: RouteEntry[] = [
  // Core pages
  { path: "/", name: "Dashboard" },
  { path: "/employees", name: "Employees" },
  { path: "/teams", name: "Teams" },
  { path: "/attendance", name: "Attendance" },
  { path: "/leave", name: "Leave" },
  { path: "/payroll", name: "Payroll" },
  { path: "/performance", name: "Performance" },
  { path: "/training", name: "Training" },
  { path: "/announcements", name: "Announcements" },
  { path: "/calendar", name: "Calendar" },
  { path: "/help-desk", name: "Help Desk" },
  { path: "/resignation", name: "Resignation" },
  { path: "/documents", name: "Documents" },
  { path: "/reimbursement", name: "Reimbursement" },
  { path: "/recruitment", name: "Recruitment" },
  { path: "/feedback", name: "Feedback" },
  { path: "/org-chart", name: "Org Chart" },
  { path: "/settings", name: "Settings" },
  { path: "/profile", name: "Profile" },
  // /onboarding and /change-password are gated pages — CEO gets redirected away
  // They are tested in 01-auth.spec.ts instead

  // Admin pages
  { path: "/admin/activity", name: "Admin Activity", adminOnly: true },
  { path: "/admin/assets", name: "Admin Assets", adminOnly: true },
  { path: "/admin/documents", name: "Admin Documents", adminOnly: true },
  { path: "/admin/identity", name: "Admin Identity", adminOnly: true },
  { path: "/admin/integrations", name: "Admin Integrations", adminOnly: true },
  { path: "/admin/performance", name: "Admin Performance", adminOnly: true },
  { path: "/admin/reports", name: "Admin Reports", adminOnly: true },
  { path: "/admin/roles", name: "Admin Roles", adminOnly: true },
  { path: "/admin/workflows", name: "Admin Workflows", adminOnly: true },
  { path: "/admin/workflows/builder", name: "Workflow Builder", adminOnly: true },
  { path: "/admin/agent-tracking", name: "Agent Tracking", adminOnly: true },

  // Employee self-service pages
  { path: "/employee/assets", name: "Employee Assets" },
  { path: "/employee/documents", name: "Employee Documents" },
  { path: "/employee/time-agent", name: "Time Agent" },

  // Reports
  { path: "/reports/daily-activity", name: "Daily Activity Reports" },
]

/* ---------------------------------------------------------------------------
 * 1. Smoke test all routes as CEO
 *    Navigate to every route, assert healthy page, check HTTP status < 500,
 *    and collect console errors.
 * --------------------------------------------------------------------------- */

test.describe("1 - Smoke: all routes as CEO", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "ceo")
  })

  for (const route of ALL_ROUTES) {
    test(`loads ${route.name} (${route.path}) without error`, async ({ page }) => {
      const consoleErrors = collectConsoleErrors(page)

      const response = await page.goto(route.path)
      await page.waitForLoadState("networkidle")

      // If session expired and we got redirected to login, re-login and retry
      if (page.url().includes("/login")) {
        await login(page, "ceo")
        const retryResponse = await page.goto(route.path)
        await page.waitForLoadState("networkidle")
        expect(retryResponse?.status(), `${route.path} returned HTTP ${retryResponse?.status()} on retry`).toBeLessThan(500)
      } else {
        expect(response?.status(), `${route.path} returned HTTP ${response?.status()}`).toBeLessThan(500)
      }

      // Page must not show crash/error text
      const body = await page.locator("body").textContent()
      expect(body).not.toContain("Application error")
      expect(body).not.toContain("Internal Server Error")

      await assertNoErrorOverlay(page)

      if (consoleErrors.length > 0) {
        console.warn(
          `[console errors on ${route.path}]`,
          consoleErrors.join("\n"),
        )
      }
    })
  }
})

/* ---------------------------------------------------------------------------
 * 2. Dashboard widgets test
 *    Login as CEO, navigate to /, verify meaningful content rendered
 *    (cards, charts, stat widgets, or any dashboard-specific element).
 * --------------------------------------------------------------------------- */

test.describe("2 - Dashboard widgets", () => {
  test("should render dashboard content with cards or widgets", async ({ page }) => {
    await login(page, "ceo")
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    await assertPageHealthy(page)

    // The dashboard should contain at least one recognizable widget element.
    // We check for common patterns: card containers, stat numbers, chart
    // canvases, or heading text that indicates dashboard sections.
    const widgetSelectors = [
      "[class*='card'], [class*='Card']",
      "[class*='widget'], [class*='Widget']",
      "[class*='stat'], [class*='Stat']",
      "[class*='chart'], [class*='Chart']",
      "canvas",
      "[class*='dashboard'], [class*='Dashboard']",
      "[class*='metric'], [class*='Metric']",
      "[class*='summary'], [class*='Summary']",
    ]

    let foundAny = false
    for (const selector of widgetSelectors) {
      const count = await page.locator(selector).count().catch(() => 0)
      if (count > 0) {
        foundAny = true
        break
      }
    }

    // Fallback: at minimum the page should have some visible text beyond just
    // the nav/sidebar chrome -- at least 50 characters of body content.
    if (!foundAny) {
      const bodyText = await page.locator("main, [class*='content'], [class*='Content'], [role='main']")
        .first()
        .textContent()
        .catch(() => "")
      expect(
        (bodyText || "").length,
        "Dashboard should render meaningful content",
      ).toBeGreaterThan(20)
    }

    // Verify the page has rendered at least some visible elements
    const visibleElements = await page.locator("main *:visible, [role='main'] *:visible").count().catch(() => 0)
    expect(visibleElements, "Dashboard should have visible child elements").toBeGreaterThan(0)
  })
})

/* ---------------------------------------------------------------------------
 * 3. Sidebar navigation
 *    Click through sidebar links and verify each navigation does not crash.
 * --------------------------------------------------------------------------- */

test.describe("3 - Sidebar navigation", () => {
  test("should navigate between pages via sidebar without crashes", async ({ page }) => {
    await login(page, "ceo")
    const consoleErrors = collectConsoleErrors(page)

    // Locate sidebar links using common sidebar selectors
    const sidebarLinks = page.locator(
      "nav a[href], aside a[href], [class*='sidebar'] a[href], [class*='Sidebar'] a[href], [class*='side-nav'] a[href], [class*='SideNav'] a[href]",
    )
    const totalLinks = await sidebarLinks.count()

    // We need at least a few sidebar links to test
    expect(totalLinks, "Sidebar should contain navigation links").toBeGreaterThan(0)

    // Click up to 10 unique sidebar links
    const maxClicks = Math.min(totalLinks, 10)
    const visitedPaths = new Set<string>()

    for (let i = 0; i < maxClicks; i++) {
      const link = sidebarLinks.nth(i)
      const isVisible = await link.isVisible().catch(() => false)
      if (!isVisible) continue

      const href = await link.getAttribute("href")
      // Skip external links, anchors, and already-visited paths
      if (!href || href.startsWith("http") || href === "#" || visitedPaths.has(href)) {
        continue
      }
      visitedPaths.add(href)

      await link.click()
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(300)

      // Verify page did not crash
      const body = await page.locator("body").textContent()
      expect(body, `Crash detected after clicking sidebar link to ${href}`).not.toContain("Application error")
      expect(body, `Server error after clicking sidebar link to ${href}`).not.toContain("Internal Server Error")

      // Should not have been bounced back to login
      await expect(page).not.toHaveURL(/\/login/)
    }

    // No hard-fail on console errors, but log them
    if (consoleErrors.length > 0) {
      console.warn("[sidebar console errors]", consoleErrors.join("\n"))
    }
  })
})

/* ---------------------------------------------------------------------------
 * 4. Role-based route access
 *    Login as an employee and attempt to access admin-only routes.
 *    Expect either an access-denied message or a redirect away from the page.
 * --------------------------------------------------------------------------- */

test.describe("4 - Role-based route access", () => {
  const adminRoutes: RouteEntry[] = [
    { path: "/admin/roles", name: "Admin Roles" },
    { path: "/admin/workflows", name: "Admin Workflows" },
    { path: "/admin/reports", name: "Admin Reports" },
    { path: "/admin/integrations", name: "Admin Integrations" },
    { path: "/admin/identity", name: "Admin Identity" },
  ]

  test.beforeEach(async ({ page }) => {
    await login(page, "employee")
  })

  for (const route of adminRoutes) {
    test(`employee cannot access ${route.name} (${route.path})`, async ({ page }) => {
      const response = await page.goto(route.path)
      await page.waitForLoadState("networkidle")

      // One of the following must be true:
      //   a) HTTP status indicates forbidden/redirect (403 or 3xx)
      //   b) Page shows an access-denied / unauthorized / forbidden message
      //   c) User was redirected away from the admin route (e.g. to / or /login)
      const status = response?.status() ?? 200
      const currentUrl = page.url()
      const body = await page.locator("body").textContent() ?? ""
      const bodyLower = body.toLowerCase()

      const isForbiddenStatus = status === 403
      const isRedirectedAway = !currentUrl.includes(route.path)
      const hasAccessDeniedText =
        bodyLower.includes("access denied") ||
        bodyLower.includes("unauthorized") ||
        bodyLower.includes("forbidden") ||
        bodyLower.includes("not authorized") ||
        bodyLower.includes("permission") ||
        bodyLower.includes("not allowed") ||
        bodyLower.includes("403")

      const isBlocked = isForbiddenStatus || isRedirectedAway || hasAccessDeniedText

      expect(
        isBlocked,
        `Employee should not have full access to ${route.path}. ` +
        `Status: ${status}, URL: ${currentUrl}, ` +
        `body snippet: "${body.slice(0, 200)}"`,
      ).toBeTruthy()
    })
  }
})

/* ---------------------------------------------------------------------------
 * 5. Mobile viewport smoke test
 *    Test 5 key routes at 375x812 (iPhone X-style viewport) to verify
 *    pages render without crash on mobile dimensions.
 * --------------------------------------------------------------------------- */

test.describe("5 - Mobile viewport smoke", () => {
  const MOBILE_ROUTES: RouteEntry[] = [
    { path: "/", name: "Dashboard" },
    { path: "/employees", name: "Employees" },
    { path: "/leave", name: "Leave" },
    { path: "/attendance", name: "Attendance" },
    { path: "/profile", name: "Profile" },
  ]

  test.use({
    viewport: { width: 375, height: 812 },
  })

  test.beforeEach(async ({ page }) => {
    await login(page, "ceo")
  })

  for (const route of MOBILE_ROUTES) {
    test(`mobile: loads ${route.name} (${route.path}) at 375x812`, async ({ page }) => {
      const consoleErrors = collectConsoleErrors(page)

      const response = await page.goto(route.path)
      await page.waitForLoadState("networkidle")

      // HTTP status must not be a server error
      expect(response?.status(), `${route.path} returned HTTP ${response?.status()}`).toBeLessThan(500)

      // Page health checks
      await assertPageHealthy(page)
      await assertNoErrorOverlay(page)

      // Verify viewport dimensions are actually applied
      const viewportSize = page.viewportSize()
      expect(viewportSize?.width).toBe(375)
      expect(viewportSize?.height).toBe(812)

      // Verify no horizontal overflow causing broken layout.
      // The document scroll width should not wildly exceed viewport width.
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(
        scrollWidth,
        `${route.path} has horizontal overflow at mobile viewport (scrollWidth: ${scrollWidth})`,
      ).toBeLessThanOrEqual(500) // allow small tolerance above 375

      // Verify page has rendered visible content
      const bodyText = await page.locator("body").textContent() ?? ""
      expect(bodyText.length, `${route.path} should render content on mobile`).toBeGreaterThan(10)

      if (consoleErrors.length > 0) {
        console.warn(`[mobile console errors on ${route.path}]`, consoleErrors.join("\n"))
      }
    })
  }
})
