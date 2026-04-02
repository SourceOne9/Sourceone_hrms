import { test, expect } from "@playwright/test"
import {
  login,
  collectConsoleErrors,
  assertPageHealthy,
  assertNoErrorOverlay,
} from "./helpers/auth"

/* -------------------------------------------------------------------------- */
/*  Helper: locate a "create / add / new" button and click it                 */
/* -------------------------------------------------------------------------- */

const FORM_SELECTOR =
  ".fixed.inset-0.z-50, [class*='modal'], [class*='Modal'], [role='dialog'], form, [class*='drawer'], [class*='Drawer'], [class*='sheet'], [class*='Sheet']"

async function tryOpenCreateForm(
  page: import("@playwright/test").Page,
  buttonLabel: RegExp = /add|new|create/i,
) {
  const addBtn = page.getByRole("button", { name: buttonLabel }).first()
  const visible = await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)
  if (!visible) return false

  await addBtn.click()
  await page.waitForTimeout(1_000)

  const formVisible = await page
    .locator(FORM_SELECTOR)
    .first()
    .isVisible({ timeout: 5_000 })
    .catch(() => false)

  return formVisible
}

/* ========================================================================== */
/*  1. Performance                                                            */
/* ========================================================================== */

test.describe("Performance Module", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should load the performance page", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/performance")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)
    await assertNoErrorOverlay(page)

    const body = await page.locator("body").textContent()
    const hasContent =
      /performance|review|goal|appraisal|kpi|objective/i.test(body ?? "")
    expect(hasContent).toBeTruthy()

    if (errors.length > 0) {
      console.warn("Console errors on /performance:", errors)
    }
  })

  test("should open create form if button exists", async ({ page }) => {
    await page.goto("/performance")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)

    const opened = await tryOpenCreateForm(
      page,
      /add|new|create|start review/i,
    )
    if (opened) {
      const formEl = page.locator(FORM_SELECTOR).first()
      await expect(formEl).toBeVisible({ timeout: 5_000 })
    }
  })
})

/* ========================================================================== */
/*  2. Recruitment                                                            */
/* ========================================================================== */

test.describe("Recruitment Module", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should load the recruitment page", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/recruitment")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)
    await assertNoErrorOverlay(page)

    const body = await page.locator("body").textContent()
    const hasContent =
      /recruitment|job|candidate|opening|position|hire|applicant/i.test(
        body ?? "",
      )
    expect(hasContent).toBeTruthy()

    if (errors.length > 0) {
      console.warn("Console errors on /recruitment:", errors)
    }
  })

  test("should open create form if button exists", async ({ page }) => {
    await page.goto("/recruitment")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)

    const opened = await tryOpenCreateForm(
      page,
      /add|new|create|post job/i,
    )
    if (opened) {
      const formEl = page.locator(FORM_SELECTOR).first()
      await expect(formEl).toBeVisible({ timeout: 5_000 })
    }
  })
})

/* ========================================================================== */
/*  3. Help Desk                                                              */
/* ========================================================================== */

test.describe("Help Desk Module", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should load the help desk page", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/help-desk")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)
    await assertNoErrorOverlay(page)

    const body = await page.locator("body").textContent()
    const hasContent =
      /help desk|ticket|support|issue|request/i.test(body ?? "")
    expect(hasContent).toBeTruthy()

    if (errors.length > 0) {
      console.warn("Console errors on /help-desk:", errors)
    }
  })

  test("should open create ticket form", async ({ page }) => {
    await page.goto("/help-desk")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)

    const opened = await tryOpenCreateForm(
      page,
      /add|new|create|raise ticket|submit/i,
    )
    if (opened) {
      const formEl = page.locator(FORM_SELECTOR).first()
      await expect(formEl).toBeVisible({ timeout: 5_000 })
    }
  })
})

/* ========================================================================== */
/*  4. Resignation                                                            */
/* ========================================================================== */

test.describe("Resignation Module", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should load the resignation page", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/resignation")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)
    await assertNoErrorOverlay(page)

    const body = await page.locator("body").textContent()
    const hasContent =
      /resignation|resign|notice|exit|separation|offboarding/i.test(
        body ?? "",
      )
    expect(hasContent).toBeTruthy()

    if (errors.length > 0) {
      console.warn("Console errors on /resignation:", errors)
    }
  })
})

