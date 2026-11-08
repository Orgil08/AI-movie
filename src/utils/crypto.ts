import crypto from 'node:crypto';

const SALT = 'streamline_sodon_ai_movie_secret_salt_2026';

export function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, SALT, 1000, 32, 'sha256').toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  if (!password || !hash) return false;
  return hashPassword(password) === hash;
}
