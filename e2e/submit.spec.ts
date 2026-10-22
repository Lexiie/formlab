import { test, expect } from '@playwright/test'

test('normal submission succeeds', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Full name').fill('Carol')
  await page.getByLabel('Email').fill('carol@example.com')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('Project title').fill('Demo')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('Requested amount').fill('50')
  await page.getByLabel('Duration (months)').fill('2')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('submit: confirmed')).toBeVisible({ timeout: 10000 })
})