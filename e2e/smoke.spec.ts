import { test, expect } from '@playwright/test';

test('formlab loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('FormLab')).toBeVisible();
  await expect(page.getByText('Applicant')).toBeVisible();
});
