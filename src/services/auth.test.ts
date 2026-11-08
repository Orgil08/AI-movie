import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import { Storage, memDb } from '../db/storage.js';

test('Password hashing and verification', () => {
  const password = 'SuperSecurePassword123!';
  const hash = hashPassword(password);

  assert.ok(hash && typeof hash === 'string', 'Hash should be a non-empty string');
  assert.notEqual(hash, password, 'Hash should not equal the plain password');
  assert.equal(verifyPassword(password, hash), true, 'Verification should succeed for correct password');
  assert.equal(verifyPassword('WrongPassword', hash), false, 'Verification should fail for incorrect password');
});

test('User registration and email lookup', async () => {
  memDb.clear();

  const user = await Storage.createUser({
    name: 'Энхтөр',
    email: 'Enkhtor@AiMovie.MN',
    passwordHash: hashPassword('mypassword123')
  });

  assert.ok(user.id, 'User should have an ID generated');
  assert.equal(user.name, 'Энхтөр');
  assert.equal(user.email, 'enkhtor@aimovie.mn', 'Email should be stored in lowercase');

  // Case-insensitive lookup
  const found = await Storage.getUserByEmail('ENKHTOR@aimovie.mn');
  assert.ok(found, 'Should find user with case-insensitive email');
  assert.equal(found?.id, user.id);

  // ID lookup
  const byId = await Storage.getUserById(user.id!);
  assert.ok(byId, 'Should find user by id');
  assert.equal(byId?.name, 'Энхтөр');
});

test('Pre-seeded demo accounts exist', async () => {
  memDb.clear();

  const batbayar = await Storage.getUserByEmail('batbayar@aimovie.mn');
  assert.ok(batbayar, 'Batbayar demo user should be pre-seeded');
  assert.equal(verifyPassword('password123', batbayar!.passwordHash), true, 'Demo password should match');

  const enkhjin = await Storage.getUserByEmail('enkhjin@aimovie.mn');
  assert.ok(enkhjin, 'Enkhjin demo user should be pre-seeded');

  const temuulen = await Storage.getUserByEmail('temuulen@aimovie.mn');
  assert.ok(temuulen, 'Temuulen demo user should be pre-seeded');
});
