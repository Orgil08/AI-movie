import crypto from 'node:crypto';

export interface SessionClaims {
  userId: string;
  expiresAt: number;
}

export function safeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSignedSessionToken(
  userId: string,
  secret: string,
  maxAgeSeconds: number,
  nowMilliseconds = Date.now()
): { token: string; expiresAt: number } {
  if (!userId.trim()) throw new Error('A session user ID is required.');
  if (secret.length < 32) throw new Error('The session secret must contain at least 32 characters.');
  if (!Number.isSafeInteger(maxAgeSeconds) || maxAgeSeconds <= 0) {
    throw new Error('Session max age must be a positive integer.');
  }

  const encodedUserId = Buffer.from(userId, 'utf8').toString('base64url');
  const expiresAt = Math.floor(nowMilliseconds / 1000) + maxAgeSeconds;
  const payload = `${encodedUserId}.${expiresAt}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return { token: `${payload}.${signature}`, expiresAt };
}

export function verifySignedSessionToken(
  token: string | null,
  secret: string,
  nowMilliseconds = Date.now()
): SessionClaims | null {
  if (!token || secret.length < 32) return null;

  const [encodedUserId, expiryText, signature, ...extra] = token.split('.');
  if (!encodedUserId || !expiryText || !signature || extra.length > 0) return null;

  const expiresAt = Number(expiryText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(nowMilliseconds / 1000)) return null;

  const payload = `${encodedUserId}.${expiresAt}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (!safeStringEqual(signature, expectedSignature)) return null;

  try {
    const userId = Buffer.from(encodedUserId, 'base64url').toString('utf8');
    return userId ? { userId, expiresAt } : null;
  } catch {
    return null;
  }
}
