import { test, expect } from '@playwright/test'

/**
 * Critical flow: pointage bancaire — load demo dataset and verify auto-matching.
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

test('Pointage bancaire — demo data auto-matches majority of lines', async ({
  page,
}) => {
  await loginAsGestionnaire(page)
  await page.goto('/gestionnaire/pointage')

  await expect(
    page.getByRole('heading', { name: /Pointage bancaire/i }),
  ).toBeVisible()

  // Load the demo dataset
  await page.getByRole('button', { name: /^Démo$/ }).click()

  // Wait for the KPIs to render
  await expect(page.getByText(/Auto-matchées/i)).toBeVisible()
  await expect(page.getByText(/10 lignes/i)).toBeVisible()

  // Filter chips visible
  await expect(
    page.getByRole('button', { name: /Toutes \(10\)/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /Auto-matchées \(\d+\)/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /Non rapprochées \(\d+\)/ }),
  ).toBeVisible()

  // At least 5 of 10 should be auto-matched (algorithm is deterministic on mock)
  const autoButton = page.getByRole('button', { name: /Auto-matchées \(\d+\)/ })
  const text = await autoButton.textContent()
  const count = Number(text?.match(/\((\d+)\)/)?.[1] ?? '0')
  expect(count).toBeGreaterThanOrEqual(5)
})

test('Pointage — supported banks chip cloud visible on empty state', async ({
  page,
}) => {
  await loginAsGestionnaire(page)
  await page.goto('/gestionnaire/pointage')

  await expect(page.getByText(/Banques supportées/i)).toBeVisible()
  // 10 Moroccan banks
  await expect(page.getByText('Attijariwafa Bank')).toBeVisible()
  await expect(page.getByText('Banque Populaire')).toBeVisible()
  await expect(page.getByText('CIH Bank')).toBeVisible()
})
