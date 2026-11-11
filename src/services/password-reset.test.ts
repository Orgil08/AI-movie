import test from 'node:test';
import assert from 'node:assert/strict';
import { Storage, memDb } from '../db/storage.js';
import { registerSchema } from '../utils/validation.js';

test('Registration - payload from screenshot (Orgil / orgio1298@gmail.com) succeeds', async () => {
  // Test with confirmPassword matching
  const parsedWithConfirm = registerSchema.safeParse({
    name: 'Orgil',
    email: 'orgio1298@gmail.com',
    password: 'password123',
    confirmPassword: 'password123'
  });
  assert.equal(parsedWithConfirm.success, true, 'Should successfully validate Orgil registration with confirmPassword');

  // Test modal payload omitting confirmPassword
  const parsedWithoutConfirm = registerSchema.safeParse({
    name: 'Orgil',
    email: 'orgio1298@gmail.com',
    password: 'password123'
  });
  assert.equal(parsedWithoutConfirm.success, true, 'Should successfully validate even if confirmPassword is not in payload');

  // Test creating user in storage
  const user = await Storage.createUser({
    name: parsedWithConfirm.data.name,
    email: parsedWithConfirm.data.email,
    passwordHash: 'hashed_password_sample',
    role: 'user'
  });
  assert.equal(user.email, 'orgio1298@gmail.com');
  assert.equal(user.role, 'user');
});

test('Password Reset - generates token, verifies validity, and resets password', async () => {
  memDb.clear();

  // Create a demo user to reset
  const user = await Storage.createUser({
    name: 'Энхжин',
    email: 'enkhjin@aimovie.mn',
    passwordHash: 'old_hashed_password',
    role: 'user'
  });

  // 1. Generate reset token
  const tokenResult = await Storage.createPasswordResetToken('enkhjin@aimovie.mn');
  assert.ok(tokenResult, 'Token result should be generated');
  assert.ok(tokenResult.token.length >= 32, 'Token should be a secure hex string');
  assert.ok(tokenResult.tokenHash && tokenResult.tokenHash !== tokenResult.token, 'Token must be hashed with SHA-256');
  assert.equal(memDb.passwordResetTokens.has(tokenResult.token), false, 'Plaintext token must NEVER be stored in DB');
  assert.equal(memDb.passwordResetTokens.has(tokenResult.tokenHash), true, 'SHA-256 tokenHash must be stored in DB');
  assert.equal(tokenResult.email, 'enkhjin@aimovie.mn');

  // 2. Verify token
  const verifyResult = await Storage.verifyPasswordResetToken(tokenResult.token);
  assert.equal(verifyResult.valid, true, 'Token should be valid');
  assert.equal(verifyResult.email, 'enkhjin@aimovie.mn');

  // 3. Reset password with token
  const resetResult = await Storage.resetPasswordWithToken(tokenResult.token, 'newSecretPassword2026');
  assert.equal(resetResult.success, true, 'Password reset should succeed');

  // 4. Token cannot be reused
  const reuseResult = await Storage.verifyPasswordResetToken(tokenResult.token);
  assert.equal(reuseResult.valid, false, 'Used token must be rejected');

  // 5. User password in storage has been updated
  const updatedUser = await Storage.getUserByEmail('enkhjin@aimovie.mn');
  assert.notEqual(updatedUser?.passwordHash, 'old_hashed_password', 'Password hash must be updated');
});

test('Password Reset - non-existent email returns null safely', async () => {
  const result = await Storage.createPasswordResetToken('nonexistent_user_999@aimovie.mn');
  assert.equal(result, null, 'Non-existent email should return null');
});
