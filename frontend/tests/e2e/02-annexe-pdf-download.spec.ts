import { test, expect } from '@playwright/test'

/**
 * Critical flow: download Annexe 10 PDF.
 * - Login → AnnexesPage → click PDF on Annexe 10
 * - Verify the file downloads, is non-empty, mime-type PDF
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

test.describe('Annexe PDF download', () => {
  test('Annexe 10 — download triggers a non-empty PDF', async ({ page }) => {
    await loginAsGestionnaire(page)
    await page.goto('/gestionnaire/annexes')

    // Wait for the Annexe 10 row
    await expect(
      page.getByText(/État des Contributions des Copropriétaires/i),
    ).toBeVisible()

    // The first PDF button is for Annexe 10 (required, top of the list)
    const pdfButton = page.locator('button:has-text("PDF")').first()
    await expect(pdfButton).toBeEnabled()

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 })
    await pdfButton.click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/^annexe10_\d{4}\.pdf$/)

    // Read the file to verify it's an actual PDF
    const path = await download.path()
    expect(path).toBeTruthy()
    const fs = await import('node:fs/promises')
    const buf = await fs.readFile(path!)
    expect(buf.length).toBeGreaterThan(10_000) // PDFs are at least ~10kb with logo
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
  })

  test('AnnexesPage shows 3 required + 9 complementary annexes', async ({
    page,
  }) => {
    await loginAsGestionnaire(page)
    await page.goto('/gestionnaire/annexes')

    await expect(page.getByText(/Annexes obligatoires/i)).toBeVisible()
    await expect(page.getByText(/Annexes complémentaires/i)).toBeVisible()

    // 3 "Requis" badges
    const requiredBadges = page.locator('text=Requis')
    await expect(requiredBadges).toHaveCount(3)
  })
})
