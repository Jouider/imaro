import { test, expect } from '@playwright/test'

/**
 * Smoke test: dev bypass auth + navigation to a sampling of modules.
 * Verifies the spine of the app is alive.
 */

test.describe('Login + navigation', () => {
  test('dev bypass logs in as gestionnaire and lands on dashboard', async ({
    page,
  }) => {
    await page.goto('/login')

    // Click the amber "Gestionnaire" dev bypass button
    await page
      .locator('button')
      .filter({ hasText: 'Gestionnaire' })
      .filter({ has: page.locator('text=Gestionnaire') })
      .last()
      .click()

    await expect(page).toHaveURL(/\/gestionnaire\/dashboard$/)
    await expect(
      page.getByRole('heading', { name: /Tableau de bord/i }),
    ).toBeVisible()
  })

  test('sidebar surfaces all Sprint 4-8 modules', async ({ page }) => {
    await page.goto('/login')
    await page
      .locator('button')
      .filter({ hasText: /^Gestionnaire$/ })
      .last()
      .click()
    await page.waitForURL(/\/gestionnaire\/dashboard$/)

    // Sidebar should show: Assistant IA, Occupants, Recouvrement, Pointage bancaire, Annexes
    await expect(page.getByRole('link', { name: 'Assistant IA' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Occupants' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Recouvrement' })).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Pointage bancaire' }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Annexes comptables' }),
    ).toBeVisible()
  })

  test('dashboard shows the new module overview cards', async ({ page }) => {
    await page.goto('/login')
    await page
      .locator('button')
      .filter({ hasText: /^Gestionnaire$/ })
      .last()
      .click()
    await page.waitForURL(/\/gestionnaire\/dashboard$/)

    // The "Aperçu modules" section + 6 cards
    await expect(page.getByText(/Aperçu modules/i)).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Assistant IA/i }).first(),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Conformité/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Recouvrement/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Annexes comptables/i }),
    ).toBeVisible()
  })

  test('clicking Assistant IA card navigates to /ia', async ({ page }) => {
    await page.goto('/login')
    await page
      .locator('button')
      .filter({ hasText: /^Gestionnaire$/ })
      .last()
      .click()
    await page.waitForURL(/\/gestionnaire\/dashboard$/)

    await page
      .getByRole('button', { name: /Assistant IA/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/gestionnaire\/ia$/)
    await expect(
      page.getByRole('heading', { name: /Assistant IA/i }),
    ).toBeVisible()
  })
})
