import assert from 'node:assert/strict';
import test from 'node:test';
import { mapFacebookProfileToUser } from '../src/auth/facebook-profile.js';

test('preserves a real email returned by Facebook', () => {
  assert.deepEqual(
    mapFacebookProfileToUser({ id: 'app-scoped-user-id', email: 'plant@example.com' }),
    { email: 'plant@example.com' },
  );
});

test('uses a reserved non-deliverable address when Facebook omits email', () => {
  const mappedUser = mapFacebookProfileToUser({ id: 'app-scoped-user-id' });

  assert.equal(mappedUser.email, 'app-scoped-user-id@facebook.carnivorastucuman.invalid');
  assert.equal(mappedUser.email.endsWith('.invalid'), true);
});
