const BASE_URL = 'http://localhost:3001';

const TEST_USER_A = {
  email:    'e2e.usera@ucla.edu',
  password: 'E2eTestA1!',
};

const TEST_USER_B = {
  email:    'e2e.userb@ucla.edu',
  password: 'E2eTestB1!',
};

async function deleteUser(user) {
  const res = await fetch(`${BASE_URL}/auth/delete-account`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ucla_email: user.email, password: user.password }),
  });
  const data = await res.json();
  if (res.status === 404) {
    console.log(`[globalTeardown] ${user.email} not found — already deleted`);
    return;
  }
  if (!data.status) {
    console.warn(`[globalTeardown] Failed to delete ${user.email}: ${data.message}`);
    return;
  }
  console.log(`[globalTeardown] Deleted ${user.email}`);
}

export default async function globalTeardown() {
  await deleteUser(TEST_USER_A);
  await deleteUser(TEST_USER_B);
  console.log('[globalTeardown] Cleanup complete');
}