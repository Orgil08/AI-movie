import test from 'node:test';
import assert from 'node:assert/strict';
import { Storage, memDb } from '../db/storage.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import { registerSchema, loginSchema, movieSchema } from '../utils/validation.js';

test('RBAC - Registration enforces user role strictly', async () => {
  memDb.clear();

  const user = await Storage.createUser({
    name: 'Болдбаатар',
    email: 'bold@aimovie.mn',
    passwordHash: hashPassword('SecurePass123!'),
    role: 'admin' // Attempting to pass role: 'admin' during registration
  });

  assert.equal(user.role, 'user', 'Newly registered user MUST receive role="user" regardless of input');
  assert.equal(user.status, 'active');
});

test('RBAC - Last admin protection prevents demoting the final administrator', async () => {
  memDb.clear();

  const admins = (await Storage.getAllUsers()).filter((u) => u.role === 'admin');
  assert.equal(admins.length, 1, 'Only 1 admin (admin@aimovie.mn) should exist initially');

  const lastAdmin = admins[0];
  await assert.rejects(
    async () => {
      await Storage.setUserRole(lastAdmin.id!, 'user');
    },
    /Хамгийн сүүлийн администраторын эрхийг хасах боломжгүй/,
    'Should throw error preventing demoting the last administrator'
  );
});

test('RBAC - Zod registration validation requires min 8 characters and password confirmation', () => {
  // Too short password
  const shortResult = registerSchema.safeParse({
    name: 'Энхжин',
    email: 'enkhjin2@aimovie.mn',
    password: 'short',
    confirmPassword: 'short',
    terms: true
  });
  assert.equal(shortResult.success, false, 'Should fail when password is less than 8 characters');

  // Mismatch confirm password
  const mismatchResult = registerSchema.safeParse({
    name: 'Энхжин',
    email: 'enkhjin2@aimovie.mn',
    password: 'SuperPassword123!',
    confirmPassword: 'DifferentPassword123!',
    terms: true
  });
  assert.equal(mismatchResult.success, false, 'Should fail when confirmPassword does not match');

  // Missing terms
  const noTermsResult = registerSchema.safeParse({
    name: 'Энхжин',
    email: 'enkhjin2@aimovie.mn',
    password: 'SuperPassword123!',
    confirmPassword: 'SuperPassword123!',
    terms: false
  });
  assert.equal(noTermsResult.success, false, 'Should fail when terms is false');

  // Valid payload
  const validResult = registerSchema.safeParse({
    name: 'Энхжин',
    email: 'enkhjin2@aimovie.mn',
    password: 'SuperPassword123!',
    confirmPassword: 'SuperPassword123!',
    terms: true
  });
  assert.equal(validResult.success, true, 'Should pass with valid input');
});

test('RBAC - Movie creation and management in storage', async () => {
  memDb.clear();

  const newMovie = await Storage.createMovie({
    titleMn: 'Монгол Кино',
    titleEn: 'Mongolian Film',
    slug: 'mongol-kino-2026',
    descriptionMn: 'Монголын соёл, ирээдүйг харуулсан бүтээл.',
    descriptionEn: 'Futuristic story set in Mongolia.',
    posterUrl: 'https://example.com/poster.jpg',
    backdropUrl: 'https://example.com/backdrop.jpg',
    videoUrl: 'https://example.com/stream.mp4',
    trailerUrl: 'https://example.com/trailer.mp4',
    year: 2026,
    duration: '2h 10m',
    genres: ['Sci-Fi', 'Action'],
    rating: '9.2',
    published: true,
    featured: true
  });

  assert.ok(newMovie.id);
  const found = await Storage.getMovieById(newMovie.id);
  assert.ok(found);
  assert.equal(found?.titleMn, 'Монгол Кино');
  assert.equal(found?.featured, true);

  // Update
  await Storage.updateMovie(newMovie.id, { rating: '9.8' });
  const updated = await Storage.getMovieById(newMovie.id);
  assert.equal(updated?.rating, '9.8');

  // Delete
  const deleted = await Storage.deleteMovie(newMovie.id);
  assert.equal(deleted, true);
  const afterDelete = await Storage.getMovieById(newMovie.id);
  assert.equal(afterDelete, null);
});
