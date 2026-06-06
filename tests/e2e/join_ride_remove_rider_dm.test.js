// Test 2: User B joins ride → follows User A → messages User A →
//         User A replies → User B sees reply → User A removes User B → User B sees removed state
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
  await expect(page.getByRole('article').filter({ hasText: RIDE_TITLE })).toBeVisible({ timeout: 8000 });
  await page.getByRole('article').filter({ hasText: RIDE_TITLE }).click();
  await expect(page.getByRole('heading', { name: RIDE_TITLE })).toBeVisible({ timeout: 5000 });
}

async function searchUser(page, username) {
  await page.getByPlaceholder('Search users').fill(username);
  await expect(page.getByText(username)).toBeVisible({ timeout: 5000 });
}

test.describe('User B: join, follow, message, get removed', () => {

  test('User B can log in', async ({ page }) => {
    await login(page, TEST_USER_B);
    await expect(page.getByRole('heading', { name: 'Ride Feed' })).toBeVisible();
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

    await page.getByRole('link', { name: 'Search' }).click();
    await expect(page.getByRole('heading', { name: 'Search Users' })).toBeVisible();

    await searchUser(page, TEST_USER_A.username);

    const userCard = page.getByRole('article').filter({ hasText: TEST_USER_A.username });
    await userCard.getByRole('button', { name: 'Follow' }).click();
    await expect(userCard.getByRole('button', { name: 'Unfollow' })).toBeVisible({ timeout: 5000 });
  });

  test('User B can message User A (the driver) from the ride detail page', async ({ page }) => {
    await login(page, TEST_USER_B);
    await clickRideCard(page);

    // RideDetail.jsx — walk up two levels from "Driver" badge to row div
    await page.getByText('Driver').locator('../..').getByRole('button', { name: 'Message' }).click();

    await expect(page).toHaveURL(/\/messages\/\d+/, { timeout: 5000 });

    // Conversation.jsx — placeholder changed to "Type a message..."
    await page.getByPlaceholder('Type a message...').fill('Random Message');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText('Random Message')).toBeVisible({ timeout: 5000 });
  });

  test('User A can see the message and reply', async ({ page }) => {
    await login(page, TEST_USER_A);

    await page.getByRole('link', { name: 'Messages' }).click();
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();

    await page.getByRole('article').filter({ hasText: TEST_USER_B.username }).click();
    await expect(page).toHaveURL(/\/messages\/\d+/);

    await expect(page.getByText('Random Message')).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder('Type a message...').fill('Random Response');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText('Random Response')).toBeVisible({ timeout: 5000 });
  });

  test('User B can see the reply from User A', async ({ page }) => {
    await login(page, TEST_USER_B);

    await page.getByRole('link', { name: 'Messages' }).click();
    await page.getByRole('article').filter({ hasText: TEST_USER_A.username }).click();

    await expect(page.getByText('Random Response')).toBeVisible({ timeout: 5000 });
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