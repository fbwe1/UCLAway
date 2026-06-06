// Test 1: User A logs in → creates a ride → searches for User B → follows User B
import { test, expect } from '@playwright/test';

const TEST_USER_A = {
  email:    'e2e.usera@ucla.edu',
  username: 'e2e_userA',
  password: 'E2eTestA1!',
};

const TEST_USER_B = {
  email:    'e2e.userb@ucla.edu',
  username: 'e2e_userB',
  password: 'E2eTestB1!',
};

const RIDE_TITLE = 'E2E Test Ride to LAX';

async function login(page, user) {
  await page.goto('/');
  await page.getByPlaceholder('UCLA email').fill(user.email);
  await page.getByPlaceholder('Password').fill(user.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: 'Ride Feed' })).toBeVisible({ timeout: 5000 });
}


async function searchUser(page, username) {
  await page.getByPlaceholder('Search users').fill(username);
  await expect(page.getByText(username)).toBeVisible({ timeout: 5000 });
}

test.describe('User A: login, create ride, search and follow User B', () => {

  test('User A can log in', async ({ page }) => {
    await login(page, TEST_USER_A);
    await expect(page.getByRole('heading', { name: 'Ride Feed' })).toBeVisible();
  });

  test('User A can create a ride', async ({ page }) => {
    await login(page, TEST_USER_A);

    await page.getByRole('link', { name: 'Create' }).click();
    await expect(page.getByRole('heading', { name: 'Create a Ride' })).toBeVisible();

    await page.getByPlaceholder('e.g. Ride to LAX Friday').fill(RIDE_TITLE);
    await page.getByPlaceholder('e.g. Leaving at 5PM, happy to stop along the way').fill('Playwright test ride');
    await page.getByPlaceholder('e.g. UCLA Dorms').fill('UCLA Dorms');
    await page.getByPlaceholder('e.g. LAX').fill('LAX');
    await page.getByPlaceholder('e.g. 4').fill('4');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pad = n => String(n).padStart(2, '0');
    const localISO = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T10:00`;
    await page.locator('.form-group').filter({ hasText: 'Departure Time' })
      .locator('input[type="datetime-local"]')
      .fill(localISO);

    await page.getByRole('button', { name: 'Create Ride' }).click();

    await expect(page.getByRole('heading', { name: 'Ride Feed' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('article').filter({ hasText: RIDE_TITLE })).toBeVisible({ timeout: 8000 });
  });

  test('User A can search for User B and follow them', async ({ page }) => {
    await login(page, TEST_USER_A);

    await page.getByRole('link', { name: 'Search' }).click();
    await expect(page.getByRole('heading', { name: 'Search Users' })).toBeVisible();

    await searchUser(page, TEST_USER_B.username);

    const userCard = page.getByRole('article').filter({ hasText: TEST_USER_B.username });
    await userCard.getByRole('button', { name: 'Follow' }).click();
    await expect(userCard.getByRole('button', { name: 'Unfollow' })).toBeVisible({ timeout: 5000 });
  });

  test('User A can visit User B public profile and see follower count', async ({ page }) => {
    await login(page, TEST_USER_A);

    await page.getByRole('link', { name: 'Search' }).click();
    await searchUser(page, TEST_USER_B.username);

    const userCard = page.getByRole('article').filter({ hasText: TEST_USER_B.username });
    await userCard.locator('.user-card-info').click();

    await expect(page.getByRole('heading', { name: TEST_USER_B.username })).toBeVisible({ timeout: 5000 });

    await expect(page.getByRole('button', { name: /^(follow|unfollow)$/i })).toBeVisible();
    await expect(page.getByText('Followers')).toBeVisible();
  });

});