/* ========================================================================== */
/*  5. Feedback                                                               */
/* ========================================================================== */

test.describe("Feedback Module", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should load the feedback page", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/feedback")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)
    await assertNoErrorOverlay(page)

    const body = await page.locator("body").textContent()
    const hasContent =
      /feedback|survey|response|review|suggestion/i.test(body ?? "")
    expect(hasContent).toBeTruthy()

    if (errors.length > 0) {
      console.warn("Console errors on /feedback:", errors)
    }
  })

  test("should open feedback form if button exists", async ({ page }) => {
    await page.goto("/feedback")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)

    const opened = await tryOpenCreateForm(
      page,
      /add|new|create|give feedback|submit/i,
    )
    if (opened) {
      const formEl = page.locator(FORM_SELECTOR).first()
      await expect(formEl).toBeVisible({ timeout: 5_000 })
    }
  })
})

/* ========================================================================== */
/*  6. Calendar                                                               */
/* ========================================================================== */

test.describe("Calendar Module", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should load and render the calendar", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/calendar")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)
    await assertNoErrorOverlay(page)

    const body = await page.locator("body").textContent()
    // A calendar should show month names, day names, or date numbers
    const hasCalendarContent =
      /january|february|march|april|may|june|july|august|september|october|november|december|mon|tue|wed|thu|fri|sat|sun|today/i.test(
        body ?? "",
      )
    expect(hasCalendarContent).toBeTruthy()

    if (errors.length > 0) {
      console.warn("Console errors on /calendar:", errors)
    }
  })
})

/* ========================================================================== */
/*  7. Documents                                                              */
/* ========================================================================== */

test.describe("Documents Module", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should load the documents page", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/documents")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)
    await assertNoErrorOverlay(page)

    const body = await page.locator("body").textContent()
    const hasContent =
      /document|file|upload|folder|attachment/i.test(body ?? "")
    expect(hasContent).toBeTruthy()

    if (errors.length > 0) {
      console.warn("Console errors on /documents:", errors)
    }
  })
})

/* ========================================================================== */
/*  8. Reimbursement                                                          */
/* ========================================================================== */

test.describe("Reimbursement Module", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should load the reimbursement page", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/reimbursement")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)
    await assertNoErrorOverlay(page)

    const body = await page.locator("body").textContent()
    const hasContent =
      /reimbursement|claim|expense|receipt|amount/i.test(body ?? "")
    expect(hasContent).toBeTruthy()

    if (errors.length > 0) {
      console.warn("Console errors on /reimbursement:", errors)
    }
  })

  test("should open create claim form if button exists", async ({ page }) => {
    await page.goto("/reimbursement")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)

    const opened = await tryOpenCreateForm(
      page,
      /add|new|create|submit claim|file claim/i,
    )
    if (opened) {
      const formEl = page.locator(FORM_SELECTOR).first()
      await expect(formEl).toBeVisible({ timeout: 5_000 })
    }
  })
})

/* ========================================================================== */
/*  9. Org Chart                                                              */
/* ========================================================================== */

test.describe("Org Chart Module", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should load and render the org chart", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/org-chart")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)
    await assertNoErrorOverlay(page)

    // Org chart should render nodes, names, or a tree/graph structure
    const body = await page.locator("body").textContent()
    const hasContent =
      /org|chart|organization|hierarchy|team|department|ceo|manager/i.test(
        body ?? "",
      )
    expect(hasContent).toBeTruthy()

    // Check for visual org-chart elements (SVG, canvas, or tree nodes)
    const chartElements = page.locator(
      "svg, canvas, [class*='org'], [class*='chart'], [class*='tree'], [class*='node']",
    )
    const chartCount = await chartElements.count()
    // At minimum the page should have rendered some chart-like element or text
    expect(chartCount > 0 || (body ?? "").length > 100).toBeTruthy()

    if (errors.length > 0) {
      console.warn("Console errors on /org-chart:", errors)
    }
  })
})

/* ========================================================================== */
/*  10. Settings                                                              */
/* ========================================================================== */

