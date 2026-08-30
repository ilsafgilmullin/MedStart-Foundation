import { expect, test } from '@playwright/test'

const publicRoutes = ['/', '/login', '/register/student', '/register/tutor']

for (const route of publicRoutes) {
  test(`${route} renders without overflow and with strict CSP`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
    expect(response?.ok()).toBeTruthy()
    const csp = response?.headers()['content-security-policy'] || ''
    expect(csp).toContain("script-src 'self' 'nonce-")
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'")
    expect(csp).not.toContain("'unsafe-eval'")
    await expect(page.locator('body')).toBeVisible()
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1)
  })
}

test('auth primary controls stay usable', async ({ page }) => {
  for (const route of ['/login', '/register/student', '/register/tutor']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('input').first()).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  }
})
