import test from 'node:test';
import assert from 'node:assert/strict';
import { createSignedSessionToken, verifySignedSessionToken } from './session.js';

const SECRET = 'test-secret-that-is-long-enough-for-hmac-signing';

 test('signed sessions accept valid tokens and reject tampered or expired tokens', () => {
  const now = Date.UTC(2026, 10, 9, 0, 0, 0);
  const { token, expiresAt } = createSignedSessionToken('mongo-user-123', SECRET, 3600, now);

  assert.deepEqual(verifySignedSessionToken(token, SECRET, now), {
    userId: 'mongo-user-123',
    expiresAt
  });
  assert.equal(verifySignedSessionToken(token, `${SECRET}-wrong`, now), null);
  assert.equal(verifySignedSessionToken(`${token.slice(0, -1)}0`, SECRET, now), null);
  assert.equal(verifySignedSessionToken(token, SECRET, (expiresAt + 1) * 1000), null);
});

test('session token creation rejects weak secrets and invalid lifetimes', () => {
  assert.throws(() => createSignedSessionToken('user-1', 'short', 3600));
  assert.throws(() => createSignedSessionToken('user-1', SECRET, 0));
});
