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

async function clickRideCard(page) {
  await expect(
    page.getByRole('article').filter({ hasText: RIDE_TITLE }).first()
  ).toBeVisible({ timeout: 8000 });
  await page.getByRole('article').filter({ hasText: RIDE_TITLE }).first().click();
  await expect(page.getByRole('heading', { name: RIDE_TITLE })).toBeVisible({ timeout: 5000 });
}

test.describe('User B: join, follow, message, get removed', () => {

  test('User B can log in', async ({ page }) => {
    await login(page, TEST_USER_B);
    await expect(page.getByText(`👤 ${TEST_USER_B.username}`)).toBeVisible();
  });

  test('User B can join the ride created by User A', async ({ page }) => {
    await login(page, TEST_USER_B);
    await clickRideCard(page);

    await expect(page.getByRole('button', { name: 'Join Ride' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Join Ride' }).click();
    await expect(page.getByRole('button', { name: 'Leave Ride' })).toBeVisible({ timeout: 5000 });
  });

  test('User B can search for User A and follow them', async ({ page }) => {
    await login(page, TEST_USER_B);

    await page.goto('/users');
    await expect(page.getByRole('heading', { name: 'Find Users' })).toBeVisible();

    await page.getByPlaceholder('Search by username...').fill(TEST_USER_A.username);
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page.getByText(TEST_USER_A.username)).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Follow' }).click();
    await expect(page.getByRole('button', { name: 'Unfollow' })).toBeVisible({ timeout: 5000 });
  });

  test('User B can message User A (the driver) from the ride detail page', async ({ page }) => {
    await login(page, TEST_USER_B);
    await clickRideCard(page);

    await page.getByText('Driver').locator('../..').getByRole('button', { name: 'Message' }).click();
    await expect(page).toHaveURL(/\/messages\/\d+/, { timeout: 5000 });

    await page.getByRole('textbox').fill('Random Message?');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText('Random Message?')).toBeVisible({ timeout: 5000 });
  });

  test('User A can see the message and reply', async ({ page }) => {
    await login(page, TEST_USER_A);

    await page.getByRole('link', { name: 'Messages' }).click();
    await expect(page).toHaveURL(/\/messages/);

    await page.getByText(`👤 ${TEST_USER_B.username}`).click();
    await expect(page).toHaveURL(/\/messages\/\d+/);

    await expect(page.getByText('Random Message?')).toBeVisible({ timeout: 5000 });

    await page.getByRole('textbox').fill('Random Response');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText('Random Response')).toBeVisible({ timeout: 5000 });
  });

  test('User B can see the reply from User A', async ({ page }) => {
    await login(page, TEST_USER_B);

    await page.getByRole('link', { name: 'Messages' }).click();
    await page.getByText(`👤 ${TEST_USER_A.username}`).click();

    await expect(page.getByText('Random Response').first()).toBeVisible({ timeout: 5000 });
  });

  test('User A can remove User B from the ride', async ({ page }) => {
    await login(page, TEST_USER_A);
    await clickRideCard(page);

    const passengerRow = page.getByText(TEST_USER_B.username).locator('..');
    await expect(passengerRow.getByRole('button', { name: 'Remove' })).toBeVisible();

    page.once('dialog', dialog => dialog.accept());
    await passengerRow.getByRole('button', { name: 'Remove' }).click();

    await expect(page.getByText(TEST_USER_B.username)).not.toBeVisible({ timeout: 5000 });
  });

  test('User B sees removed message and cannot rejoin', async ({ page }) => {
    await login(page, TEST_USER_B);
    await clickRideCard(page);

    await expect(page.getByText('You have been removed from this ride')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Join Ride' })).not.toBeVisible();
  });

});