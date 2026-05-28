import { test, expect } from '@playwright/test'

/**
 * Critical flow: lance l'audit IA et vérifie le rendu du rapport.
 */

async function loginAsGestionnaire(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page
    .locator('button')
    .filter({ hasText: /^Gestionnaire$/ })
    .last()
    .click()
  await page.waitForURL(/\/gestionnaire\/dashboard$/)
}

test('IA audit — produces a scored compliance report', async ({ page }) => {
  await loginAsGestionnaire(page)
  await page.goto('/gestionnaire/ia')

  await expect(
    page.getByRole('heading', { name: /Assistant IA/i }),
  ).toBeVisible()

  // The "Audit conformité" tool card should be active by default
  await page.getByRole('button', { name: /Lancer l['']audit IA/i }).click()

  // Wait for the score to appear (mock simulates ~100ms)
  await expect(page.getByText(/Rapport d['']audit/i)).toBeVisible({
    timeout: 10_000,
  })

  // Score is 0-100 — verify a numeric value is rendered in the score ring
  await expect(page.locator('text=/^\\d{1,3}$/').first()).toBeVisible()

  // Severity badges should be present
  await expect(page.getByText(/Critique · \d+/)).toBeVisible()
  await expect(page.getByText(/Points forts détectés/i)).toBeVisible()
})

test('IA — switch between tools (audit, invoice, budget)', async ({ page }) => {
  await loginAsGestionnaire(page)
  await page.goto('/gestionnaire/ia')

  // Click invoice tool card
  await page.getByRole('button', { name: /Extraction facture/i }).click()
  await expect(
    page.getByRole('heading', { name: /Extraction de facture/i }),
  ).toBeVisible()

  // Click budget tool card
  await page.getByRole('button', { name: /Suggestions budget/i }).click()
  await expect(
    page.getByRole('heading', { name: /Suggestions de budget/i }),
  ).toBeVisible()

  // Back to audit
  await page.getByRole('button', { name: /Audit conformité/i }).click()
  await expect(
    page.getByRole('heading', { name: /Audit conformité IA/i }),
  ).toBeVisible()
})
