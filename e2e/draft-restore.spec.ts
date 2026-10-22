import { test, expect } from '@playwright/test'

test('draft autosave and restore after refresh', async ({ page, context }) => {
  await page.goto('/')
  await page.getByLabel('Full name').fill('Alice')
  await page.getByLabel('Email').fill('alice@example.com')
  await page.reload()
  await expect(page.getByText('Draft found. Restore?')).toBeVisible()
  await page.getByRole('button', { name: 'Restore' }).click()
  await expect(page.getByLabel('Full name')).toHaveValue('Alice')
  await expect(page.getByLabel('Email')).toHaveValue('alice@example.com')
})