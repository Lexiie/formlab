import { test, expect } from '@playwright/test'

test('lost response recovery', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Full name').fill('Bob')
  await page.getByLabel('Email').fill('bob@example.com')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('Project title').fill('Demo')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('Requested amount').fill('100')
  await page.getByLabel('Duration (months)').fill('3')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Simulate lost response (after commit)' }).click()
  await expect(page.getByText('Status: uncertain')).toBeVisible({ timeout: 10000 })
  await page.getByRole('button', { name: 'Retry pending' }).click()
  await expect(page.getByText('submit: confirmed')).toBeVisible({ timeout: 10000 })
})