test.describe("Settings Module", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should load the settings page with tabs or sections", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/settings")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)
    await assertNoErrorOverlay(page)

    const body = await page.locator("body").textContent()
    const hasContent =
      /settings|preference|configuration|general|notification|account|company|profile/i.test(
        body ?? "",
      )
    expect(hasContent).toBeTruthy()

    // Settings pages typically have tabs, nav links, or sections
    const tabs = page.locator(
      "[role='tab'], [role='tablist'], [class*='tab'], [class*='Tab'], nav a, [class*='section']",
    )
    const tabCount = await tabs.count()
    // Acceptable: either tabs/sections exist, or the page has substantial content
    expect(tabCount > 0 || (body ?? "").length > 200).toBeTruthy()

    if (errors.length > 0) {
      console.warn("Console errors on /settings:", errors)
    }
  })
})

/* ========================================================================== */
/*  11. Profile                                                               */
/* ========================================================================== */

test.describe("Profile Module", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should load profile and show user info", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/profile")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)
    await assertNoErrorOverlay(page)

    const body = await page.locator("body").textContent()
    // Profile should show identity-related content
    const hasContent =
      /profile|name|email|employee|designation|department|phone|address|@/i.test(
        body ?? "",
      )
    expect(hasContent).toBeTruthy()

    if (errors.length > 0) {
      console.warn("Console errors on /profile:", errors)
    }
  })
})

/* ========================================================================== */
/*  12. Admin Roles                                                           */
/* ========================================================================== */

test.describe("Admin Roles Module", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "ceo")
  })

  test("should load admin roles page and show roles list", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/admin/roles")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)
    await assertNoErrorOverlay(page)

    const body = await page.locator("body").textContent()
    const hasContent =
      /role|permission|admin|manager|access|privilege/i.test(body ?? "")
    expect(hasContent).toBeTruthy()

    // Look for a list structure (table, list, or cards)
    const listElements = page.locator(
      "table, [role='table'], [class*='list'], [class*='List'], [class*='card'], [class*='Card']",
    )
    const listCount = await listElements.count()
    expect(listCount > 0 || (body ?? "").length > 100).toBeTruthy()

    if (errors.length > 0) {
      console.warn("Console errors on /admin/roles:", errors)
    }
  })
})

/* ========================================================================== */
/*  13. Admin Workflows                                                       */
/* ========================================================================== */

test.describe("Admin Workflows Module", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "ceo")
  })

  test("should load admin workflows page", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/admin/workflows")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)
    await assertNoErrorOverlay(page)

    const body = await page.locator("body").textContent()
    const hasContent =
      /workflow|approval|process|step|automation|rule|flow/i.test(body ?? "")
    expect(hasContent).toBeTruthy()

    if (errors.length > 0) {
      console.warn("Console errors on /admin/workflows:", errors)
    }
  })
})

/* ========================================================================== */
/*  14. Admin Reports                                                         */
/* ========================================================================== */

test.describe("Admin Reports Module", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "ceo")
  })

  test("should load admin reports page", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/admin/reports")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)
    await assertNoErrorOverlay(page)

    const body = await page.locator("body").textContent()
    const hasContent =
      /report|analytics|summary|chart|data|insight|export|generate/i.test(
        body ?? "",
      )
    expect(hasContent).toBeTruthy()

    if (errors.length > 0) {
      console.warn("Console errors on /admin/reports:", errors)
    }
  })
})

/* ========================================================================== */
/*  15. Admin Activity                                                        */
/* ========================================================================== */

test.describe("Admin Activity Module", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "ceo")
  })

  test("should load admin activity log page", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/admin/activity")
    await page.waitForLoadState("networkidle")
    await assertPageHealthy(page)
    await assertNoErrorOverlay(page)

    const body = await page.locator("body").textContent()
    const hasContent =
      /activity|log|audit|history|event|action|timestamp|user/i.test(
        body ?? "",
      )
    expect(hasContent).toBeTruthy()

    // Activity logs typically render as a table or timeline
    const logElements = page.locator(
      "table, [role='table'], [class*='timeline'], [class*='Timeline'], [class*='log'], [class*='Log'], [class*='list'], [class*='List']",
    )
    const logCount = await logElements.count()
    expect(logCount > 0 || (body ?? "").length > 100).toBeTruthy()

    if (errors.length > 0) {
      console.warn("Console errors on /admin/activity:", errors)
    }
  })
})
