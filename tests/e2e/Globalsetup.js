// Runs once before all tests.
// Creates User A and User B in the DB via the real API.
// If either account already exists (e.g. from a crashed previous run), logs in instead.

const BASE_URL = 'http://localhost:3001';

const TEST_USER_A = {
  email:     'e2e.usera@ucla.edu',
  username:  'e2e_userA',
  firstName: 'TestA',
  lastName:  'UCLAway',
  password:  'E2eTestA1!',
};

const TEST_USER_B = {
  email:     'e2e.userb@ucla.edu',
  username:  'e2e_userB',
  firstName: 'TestB',
  lastName:  'UCLAway',
  password:  'E2eTestB1!',
};

async function createUser(user) {
  const res = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username:   user.username,
      full_name:  `${user.firstName} ${user.lastName}`,
      ucla_email: user.email,
      password:   user.password,
    }),
  });
  const data = await res.json();

  if (res.status === 409) {
    // Account already exists from a previous crashed run — that's fine, teardown will clean it
    console.log(`[globalSetup] ${user.username} already exists, continuing`);
    return;
  }
  if (!data.status) {
    throw new Error(`[globalSetup] Failed to create ${user.username}: ${data.message}`);
  }
  console.log(`[globalSetup] Created ${user.username}`);
}

export default async function globalSetup() {
  await createUser(TEST_USER_A);
  await createUser(TEST_USER_B);
  console.log('[globalSetup] Both test users ready');
}