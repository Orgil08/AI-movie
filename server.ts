import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {
  Storage,
  connectDB,
  DatabaseConnectionError,
  enableStrictMongoMode,
  ensureDatabaseConnection,
  getDatabaseStatus,
  isMongoActive,
  isMongoUriConfigured,
  isProductionEnvironment,
  normalizeStorageError
} from './src/db/storage.js';
import { defaultWireService, WireService } from './src/services/wire.service.js';
import { SUBSCRIPTION_PLANS, isValidPlanId, getPlanById } from './src/config/subscription-plans.js';
import { BANK_TRANSFER_DETAILS } from './src/config/bank-details.js';
import { hashPassword, verifyPassword } from './src/utils/crypto.js';
import { createSignedSessionToken, safeStringEqual, verifySignedSessionToken } from './src/utils/session.js';
import { checkMovieAccess } from './src/utils/accessControl.js';
import { getMovieTitleSuggestions } from './src/utils/movieFilter.js';
import { validateEpisodesPayload, canAccessEpisode } from './src/utils/seriesEpisodes.js';
import {
  isAdultRestrictedMovie,
  filterMoviesForAgeGate,
  resolveSafePosterUrl
} from './src/utils/ageGateAndPosters.js';
import { getPageMetadata } from './src/i18n/seo.js';
import { getLocaleFromPath } from './src/i18n/routing.js';
import {
  registerSchema,
  loginSchema,
  movieSchema,
  categorySchema,
  changePasswordSchema,
  updateProfileSchema
} from './src/utils/validation.js';

dotenv.config();
// Enforce strict MongoDB mode on the Express server: never fall back to memory storage
enableStrictMongoMode(true);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = isProductionEnvironment();
const SESSION_COOKIE = 'ai_movie_uid';
const CSRF_COOKIE = 'ai_movie_csrf';
const AGE_VERIFIED_COOKIE = 'ai_movie_age_verified';

export function sendApiError(
  res: Response,
  rawErr: any,
  fallbackCode = 'SERVER_ERROR',
  fallbackMessage = 'Сервер дээр алдаа гарлаа.',
  defaultStatus = 500
): Response {
  const err: any = normalizeStorageError(rawErr);
  if (
    err instanceof DatabaseConnectionError ||
    err?.statusCode === 503 ||
    err?.code === 'DATABASE_UNAVAILABLE' ||
    err?.code === 'DATABASE_NOT_CONFIGURED'
  ) {
    return res.status(503).json({
      error: err.code || 'DATABASE_UNAVAILABLE',
      message:
        err.message ||
        'Өгөгдлийн сантай холбогдож чадсангүй (MongoDB Atlas Network Access 0.0.0.0/0 болон MONGODB_URI шалгана уу).',
      database: getDatabaseStatus()
    });
  }

  const status = typeof err?.statusCode === 'number' ? err.statusCode : defaultStatus;
  return res.status(status).json({
    error: err?.code || fallbackCode,
    message: err?.message || fallbackMessage
  });
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) {
    return secret.length >= 32
      ? secret
      : crypto.createHash('sha256').update(secret).digest('hex');
  }
  if (isProductionEnvironment()) {
    throw new Error('AUTH_SECRET must be configured in production.');
  }
  return 'local-development-only-ai-movie-session-secret';
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim()
  );
}

export function isEmailServiceConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

function readCookie(req: Request, cookieName: string): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== cookieName) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function createSessionToken(userId: string, maxAgeSeconds: number) {
  return createSignedSessionToken(userId, getAuthSecret(), maxAgeSeconds);
}

function verifySessionToken(token: string | null) {
  return verifySignedSessionToken(token, getAuthSecret());
}

function setSessionCookie(res: Response, userId: string, maxAgeSeconds: number): string {
  const { token } = createSessionToken(userId, maxAgeSeconds);
  const secure = isProduction ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`
  );
  return token;
}

function extractRequestSessionToken(req: Request): string | null {
  const cookieToken = readCookie(req, SESSION_COOKIE);
  if (cookieToken && verifySessionToken(cookieToken)) {
    return cookieToken;
  }

  const authHeader = req.get('authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const bearerToken = authHeader.slice(7).trim();
    if (bearerToken && verifySessionToken(bearerToken)) {
      return bearerToken;
    }
  }

  const headerToken = (req.get('x-session-token') || '').trim();
  if (headerToken && verifySessionToken(headerToken)) {
    return headerToken;
  }

  return cookieToken || null;
}

function isRequestAgeVerified(req: Request): boolean {
  const cookieToken = readCookie(req, AGE_VERIFIED_COOKIE);
  if (cookieToken) {
    const claims = verifySessionToken(cookieToken);
    if (claims && claims.userId === 'age_verified_18plus') {
      return true;
    }
  }

  const headerToken = (req.get('x-age-verified-token') || '').trim();
  if (headerToken) {
    const claims = verifySessionToken(headerToken);
    if (claims && claims.userId === 'age_verified_18plus') {
      return true;
    }
  }

  return false;
}

function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  const cookieToken = readCookie(req, CSRF_COOKIE);
  const requestToken = (req.get('x-csrf-token') || req.body?.csrfToken || '').toString();
  if (!requestToken) {
    res.status(403).json({
      error: 'CSRF_VALIDATION_FAILED',
      message: 'Хүсэлтийн аюулгүй байдлын шалгалт амжилтгүй боллоо. Дахин оролдоно уу.'
    });
    return;
  }

  const cookieMatches = Boolean(cookieToken && safeStringEqual(cookieToken, requestToken));
  const signedClaims = verifySessionToken(requestToken);
  const signatureMatches = Boolean(signedClaims && signedClaims.userId === 'csrf');

  if (!cookieMatches && !signatureMatches) {
    res.status(403).json({
      error: 'CSRF_VALIDATION_FAILED',
      message: 'Хүсэлтийн аюулгүй байдлын шалгалт амжилтгүй боллоо. Дахин оролдоно уу.'
    });
    return;
  }
  next();
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
}

// User resolution uses a signed, expiring session token (from HttpOnly cookie or signed Bearer token).
// A plain client-supplied user ID header is never accepted as proof of authentication.
async function getAuthenticatedUser(req: Request): Promise<AuthenticatedUser | null> {
  const claims = verifySessionToken(extractRequestSessionToken(req));
  if (!claims || claims.userId === 'csrf') return null;

  const dbUser = await Storage.getUserById(claims.userId);
  if (!dbUser || dbUser.status === 'suspended') return null;

  return {
    id: dbUser.id || claims.userId,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role === 'admin' ? 'admin' : 'user',
    status: (dbUser.status as 'active' | 'suspended') || 'active'
  };
}

// Server-side authentication guard for user endpoints
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Нэвтэрч орно уу.' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'Таны бүртгэл түр түдгэлзсэн байна.' });
    }
    (req as any).user = user;
    next();
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Баталгаажуулалтын алдаа гарлаа.');
  }
}

// Server-side administrator guard for Admin Panel endpoints
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Администратор хаягаар нэвтэрнэ үү.' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'FORBIDDEN_ADMIN_ONLY', message: 'Зөвхөн администратор хандах эрхтэй.' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'Таны администратор бүртгэл түдгэлзсэн байна.' });
    }
    (req as any).user = user;
    next();
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Баталгаажуулалтын алдаа гарлаа.');
  }
}

// In-memory sliding window rate limiter for auth endpoints
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, limit = 25, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) {
    return false;
  }
  entry.count++;
  return true;
}

// Generate base app URL
function getBaseUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${protocol}://${host}`;
}

const STATELESS_API_PATHS = new Set([
  '/health',
  '/auth/csrf',
  '/auth/providers',
  '/auth/logout',
  '/bank-details',
  '/age-verification/status',
  '/age-verification/confirm',
  '/age-verification/revoke'
]);

// Fail closed across all database-backed API endpoints:
// check MongoDB connection status and return HTTP 503 if unavailable instead of using memory-based fallbacks.
app.use('/api', async (req: Request, res: Response, next: NextFunction) => {
  if (STATELESS_API_PATHS.has(req.path)) {
    if (isProductionEnvironment() && !process.env.AUTH_SECRET?.trim() && req.path === '/auth/csrf') {
      return res.status(503).json({
        error: 'AUTH_SECRET_NOT_CONFIGURED',
        message: 'Production AUTH_SECRET is not configured in Vercel.'
      });
    }
    return next();
  }

  if (!isMongoUriConfigured()) {
    return res.status(503).json({
      error: 'DATABASE_NOT_CONFIGURED',
      message: 'Өгөгдлийн сангийн тохиргоо (MONGODB_URI) хийгдээгүй байна.',
      database: getDatabaseStatus()
    });
  }

  if (isProductionEnvironment() && !process.env.AUTH_SECRET?.trim()) {
    return res.status(503).json({
      error: 'AUTH_SECRET_NOT_CONFIGURED',
      message: 'Production authentication secret (AUTH_SECRET) is not configured in Vercel.'
    });
  }

  try {
    const connected = await ensureDatabaseConnection();
    if (!connected || !isMongoActive()) {
      return res.status(503).json({
        error: 'DATABASE_UNAVAILABLE',
        message:
          'Өгөгдлийн сантай холбогдож чадсангүй (MongoDB Atlas Network Access 0.0.0.0/0 болон MONGODB_URI шалгана уу).',
        database: getDatabaseStatus()
      });
    }
    return next();
  } catch (error) {
    console.error('[API] Database connection check failed:', error);
    return sendApiError(
      res,
      error,
      'DATABASE_UNAVAILABLE',
      'Өгөгдлийн сантай холбогдож чадсангүй (MongoDB Atlas Network Access 0.0.0.0/0 болон MONGODB_URI шалгана уу).',
      503
    );
  }
});

// -------------------------------------------------------------
// 1. Raw body parsing for Webhooks (MUST be before express.json)
// -------------------------------------------------------------
app.use(
  '/api/webhooks/wire',
  express.raw({
    type: '*/*',
    limit: '2mb'
  })
);

// Standard JSON parser for all other routes (10MB limit for Base64 image payloads before validation)
app.use(express.json({ limit: '10mb' }));

// -------------------------------------------------------------
// 2. Authentication Endpoints (Sign In, Sign Up, Sign Out, Me, Password Reset)
// -------------------------------------------------------------

app.get('/api/auth/providers', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    credentials: {
      id: 'credentials',
      name: 'Email and Password',
      type: 'credentials',
      signInUrl: '/api/auth/login',
      signUpUrl: '/api/auth/register'
    }
  });
});

app.get('/api/auth/csrf', (_req: Request, res: Response) => {
  const { token: csrfToken } = createSessionToken('csrf', 3600);
  const secure = isProduction ? '; Secure' : '';
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader(
    'Set-Cookie',
    `${CSRF_COOKIE}=${encodeURIComponent(csrfToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600${secure}`
  );
  return res.json({ csrfToken });
});

app.get('/api/auth/session', async (req: Request, res: Response) => {
  try {
    const claims = verifySessionToken(extractRequestSessionToken(req));
    const user = claims ? await getAuthenticatedUser(req) : null;
    const subscription = user ? await Storage.getActiveSubscription(user.id) : null;
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      user: user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null,
      expires: claims ? new Date(claims.expiresAt * 1000).toISOString() : null,
      subscription
    });
  } catch (error) {
    console.error('[Auth/Session] Error:', error);
    return sendApiError(res, error, 'SESSION_LOOKUP_FAILED', 'Session шалгахад алдаа гарлаа.', 500);
  }
});

// Context Endpoint: returns current user and active subscription
app.get('/api/auth/me', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.json({
        user: null,
        subscription: null,
        wireConfigured: defaultWireService.isConfigured()
      });
    }

    const subscription = await Storage.getActiveSubscription(user.id);
    const plan = subscription ? getPlanById(subscription.planId) : null;

    let daysRemaining = 0;
    if (subscription) {
      const end = new Date(subscription.endDate).getTime();
      const diff = end - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    res.json({
      user,
      subscription: subscription
        ? {
            ...subscription,
            plan,
            daysRemaining
          }
        : null,
      wireConfigured: defaultWireService.isConfigured()
    });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Хэрэглэгчийн мэдээлэл шалгахад алдаа гарлаа.');
  }
});

// User Registration: Sign Up with Zod validation, role="user" strict enforcement, bcrypt hashing
app.post('/api/auth/register', requireCsrf, async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(`reg_${clientIp}`, 15)) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Хэт олон бүртгүүлэх оролдлого хийсэн байна. Түр хүлээнэ үү.'
      });
    }

    // Check if registrations are allowed in Website Settings
    const settings = await Storage.getWebsiteSettings();
    if (settings && settings.allowRegistrations === false) {
      return res.status(403).json({
        error: 'REGISTRATIONS_DISABLED',
        message: 'Шинэ хэрэглэгчийн бүртгэл түр хаалттай байна. Администраторт хандана уу.'
      });
    }

    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: firstIssue?.message || 'Мэдээллээ зөв оруулна уу.'
      });
    }

    const { name, email, password } = parseResult.data;

    const existingUser = await Storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: 'EMAIL_ALREADY_EXISTS',
        message: 'Энэ имэйл хаяг бүртгэгдсэн байна. Нэвтэрч орно уу.'
      });
    }

    const passwordHash = hashPassword(password);
    // Mandatory security rule: newly registered users always receive 'user' role
    const newUser = await Storage.createUser({
      name,
      email,
      passwordHash,
      role: 'user'
    });

    const sessionToken = setSessionCookie(res, newUser.id!, 30 * 24 * 60 * 60);

    return res.status(201).json({
      success: true,
      message: 'Амжилттай бүртгэгдлээ.',
      sessionToken,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: 'user'
      }
    });
  } catch (err: any) {
    console.error('[Auth/Register] Error:', err);
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Бүртгүүлэхэд алдаа гарлаа.');
  }
});

// User Login: Sign In with Zod validation, credential check, remember me, and role redirection support
app.post('/api/auth/login', requireCsrf, async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(`login_${clientIp}`, 20)) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Хэт олон нэвтрэх оролдлого хийсэн байна. 15 минутын дараа дахин оролдоно уу.'
      });
    }

    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: parseResult.error.issues[0]?.message || 'Имэйл болон нууц үгээ оруулна уу.'
      });
    }

    const { email, password, remember } = parseResult.data;

    const user = await Storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        error: 'ACCOUNT_NOT_FOUND',
        message: 'Энэ имэйл хаягтай бүртгэл олдсонгүй.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        error: 'ACCOUNT_SUSPENDED',
        message: 'Таны бүртгэл түр түдгэлзсэн байна. Администраторт хандана уу.'
      });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({
        error: 'INCORRECT_PASSWORD',
        message: 'Нууц үг буруу байна.'
      });
    }

    await Storage.updateUser(user.id!, { lastLoginAt: new Date() });

    const maxAge = remember !== false ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
    const sessionToken = setSessionCookie(res, user.id!, maxAge);

    const subscription = await Storage.getActiveSubscription(user.id!);

    return res.json({
      success: true,
      message: 'Амжилттай нэвтэрлээ.',
      sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role === 'admin' ? 'admin' : 'user'
      },
      subscription
    });
  } catch (err: any) {
    console.error('[Auth/Login] Error:', err);
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Нэвтрэхэд алдаа гарлаа.');
  }
});

// Phase 6: Forgot Password (Resend email integration + SHA-256 token hashing)
app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(`forgot_${clientIp}`, 10, 15 * 60 * 1000)) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Хэт олон удаа нууц үг сэргээх хүсэлт илгээсэн байна. 15 минутын дараа дахин оролдоно уу.'
      });
    }

    const email = (req.body?.email || '').toString().trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Имэйл хаягаа зөв оруулна уу.'
      });
    }

    // Honest configuration check: never pretend an email was sent when Resend is unconfigured
    if (!isEmailServiceConfigured()) {
      return res.status(503).json({
        error: 'EMAIL_SERVICE_NOT_CONFIGURED',
        message:
          'Имэйл илгээх сервис (RESEND_API_KEY, EMAIL_FROM) тохируулаагүй байна. Системийн администраторт хандана уу.'
      });
    }

    const genericSuccessMessage =
      'Хэрэв уг имэйл хаяг системд бүртгэлтэй бол нууц үг сэргээх холбоос таны имэйл рүү илгээгдлээ.';

    const tokenData = await Storage.createPasswordResetToken(email);
    if (!tokenData) {
      // Never reveal whether an email exists in the system
      return res.json({
        success: true,
        message: genericSuccessMessage
      });
    }

    const baseUrl = getBaseUrl(req);
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(tokenData.token)}`;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM!.trim(),
        to: [tokenData.email],
        subject: 'SODON AI MOVIE — Нууц үг сэргээх холбоос / Password Reset',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0b0f19; color: #ffffff; border-radius: 12px;">
            <h2 style="color: #e5a93c; margin-top: 0;">SODON AI MOVIE</h2>
            <p>Таны бүртгэлд нууц үг шинэчлэх хүсэлт ирлээ. Доорх товч дээр дарж шинэ нууц үгээ тохируулна уу (Холбоос 1 цагийн хугацаанд хүчинтэй):</p>
            <p style="margin: 24px 0;">
              <a href="${resetUrl}" style="background: #e50914; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Нууц үг шинэчлэх</a>
            </p>
            <p style="font-size: 12px; color: #94a3b8;">Хэрэв та энэ хүсэлтийг илгээгээгүй бол энэхүү имэйлийг үл хэрэгсэнэ үү.</p>
          </div>
        `
      })
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error('[Auth/ForgotPassword] Resend API error:', errBody);
      return res.status(502).json({
        error: 'EMAIL_DELIVERY_FAILED',
        message: 'Имэйл илгээхэд алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.'
      });
    }

    return res.json({
      success: true,
      message: genericSuccessMessage
    });
  } catch (err: any) {
    console.error('[Auth/ForgotPassword] Error:', err);
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Нууц үг сэргээх хүсэлт илгээхэд алдаа гарлаа.');
  }
});

// Verify Password Reset Token (GET /api/auth/verify-reset-token?token=...)
app.get('/api/auth/verify-reset-token', async (req: Request, res: Response) => {
  try {
    const token = (req.query.token || '').toString().trim();
    const verification = await Storage.verifyPasswordResetToken(token);
    if (!verification.valid) {
      return res.status(400).json({
        valid: false,
        error: 'INVALID_OR_EXPIRED_TOKEN',
        message: verification.message || 'Нууц үг сэргээх холбоос хүчингүй эсвэл хугацаа нь дууссан байна.'
      });
    }
    return res.json({
      valid: true,
      email: verification.email
    });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Токен шалгахад алдаа гарлаа.');
  }
});

// Reset Password with Token (POST /api/auth/reset-password)
app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(`reset_pw_${clientIp}`, 10, 15 * 60 * 1000)) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Хэт олон оролдлого хийсэн байна. Түр хүлээнэ үү.'
      });
    }

    const { token, newPassword, confirmNewPassword } = req.body || {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'MISSING_TOKEN', message: 'Нууц үг сэргээх токен дутуу байна.' });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.'
      });
    }
    if (confirmNewPassword !== undefined && newPassword !== confirmNewPassword) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Шинэ нууц үгүүд хоорондоо таарахгүй байна.'
      });
    }

    const result = await Storage.resetPasswordWithToken(token, newPassword);
    if (!result.success) {
      return res.status(400).json({
        error: 'RESET_FAILED',
        message: result.message
      });
    }

    return res.json({
      success: true,
      message: result.message
    });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Нууц үг шинэчлэхэд алдаа гарлаа.');
  }
});

// User Profile Update (Name)
app.post('/api/auth/update-profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as AuthenticatedUser;
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: parseResult.error.issues[0]?.message || 'Нэрээ зөв оруулна уу.'
      });
    }

    const updated = await Storage.updateUser(authUser.id, { name: parseResult.data.name });
    res.json({
      success: true,
      message: 'Хэрэглэгчийн мэдээлэл шинэчлэгдлээ.',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role
      }
    });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Мэдээлэл шинэчлэхэд алдаа гарлаа.');
  }
});

// User Password Change
app.post('/api/auth/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as AuthenticatedUser;
    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: parseResult.error.issues[0]?.message || 'Мэдээллээ зөв оруулна уу.'
      });
    }

    const { currentPassword, newPassword } = parseResult.data;
    const dbUser = await Storage.getUserById(authUser.id);
    if (!dbUser || !verifyPassword(currentPassword, dbUser.passwordHash)) {
      return res.status(400).json({
        error: 'INVALID_CURRENT_PASSWORD',
        message: 'Одоогийн нууц үг буруу байна.'
      });
    }

    const newHash = hashPassword(newPassword);
    await Storage.updateUserPassword(authUser.id, newHash);

    res.json({
      success: true,
      message: 'Нууц үг амжилттай шинэчлэгдлээ.'
    });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Нууц үг солиход алдаа гарлаа.');
  }
});

// User Sign Out: Clears session cookie
app.post('/api/auth/logout', (_req: Request, res: Response) => {
  const secure = isProduction ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
  return res.json({ success: true, message: 'Амжилттай гарлаа.' });
});

// Quick switch is intentionally unavailable in production.
app.post('/api/auth/switch-user', (req: Request, res: Response) => {
  if (isProduction) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Энэ endpoint production орчинд идэвхгүй.' });
  }
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  void Storage.getUserById(String(userId))
    .then((targetUser) => {
      if (!targetUser) {
        return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Хэрэглэгч олдсонгүй.' });
      }
      setSessionCookie(res, targetUser.id!, 30 * 24 * 60 * 60);
      return res.json({ success: true, userId: targetUser.id });
    })
    .catch((error) => {
      console.error('[Auth/SwitchUser] Error:', error);
      return sendApiError(res, error, 'SERVER_ERROR', 'Хэрэглэгч солиход алдаа гарлаа.');
    });
});

// =============================================================
// PUBLIC WEBSITE SETTINGS ENDPOINT (Phase 7)
// =============================================================
app.get('/api/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await Storage.getWebsiteSettings();
    res.json({ success: true, settings });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Тохиргоо ачаалахад алдаа гарлаа.');
  }
});

app.get('/api/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await Storage.getAllCategories();
    res.json({ success: true, categories });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Ангилал ачаалахад алдаа гарлаа.');
  }
});

// =============================================================
// ADMIN API ENDPOINTS (Protected with requireAdmin middleware)
// =============================================================

// 1. Dashboard Statistics
app.get('/api/admin/stats', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const stats = await Storage.getDashboardStats();
    res.json({ success: true, stats });
  } catch (err: any) {
    console.error('[Admin/Stats] Error:', err);
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Статистик ачаалахад алдаа гарлаа.');
  }
});

// 2. Movie Management: List All
app.get('/api/admin/movies', requireAdmin, async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const genre = req.query.genre as string;
    const movies = await Storage.getAllMovies({ search, genre, publishedOnly: false });
    res.json({ success: true, movies });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Кино жагсаалт ачаалахад алдаа гарлаа.');
  }
});

// 3. Movie Management: Create (Phase 1)
app.post('/api/admin/movies', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const body = {
      ...req.body,
      synopsisMn: req.body?.synopsisMn ?? req.body?.descriptionMn ?? req.body?.synopsis?.mn ?? '',
      synopsisEn: req.body?.synopsisEn ?? req.body?.descriptionEn ?? req.body?.synopsis?.en ?? ''
    };

    const parseResult = movieSchema.safeParse(body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: parseResult.error.issues[0]?.message || 'Киноны мэдээллээ зөв оруулна уу.'
      });
    }

    const movie = await Storage.createMovie(parseResult.data as any);
    await Storage.recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'CREATE_MOVIE',
      target: movie.id,
      details: `Created film: "${movie.titleMn}" (${movie.titleEn})`
    });

    res.status(201).json({ success: true, movie, message: 'Кино амжилттай нэмэгдлээ.' });
  } catch (err: any) {
    console.error('[Admin/CreateMovie] Error:', err);
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Кино нэмэхэд алдаа гарлаа.', err?.code === 'DUPLICATE_SLUG' ? 409 : 500);
  }
});

// 4. Movie Management: Update (Phase 1)
app.put('/api/admin/movies/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const { id } = req.params;
    const existing = await Storage.getMovieById(id);
    if (!existing) {
      return res.status(404).json({ error: 'MOVIE_NOT_FOUND', message: 'Кино олдсонгүй.' });
    }

    const candidate = {
      titleMn: req.body?.titleMn ?? req.body?.title?.mn ?? existing.titleMn ?? existing.title.mn,
      titleEn: req.body?.titleEn ?? req.body?.title?.en ?? existing.titleEn ?? existing.title.en,
      slug: req.body?.slug ?? existing.slug ?? existing.id,
      synopsisMn:
        req.body?.synopsisMn ??
        req.body?.descriptionMn ??
        req.body?.synopsis?.mn ??
        existing.synopsisMn ??
        existing.synopsis.mn,
      synopsisEn:
        req.body?.synopsisEn ??
        req.body?.descriptionEn ??
        req.body?.synopsis?.en ??
        existing.synopsisEn ??
        existing.synopsis.en,
      posterUrl: req.body?.posterUrl ?? existing.posterUrl,
      backdropUrl: req.body?.backdropUrl ?? req.body?.bannerUrl ?? existing.backdropUrl,
      videoUrl: req.body?.videoUrl ?? req.body?.videoSource ?? existing.videoUrl,
      trailerUrl: req.body?.trailerUrl ?? existing.trailerUrl ?? '',
      year: req.body?.year ?? existing.year,
      duration: req.body?.duration ?? existing.duration,
      genres: req.body?.genres ?? existing.genres,
      rating: req.body?.rating ?? existing.rating,
      ageRating: req.body?.ageRating ?? existing.ageRating ?? '13+',
      quality: req.body?.quality ?? existing.quality ?? '1080p Full HD',
      directorMn: req.body?.directorMn ?? req.body?.director?.mn ?? existing.directorMn ?? '',
      directorEn: req.body?.directorEn ?? req.body?.director?.en ?? existing.directorEn ?? '',
      castMn: req.body?.castMn ?? req.body?.cast?.mn ?? existing.castMn ?? '',
      castEn: req.body?.castEn ?? req.body?.cast?.en ?? existing.castEn ?? '',
      language: req.body?.language ?? existing.language ?? 'mn',
      country: req.body?.country ?? existing.country ?? 'Монгол',
      originalTitle: req.body?.originalTitle ?? existing.originalTitle ?? existing.titleEn,
      type: req.body?.type ?? existing.type ?? 'movie',
      featured: req.body?.featured !== undefined ? Boolean(req.body.featured) : existing.featured,
      trending: req.body?.trending !== undefined ? Boolean(req.body.trending) : existing.trending,
      isPremium: req.body?.isPremium !== undefined ? Boolean(req.body.isPremium) : existing.isPremium,
      minPlan: req.body?.minPlan ?? existing.minPlan ?? 'basic',
      published: req.body?.published !== undefined ? Boolean(req.body.published) : existing.published,
      hasMongolianSubtitles:
        req.body?.hasMongolianSubtitles !== undefined
          ? Boolean(req.body.hasMongolianSubtitles)
          : existing.hasMongolianSubtitles !== false,
      isOriginal:
        req.body?.isOriginal !== undefined ? Boolean(req.body.isOriginal) : Boolean(existing.isOriginal),
      isExclusive:
        req.body?.isExclusive !== undefined ? Boolean(req.body.isExclusive) : Boolean(existing.isExclusive),
      isShortDrama:
        req.body?.isShortDrama !== undefined ? Boolean(req.body.isShortDrama) : Boolean(existing.isShortDrama),
      totalEpisodes:
        req.body?.totalEpisodes !== undefined
          ? Number(req.body.totalEpisodes)
          : (existing.totalEpisodes ?? (existing.type === 'series' ? 50 : 1)),
      freeEpisodes:
        req.body?.freeEpisodes !== undefined
          ? Number(req.body.freeEpisodes)
          : (existing.freeEpisodes ?? (existing.type === 'series' ? 6 : 0)),
      unlockPrice:
        req.body?.unlockPrice !== undefined ? Number(req.body.unlockPrice) : (existing.unlockPrice ?? 4900),
      rentalDurationHours:
        req.body?.rentalDurationHours !== undefined
          ? Number(req.body.rentalDurationHours)
          : (existing.rentalDurationHours ?? 72),
      vipEnabled:
        req.body?.vipEnabled !== undefined ? Boolean(req.body.vipEnabled) : existing.vipEnabled !== false,
      seriesStatus: req.body?.seriesStatus ?? existing.seriesStatus ?? 'completed'
    };

    const parseResult = movieSchema.safeParse(candidate);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: parseResult.error.issues[0]?.message || 'Киноны мэдээллээ зөв оруулна уу.'
      });
    }

    const movie = await Storage.updateMovie(id, parseResult.data as any);
    if (!movie) {
      return res.status(404).json({ error: 'MOVIE_NOT_FOUND', message: 'Кино олдсонгүй.' });
    }

    await Storage.recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPDATE_MOVIE',
      target: id,
      details: `Updated film: "${movie.titleMn}" (${movie.titleEn})`
    });

    res.json({ success: true, movie, message: 'Киноны мэдээлэл амжилттай шинэчлэгдлээ.' });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Кино шинэчлэхэд алдаа гарлаа.', err?.code === 'DUPLICATE_SLUG' ? 409 : 500);
  }
});

// 5. Movie Management: Delete
app.delete('/api/admin/movies/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const { id } = req.params;
    const existing = await Storage.getMovieById(id);
    if (!existing) {
      return res.status(404).json({ error: 'MOVIE_NOT_FOUND', message: 'Кино олдсонгүй.' });
    }

    await Storage.deleteMovie(id);
    await Storage.recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'DELETE_MOVIE',
      target: id,
      details: `Deleted film: "${existing.titleMn}" (${existing.titleEn})`
    });

    res.json({ success: true, message: 'Кино амжилттай устгагдлаа.' });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Кино устгахад алдаа гарлаа.');
  }
});

// 6. Movie Management: Toggle Publish
app.patch('/api/admin/movies/:id/toggle-publish', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const { id } = req.params;
    const movie = await Storage.getMovieById(id);
    if (!movie) return res.status(404).json({ error: 'MOVIE_NOT_FOUND', message: 'Кино олдсонгүй.' });

    const updated = await Storage.updateMovie(id, { published: !movie.published });
    await Storage.recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: updated?.published ? 'PUBLISH_MOVIE' : 'UNPUBLISH_MOVIE',
      target: id
    });

    res.json({
      success: true,
      movie: updated,
      message: updated?.published ? 'Кино нийтлэгдлээ.' : 'Кино ноорог төлөвт шилжлээ.'
    });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

// 7. Movie Management: Toggle Featured
app.patch('/api/admin/movies/:id/toggle-featured', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const { id } = req.params;
    const movie = await Storage.getMovieById(id);
    if (!movie) return res.status(404).json({ error: 'MOVIE_NOT_FOUND', message: 'Кино олдсонгүй.' });

    const updated = await Storage.updateMovie(id, { featured: !movie.featured });
    await Storage.recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: updated?.featured ? 'FEATURE_MOVIE' : 'UNFEATURE_MOVIE',
      target: id
    });

    res.json({
      success: true,
      movie: updated,
      message: updated?.featured ? 'Онцлох киногоор сонгогдлоо.' : 'Онцлох төлөв цуцлагдлаа.'
    });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

// 7b. TV Series & Episode Management Endpoints (Admin)
app.get('/api/admin/movies/:id/episodes', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const movie = await Storage.getMovieById(id);
    if (!movie) {
      return res.status(404).json({ error: 'MOVIE_NOT_FOUND', message: 'Цуврал олдсонгүй.' });
    }
    const episodes = await Storage.getEpisodesBySeriesId(movie.id, false);
    res.json({ success: true, movie, episodes });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Ангиудын жагсаалт ачаалахад алдаа гарлаа.');
  }
});

app.post('/api/admin/movies/:id/episodes', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const { id } = req.params;
    const movie = await Storage.getMovieById(id);
    if (!movie) {
      return res.status(404).json({ error: 'MOVIE_NOT_FOUND', message: 'Цуврал олдсонгүй.' });
    }

    const epNum = Math.max(1, Math.floor(Number(req.body?.episodeNumber) || 1));
    const videoUrl = String(req.body?.videoUrl || movie.videoUrl || '').trim();
    if (!videoUrl || (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://') && !videoUrl.startsWith('/'))) {
      return res.status(400).json({
        error: 'INVALID_VIDEO_URL',
        message: `${epNum}-р ангийн видео холбоос (R2 MP4 URL) зөв оруулна уу.`
      });
    }

    const episode = await Storage.upsertEpisode(movie.id, {
      ...req.body,
      episodeNumber: epNum,
      videoUrl
    });

    await Storage.recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPSERT_EPISODE',
      target: `${movie.id}#ep${epNum}`,
      details: `Saved episode ${epNum} for "${movie.titleMn}"`
    });

    res.json({ success: true, episode, message: `${epNum}-р анги амжилттай хадгалагдлаа.` });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Анги хадгалахад алдаа гарлаа.');
  }
});

app.put('/api/admin/movies/:id/episodes/bulk', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const { id } = req.params;
    const movie = await Storage.getMovieById(id);
    if (!movie) {
      return res.status(404).json({ error: 'MOVIE_NOT_FOUND', message: 'Цуврал олдсонгүй.' });
    }

    const rawEpisodes = Array.isArray(req.body?.episodes) ? req.body.episodes : [];
    const totalEpisodes = Number(req.body?.totalEpisodes ?? movie.totalEpisodes ?? rawEpisodes.length);
    const freeEpisodes =
      req.body?.freeEpisodes !== undefined ? Number(req.body.freeEpisodes) : (movie.freeEpisodes ?? 6);

    const validation = validateEpisodesPayload(rawEpisodes);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'EPISODE_VALIDATION_ERROR',
        message: validation.error || 'Ангийн мэдээлэл буруу байна.'
      });
    }

    // Update series config if passed alongside bulk episodes
    if (
      req.body?.totalEpisodes !== undefined ||
      req.body?.freeEpisodes !== undefined ||
      req.body?.unlockPrice !== undefined ||
      req.body?.rentalDurationHours !== undefined ||
      req.body?.seriesStatus !== undefined
    ) {
      await Storage.updateMovie(movie.id, {
        type: 'series',
        totalEpisodes: Math.max(1, totalEpisodes),
        freeEpisodes: Math.max(0, freeEpisodes),
        unlockPrice:
          req.body?.unlockPrice !== undefined ? Number(req.body.unlockPrice) : (movie.unlockPrice ?? 4900),
        rentalDurationHours:
          req.body?.rentalDurationHours !== undefined
            ? Number(req.body.rentalDurationHours)
            : (movie.rentalDurationHours ?? 72),
        seriesStatus: req.body?.seriesStatus || movie.seriesStatus || 'completed'
      });
    }

    const savedEpisodes = await Storage.bulkSaveEpisodes(movie.id, rawEpisodes, freeEpisodes);

    await Storage.recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'BULK_SAVE_EPISODES',
      target: movie.id,
      details: `Bulk saved ${savedEpisodes.length} episodes for "${movie.titleMn}" (free=${freeEpisodes})`
    });

    res.json({
      success: true,
      episodes: savedEpisodes,
      message: `Нийт ${savedEpisodes.length} ангийн мэдээлэл амжилттай хадгалагдлаа.`
    });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Ангиудыг бөөнөөр хадгалахад алдаа гарлаа.');
  }
});

app.delete('/api/admin/movies/:id/episodes/:episodeId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const { id, episodeId } = req.params;
    const deleted = await Storage.deleteEpisode(id, episodeId);
    if (!deleted) {
      return res.status(404).json({ error: 'EPISODE_NOT_FOUND', message: 'Анги олдсонгүй.' });
    }

    await Storage.recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'DELETE_EPISODE',
      target: `${id}#${episodeId}`
    });

    res.json({ success: true, message: 'Анги устгагдлаа.' });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Анги устгахад алдаа гарлаа.');
  }
});

// 8. Category Management: List All
app.get('/api/admin/categories', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const categories = await Storage.getAllCategories();
    res.json({ success: true, categories });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

// 9. Category Management: Create
app.post('/api/admin/categories', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const parseResult = categorySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: parseResult.error.issues[0]?.message || 'Ангиллын мэдээллээ зөв оруулна уу.'
      });
    }

    const cat = await Storage.createCategory(parseResult.data);
    await Storage.recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'CREATE_CATEGORY',
      target: cat.id,
      details: `Created category: ${cat.nameMn} (${cat.nameEn})`
    });

    res.status(201).json({ success: true, category: cat, message: 'Ангилал амжилттай үүслээ.' });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

// 10. Category Management: Update
app.put('/api/admin/categories/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const { id } = req.params;
    const cat = await Storage.updateCategory(id, req.body);
    if (!cat) return res.status(404).json({ error: 'CATEGORY_NOT_FOUND', message: 'Ангилал олдсонгүй.' });

    await Storage.recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPDATE_CATEGORY',
      target: id,
      details: `Updated category: ${cat.nameMn}`
    });

    res.json({ success: true, category: cat, message: 'Ангилал шинэчлэгдлээ.' });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

// 11. Category Management: Delete
app.delete('/api/admin/categories/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const { id } = req.params;
    await Storage.deleteCategory(id);
    await Storage.recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'DELETE_CATEGORY',
      target: id
    });

    res.json({ success: true, message: 'Ангилал устгагдлаа.' });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

// 12. User Management: List All (Never leaks password hashes!)
app.get('/api/admin/users', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const users = await Storage.getAllUsers();
    const subs = await Storage.getAllSubscriptions();
    const subMap = new Map<string, any>();
    const now = new Date();
    for (const s of subs) {
      if (s.status === 'ACTIVE' && new Date(s.endDate).getTime() > now.getTime()) {
        subMap.set(s.userId, s);
      }
    }

    const sanitized = users.map((u) => {
      const activeSub = subMap.get(u.id!);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role || 'user',
        status: u.status || 'active',
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        subscription: activeSub ? { planId: activeSub.planId, endDate: activeSub.endDate } : null
      };
    });

    res.json({ success: true, users: sanitized });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

// 13. User Management: Change Role (Safeguards last admin!)
app.patch('/api/admin/users/:id/role', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const { id } = req.params;
    const { role } = req.body;

    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ error: 'INVALID_ROLE', message: 'Зөвхөн "user" эсвэл "admin" байж болно.' });
    }

    const updated = await Storage.setUserRole(id, role);
    await Storage.recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'CHANGE_USER_ROLE',
      target: id,
      details: `Changed role to: ${role} for user ${updated.email}`
    });

    res.json({
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        status: updated.status
      },
      message: 'Хэрэглэгчийн эрх амжилттай өөрчлөгдлөө.'
    });
  } catch (err: any) {
    return sendApiError(res, err, 'ROLE_UPDATE_FAILED', err?.message || 'Эрх өөрчлөхөд алдаа гарлаа.', 400);
  }
});

// 14. User Management: Change Status (Safeguards last admin!)
app.patch('/api/admin/users/:id/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'active' && status !== 'suspended') {
      return res.status(400).json({ error: 'INVALID_STATUS', message: 'Зөвхөн "active" эсвэл "suspended" байж болно.' });
    }

    const updated = await Storage.setUserStatus(id, status);
    await Storage.recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: status === 'suspended' ? 'SUSPEND_USER' : 'ACTIVATE_USER',
      target: id,
      details: `Changed status to: ${status} for user ${updated.email}`
    });

    res.json({
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        status: updated.status
      },
      message: 'Хэрэглэгчийн төлөв амжилттай шинэчлэгдлээ.'
    });
  } catch (err: any) {
    return sendApiError(res, err, 'STATUS_UPDATE_FAILED', err?.message || 'Төлөв өөрчлөхөд алдаа гарлаа.', 400);
  }
});

// 15. Payment Management: List All Payments + Approve / Reject Bank Transfers (Phase 3)
app.get('/api/admin/payments', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const payments = await Storage.getAllPayments();
    const users = await Storage.getAllUsers();
    const userMap = new Map(users.map((u) => [u.id!, u]));

    const enriched = payments.map((p) => {
      const u = userMap.get(p.userId);
      const plan = getPlanById(p.planId);
      return {
        ...p,
        userName: u?.name || p.userId,
        userEmail: u?.email || '',
        planName: plan?.nameMn || p.planId
      };
    });

    res.json({ success: true, payments: enriched });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

// Approve / Verify a pending bank transfer payment (Admin only)
const handleAdminApproveBankTransfer = async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const idOrOrderNumber = String(
      req.params.id || req.body?.orderNumber || req.body?.paymentId || req.body?.id || ''
    ).trim();

    if (!idOrOrderNumber) {
      return res.status(400).json({
        error: 'MISSING_PAYMENT_ID',
        message: 'Захиалгын дугаар эсвэл ID шаардлагатай.'
      });
    }

    const result = await Storage.approveBankTransferPayment({
      idOrOrderNumber,
      adminId: admin.id,
      adminEmail: admin.email
    });

    res.json({
      success: true,
      payment: result.payment,
      subscription: result.subscription,
      message: `Захиалга (${result.payment.orderNumber}) амжилттай баталгаажиж, гишүүнчлэл идэвхжлээ.`
    });
  } catch (err: any) {
    return sendApiError(res, err, 'APPROVE_FAILED', 'Захиалга баталгаажуулахад алдаа гарлаа.');
  }
};

app.post('/api/admin/payments/:id/approve', requireAdmin, handleAdminApproveBankTransfer);
app.post('/api/admin/payments/:id/verify', requireAdmin, handleAdminApproveBankTransfer);
app.post('/api/admin/payments/bank-transfer/verify', requireAdmin, handleAdminApproveBankTransfer);

// Reject a bank transfer payment (Admin only)
app.post('/api/admin/payments/:id/reject', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const { id } = req.params;
    const reason = req.body?.reason ? String(req.body.reason).trim() : undefined;

    const payment = await Storage.rejectBankTransferPayment({
      idOrOrderNumber: id,
      adminId: admin.id,
      adminEmail: admin.email,
      reason
    });

    res.json({
      success: true,
      payment,
      message: `Захиалга (${payment.orderNumber}) татгалзагдлаа.`
    });
  } catch (err: any) {
    return sendApiError(res, err, 'REJECT_FAILED', 'Захиалга татгалзахад алдаа гарлаа.');
  }
});

// 16. Subscription Management: List All Subscriptions
app.get('/api/admin/subscriptions', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const subscriptions = await Storage.getAllSubscriptions();
    const users = await Storage.getAllUsers();
    const userMap = new Map(users.map((u) => [u.id!, u]));

    const enriched = subscriptions.map((s) => {
      const u = userMap.get(s.userId);
      const plan = getPlanById(s.planId);
      const now = new Date();
      const end = new Date(s.endDate);
      const isActive = s.status === 'ACTIVE' && end.getTime() > now.getTime();
      return {
        ...s,
        userName: u?.name || s.userId,
        userEmail: u?.email || '',
        planName: plan?.nameMn || s.planId,
        isActive
      };
    });

    res.json({ success: true, subscriptions: enriched });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

// 17. Subscription Management: Admin Manual Adjustment (Creates Audit Log)
app.post('/api/admin/subscriptions/adjust', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const { userId, planId, durationDays = 30 } = req.body;

    if (!userId || !planId) {
      return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Хэрэглэгч болон багц сонгоно уу.' });
    }

    const sub = await Storage.adminAdjustSubscription({
      userId,
      planId,
      durationDays: Number(durationDays),
      adminId: admin.id,
      adminEmail: admin.email
    });

    res.json({ success: true, subscription: sub, message: 'Гишүүнчлэлийг амжилттай тохирууллаа.' });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

// 18. Audit Logs: List
app.get('/api/admin/audit-logs', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const logs = await Storage.getAuditLogs(100);
    res.json({ success: true, logs });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

// 19. Website Settings Admin Read & Update (Phase 7)
app.get('/api/admin/settings', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const settings = await Storage.getWebsiteSettings();
    res.json({
      success: true,
      settings,
      integrations: {
        wireConfigured: defaultWireService.isConfigured(),
        cloudinaryConfigured: isCloudinaryConfigured(),
        emailConfigured: isEmailServiceConfigured()
      }
    });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

app.put('/api/admin/settings', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const updated = await Storage.updateWebsiteSettings(req.body || {});
    await Storage.recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPDATE_WEBSITE_SETTINGS',
      target: 'global',
      details: `Updated website settings (${updated.siteName})`
    });
    res.json({
      success: true,
      settings: updated,
      message: 'Сайтын тохиргоо амжилттай хадгалагдлаа.'
    });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

// 20. Vercel-Compatible Cloud Image Upload via Cloudinary (Phase 5)
app.get('/api/admin/upload/config', requireAdmin, (_req: Request, res: Response) => {
  return res.json({
    configured: isCloudinaryConfigured(),
    provider: 'cloudinary',
    maxFileSizeMb: 5
  });
});

app.post('/api/admin/upload', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const { dataUrl, folder = 'sodon_ai_movie' } = req.body || {};

    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'INVALID_IMAGE', message: 'Зургийн өгөгдөл дутуу байна.' });
    }

    const matches = dataUrl.match(/^data:(image\/(jpeg|jpg|png|webp|gif));base64,(.+)$/i);
    if (!matches || matches.length !== 4) {
      return res.status(400).json({
        error: 'INVALID_MIME_TYPE',
        message: 'Зөвхөн JPG, PNG, WEBP, GIF форматын зураг оруулах боломжтой.'
      });
    }

    const buffer = Buffer.from(matches[3], 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        error: 'FILE_TOO_LARGE',
        message: 'Зургийн хэмжээ 5MB-аас хэтрэхгүй байх ёстой.'
      });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        error: 'CLOUDINARY_NOT_CONFIGURED',
        message:
          'Клауд зургийн хадгалах сервис (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) тохируулаагүй байна. Та зургийн URL холбоосыг шууд оруулна уу.'
      });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME!.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY!.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET!.trim();
    const timestamp = Math.floor(Date.now() / 1000);
    const safeFolder = String(folder).replace(/[^a-zA-Z0-9_-]/g, '') || 'sodon_ai_movie';

    const paramsToSign = `folder=${safeFolder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    const formPayload = new URLSearchParams();
    formPayload.set('file', dataUrl);
    formPayload.set('api_key', apiKey);
    formPayload.set('timestamp', String(timestamp));
    formPayload.set('folder', safeFolder);
    formPayload.set('signature', signature);

    const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formPayload.toString()
    });

    const cloudData: any = await cloudRes.json();
    if (!cloudRes.ok || !cloudData.secure_url) {
      console.error('[Admin/Upload] Cloudinary error:', cloudData);
      return res.status(502).json({
        error: 'CLOUD_UPLOAD_FAILED',
        message: cloudData?.error?.message || 'Клауд руу зураг хуулахад алдаа гарлаа.'
      });
    }

    await Storage.recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPLOAD_IMAGE',
      target: cloudData.public_id || cloudData.secure_url,
      details: `Uploaded image (${Math.round(buffer.length / 1024)} KB) to Cloudinary`
    });

    return res.json({
      success: true,
      url: cloudData.secure_url,
      publicId: cloudData.public_id,
      message: 'Зураг клауд серверт амжилттай хуулагдлаа.'
    });
  } catch (err: any) {
    console.error('[Admin/Upload] Error:', err);
    return sendApiError(res, err, 'UPLOAD_FAILED', err?.message || 'Зураг хуулахад алдаа гарлаа.', 500);
  }
});

app.get('/api/health', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');

  if (!isMongoUriConfigured()) {
    const dbStatus = getDatabaseStatus();
    return res.status(503).json({
      ok: false,
      service: 'ai-movie-api',
      error: 'DATABASE_NOT_CONFIGURED',
      message: 'MONGODB_URI is not configured.',
      database: dbStatus
    });
  }

  try {
    await connectDB();
  } catch (err: any) {
    const dbStatus = getDatabaseStatus();
    return res.status(503).json({
      ok: false,
      service: 'ai-movie-api',
      error: err?.code || 'DATABASE_UNAVAILABLE',
      message: err?.message || 'MongoDB connection failed',
      database: dbStatus
    });
  }

  const dbStatus = getDatabaseStatus();
  if (!dbStatus.connected || !isMongoActive()) {
    return res.status(503).json({
      ok: false,
      service: 'ai-movie-api',
      error: 'DATABASE_UNAVAILABLE',
      message: 'MongoDB is not connected.',
      database: dbStatus
    });
  }

  return res.json({
    ok: true,
    service: 'ai-movie-api',
    database: dbStatus
  });
});

// -------------------------------------------------------------
// 3. Subscription Info
// -------------------------------------------------------------
app.get('/api/subscription', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.json({ active: false, subscription: null });
    }

    const subscription = await Storage.getActiveSubscription(user.id);
    const plan = subscription ? getPlanById(subscription.planId) : null;

    let daysRemaining = 0;
    if (subscription) {
      const diff = new Date(subscription.endDate).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    res.json({
      active: Boolean(subscription),
      subscription: subscription
        ? {
            id: subscription.id,
            planId: subscription.planId,
            planName: plan?.nameMn || subscription.planId,
            status: subscription.status,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            daysRemaining,
            paymentId: subscription.paymentId,
            features: plan?.featuresMn || []
          }
        : null
    });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

// -------------------------------------------------------------
// Bank Transfer Details API
// GET /api/bank-details
// -------------------------------------------------------------
app.get('/api/bank-details', (_req: Request, res: Response) => {
  res.json({ bankDetails: BANK_TRANSFER_DETAILS });
});

// -------------------------------------------------------------
// 3b. 18+ Age Verification Endpoints (Hot+ / 18+ Gate)
// -------------------------------------------------------------
app.get('/api/age-verification/status', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  const verified = isRequestAgeVerified(req);
  const existingToken =
    readCookie(req, AGE_VERIFIED_COOKIE) || (req.get('x-age-verified-token') || '').trim() || null;
  res.json({
    verified,
    token: verified ? existingToken : null
  });
});

app.post('/api/age-verification/confirm', (req: Request, res: Response) => {
  const confirmed = req.body?.confirmed !== false;
  if (!confirmed) {
    return res.status(400).json({
      verified: false,
      error: 'CONFIRMATION_REQUIRED',
      message: 'Та 18 нас хүрсэн гэдгээ баталгаажуулах шаардлагатай.'
    });
  }

  const maxAgeSeconds = 24 * 60 * 60; // 24 hours
  const { token, expiresAt } = createSessionToken('age_verified_18plus', maxAgeSeconds);
  const secure = isProduction ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${AGE_VERIFIED_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`
  );
  res.json({
    success: true,
    verified: true,
    token,
    expiresAt
  });
});

app.post('/api/age-verification/revoke', (_req: Request, res: Response) => {
  const secure = isProduction ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${AGE_VERIFIED_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
  );
  res.json({
    success: true,
    verified: false
  });
});

// -------------------------------------------------------------
// 4. Payment Creation (Step 1-4)
// POST /api/payments/create
// -------------------------------------------------------------
app.post('/api/payments/create', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({
        error: 'AUTH_REQUIRED',
        message: 'Төлбөр төлөхийн тулд эхлээд системд нэвтэрнэ үү.'
      });
    }
    const { planId, paymentMethod = 'wire_qpay' } = req.body;

    if (!planId || !isValidPlanId(planId)) {
      return res.status(400).json({
        error: 'INVALID_PLAN',
        message: 'Хүчингүй гишүүнчлэлийн багц сонгогдсон байна.'
      });
    }

    const plan = SUBSCRIPTION_PLANS[planId];
    const settings = await Storage.getWebsiteSettings();
    const configuredPrice = settings?.subscriptionPrices?.[planId as 'basic' | 'standard' | 'premium'];
    // Rule: Amount must come strictly from server-side configuration. Never trust client prices!
    const serverAmount = typeof configuredPrice === 'number' && configuredPrice > 0 ? configuredPrice : plan.price;
    const currency = 'MNT';

    const orderNumber = `AIMOV-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const idempotencyKey = `order_${orderNumber}_pi`;

    const baseUrl = getBaseUrl(req);
    const successUrl = `${baseUrl}/payment/success?order=${orderNumber}`;
    const cancelUrl = `${baseUrl}/payment/cancel?order=${orderNumber}`;

    let wirePaymentIntentId = `pi_aimov_${orderNumber}`;
    let wireCheckoutSessionId = `cs_aimov_${orderNumber}`;
    let checkoutUrl = `${baseUrl}/checkout/${orderNumber}`;

    // Only invoke Wire API for wire_qpay payments
    if (paymentMethod === 'wire_qpay' && defaultWireService.isConfigured()) {
      const paymentIntent = await defaultWireService.createPaymentIntent({
        amount: serverAmount,
        currency: 'MNT',
        description: `AI MOVIE ${plan.name} Monthly Subscription`,
        metadata: {
          order_id: orderNumber,
          user_id: user.id,
          plan_id: plan.id
        },
        idempotencyKey
      });

      wirePaymentIntentId = paymentIntent.id;

      const checkoutSession = await defaultWireService.createCheckoutSession({
        payment_intent: paymentIntent.id,
        success_url: successUrl,
        cancel_url: cancelUrl,
        idempotencyKey: `order_${orderNumber}_cs`
      });

      wireCheckoutSessionId = checkoutSession.id;
      checkoutUrl = checkoutSession.url;
    } else if (paymentMethod === 'bank_transfer') {
      wirePaymentIntentId = `bank_transfer_${orderNumber}`;
    }

    const payment = await Storage.createPayment({
      userId: user.id,
      orderNumber,
      planId: plan.id,
      paymentMethod,
      wirePaymentIntentId,
      wireCheckoutSessionId: paymentMethod === 'wire_qpay' ? wireCheckoutSessionId : undefined,
      amount: serverAmount,
      currency,
      status: 'PENDING',
      checkoutUrl
    });

    res.json({
      success: true,
      orderNumber: payment.orderNumber,
      paymentMethod,
      checkoutUrl,
      paymentIntentId: wirePaymentIntentId,
      checkoutSessionId: wireCheckoutSessionId,
      amount: serverAmount,
      currency,
      bankTransferDetails: BANK_TRANSFER_DETAILS,
      plan: {
        id: plan.id,
        nameMn: plan.nameMn,
        price: serverAmount
      }
    });
  } catch (error: any) {
    console.error('[Payments/Create] Error:', error);
    return sendApiError(res, error, 'PAYMENT_CREATION_FAILED', error?.message || 'Төлбөрийн захиалга үүсгэхэд алдаа гарлаа.');
  }
});

// -------------------------------------------------------------
// 4b. Series Rental / All-Episodes Unlock Payment Creation
// POST /api/payments/create-rental
// -------------------------------------------------------------
app.post('/api/payments/create-rental', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({
        error: 'AUTH_REQUIRED',
        message: 'Цуврал түрээслэх эсвэл нээхийн тулд эхлээд системд нэвтэрнэ үү.'
      });
    }

    const { seriesId, paymentMethod = 'wire_qpay', accessType = 'rental' } = req.body || {};
    if (!seriesId) {
      return res.status(400).json({
        error: 'MISSING_SERIES_ID',
        message: 'Цувралын ID шаардлагатай.'
      });
    }

    const movie = await Storage.getMovieById(String(seriesId));
    if (!movie) {
      return res.status(404).json({
        error: 'MOVIE_NOT_FOUND',
        message: 'Цуврал олдсонгүй.'
      });
    }

    const serverAmount = Math.max(500, Number(movie.unlockPrice) || 4900);
    const rentalDurationHours = Math.max(1, Number(movie.rentalDurationHours) || 72);
    const currency = 'MNT';

    const orderNumber = `AIRENT-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const idempotencyKey = `order_${orderNumber}_pi`;
    const baseUrl = getBaseUrl(req);
    const successUrl = `${baseUrl}/payment/success?order=${orderNumber}`;
    const cancelUrl = `${baseUrl}/payment/cancel?order=${orderNumber}`;

    let wirePaymentIntentId = `pi_airent_${orderNumber}`;
    let wireCheckoutSessionId = `cs_airent_${orderNumber}`;
    let checkoutUrl = `${baseUrl}/checkout/${orderNumber}`;

    if (paymentMethod === 'wire_qpay' && defaultWireService.isConfigured()) {
      const paymentIntent = await defaultWireService.createPaymentIntent({
        amount: serverAmount,
        currency: 'MNT',
        description: `AI MOVIE Series Unlock: ${movie.titleEn || movie.titleMn} (${rentalDurationHours}h)`,
        metadata: {
          order_id: orderNumber,
          user_id: user.id,
          plan_id: `series_${movie.id}`
        },
        idempotencyKey
      });

      wirePaymentIntentId = paymentIntent.id;

      const checkoutSession = await defaultWireService.createCheckoutSession({
        payment_intent: paymentIntent.id,
        success_url: successUrl,
        cancel_url: cancelUrl,
        idempotencyKey: `order_${orderNumber}_cs`
      });

      wireCheckoutSessionId = checkoutSession.id;
      checkoutUrl = checkoutSession.url;
    } else if (paymentMethod === 'bank_transfer') {
      wirePaymentIntentId = `bank_transfer_${orderNumber}`;
    }

    const payment = await Storage.createPayment({
      userId: user.id,
      orderNumber,
      planId: `series_${movie.id}`,
      seriesId: movie.id,
      accessType: accessType === 'permanent' ? 'permanent' : 'rental',
      rentalDurationHours,
      paymentMethod,
      wirePaymentIntentId,
      wireCheckoutSessionId: paymentMethod === 'wire_qpay' ? wireCheckoutSessionId : undefined,
      amount: serverAmount,
      currency,
      status: 'PENDING',
      checkoutUrl
    });

    res.json({
      success: true,
      orderNumber: payment.orderNumber,
      seriesId: movie.id,
      accessType: payment.accessType,
      rentalDurationHours,
      paymentMethod,
      checkoutUrl,
      paymentIntentId: wirePaymentIntentId,
      checkoutSessionId: wireCheckoutSessionId,
      amount: serverAmount,
      currency,
      bankTransferDetails: BANK_TRANSFER_DETAILS,
      series: {
        id: movie.id,
        titleMn: movie.titleMn,
        titleEn: movie.titleEn,
        price: serverAmount,
        rentalDurationHours
      }
    });
  } catch (error: any) {
    console.error('[Payments/CreateRental] Error:', error);
    return sendApiError(res, error, 'RENTAL_CREATION_FAILED', error?.message || 'Түрээсийн захиалга үүсгэхэд алдаа гарлаа.');
  }
});

// -------------------------------------------------------------
// Bank Transfer Submission (Phase 3 Security Fix)
// POST /api/payments/bank-transfer/confirm
// Users CANNOT self-approve bank transfers to PAID or activate subscriptions!
// Sets status to PENDING_REVIEW until verified by an Administrator.
// -------------------------------------------------------------
app.post('/api/payments/bank-transfer/confirm', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Нэвтэрч орно уу.' });
    }
    const { orderNumber, senderName, transferRef, phone } = req.body || {};

    if (!orderNumber) {
      return res.status(400).json({ error: 'MISSING_ORDER_NUMBER', message: 'orderNumber шаардлагатай.' });
    }

    // Security rule: Bank transfer submission places order into PENDING_REVIEW.
    // It MUST NOT mark payment PAID or activate subscription until explicit admin verification!
    const updated = await Storage.submitBankTransferForReview({
      orderNumber: String(orderNumber),
      userId: user.id,
      senderName: senderName ? String(senderName) : undefined,
      phone: phone ? String(phone) : undefined,
      transferRef: transferRef ? String(transferRef) : undefined,
      fallbackUserName: user.name
    });

    console.log(
      `[BankTransfer] Order ${updated.orderNumber} submitted by user ${updated.userId} for admin review (status=${updated.status}).`
    );

    res.json({
      success: true,
      message:
        'Дансны шилжүүлгийн мэдээлэл хүлээн авагдлаа. Администратор гүйлгээг шалгасны дараа таны гишүүнчлэл идэвхжинэ.',
      orderNumber: updated.orderNumber,
      planId: updated.planId,
      status: updated.status,
      payment: updated
    });
  } catch (error: any) {
    console.error('[BankTransfer/Confirm] Error:', error);
    return sendApiError(res, error, 'SERVER_ERROR', 'Баталгаажуулахад алдаа гарлаа.');
  }
});

// -------------------------------------------------------------
// 5. Payment History (MUST be before :orderId route)
// GET /api/payments/history
// -------------------------------------------------------------
app.get('/api/payments/history', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.json({ payments: [] });
    }
    const payments = await Storage.getPaymentsByUserId(user.id);

    const formatted = payments.map((p) => {
      const plan = getPlanById(p.planId);
      return {
        id: p.id,
        orderNumber: p.orderNumber,
        planId: p.planId,
        planName: plan?.nameMn || p.planId,
        paymentMethod: p.paymentMethod || 'wire_qpay',
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        wirePaymentIntentId: p.wirePaymentIntentId,
        bankSenderName: p.bankSenderName,
        bankTransferRef: p.bankTransferRef,
        rejectionReason: p.rejectionReason,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
        verifiedAt: p.verifiedAt
      };
    });

    res.json({ payments: formatted });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

// -------------------------------------------------------------
// 6. Get Payment by Order ID
// GET /api/payments/:orderId
// -------------------------------------------------------------
app.get('/api/payments/:orderId', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    const { orderId } = req.params;

    const payment = await Storage.getPaymentByOrderNumber(orderId);
    if (!payment) {
      return res.status(404).json({
        error: 'ORDER_NOT_FOUND',
        message: 'Төлбөрийн захиалга олдсонгүй.'
      });
    }

    // Verify ownership if user is logged in (admins can also inspect)
    if (user && user.role !== 'admin' && payment.userId && payment.userId !== user.id) {
      return res.status(403).json({
        error: 'UNAUTHORIZED_ORDER_ACCESS',
        message: 'Энэ захиалгын мэдээлэлд хандах эрхгүй байна.'
      });
    }

    // If PENDING and Wire is configured, query Wire to check for updates (only for wire_qpay)
    if (
      payment.status === 'PENDING' &&
      payment.paymentMethod === 'wire_qpay' &&
      defaultWireService.isConfigured() &&
      payment.wirePaymentIntentId &&
      !payment.wirePaymentIntentId.startsWith('bank_')
    ) {
      try {
        const wirePi = await defaultWireService.getPaymentIntent(payment.wirePaymentIntentId);
        if (wirePi.status === 'succeeded') {
          if (wirePi.amount === payment.amount && wirePi.currency === 'MNT') {
            await Storage.updatePaymentStatus(payment.orderNumber, 'PAID', {
              paidAt: new Date(),
              wireChargeId: wirePi.charges?.data?.[0]?.id
            });
            if (payment.seriesId) {
              const hours = payment.rentalDurationHours || 72;
              await Storage.recordSeriesPurchase({
                userId: payment.userId,
                seriesId: payment.seriesId,
                accessType: payment.accessType === 'permanent' ? 'permanent' : 'rental',
                amount: payment.amount,
                currency: payment.currency || 'MNT',
                paymentId: payment.orderNumber,
                orderNumber: payment.orderNumber,
                status: 'ACTIVE',
                purchasedAt: new Date(),
                expiresAt:
                  payment.accessType === 'permanent'
                    ? null
                    : new Date(Date.now() + hours * 3600 * 1000)
              });
            } else {
              await Storage.activateSubscription({
                userId: payment.userId,
                planId: payment.planId,
                paymentId: payment.orderNumber,
                durationDays: 30
              });
            }
            payment.status = 'PAID';
            payment.paidAt = new Date();
          }
        } else if (wirePi.status === 'canceled') {
          await Storage.updatePaymentStatus(payment.orderNumber, 'EXPIRED');
          payment.status = 'EXPIRED';
        }
      } catch (err) {
        console.warn('[Payments/Status] Wire API status check warning:', (err as Error).message);
      }
    }

    const plan = getPlanById(payment.planId);

    res.json({
      id: payment.id,
      orderNumber: payment.orderNumber,
      status: payment.status,
      paymentMethod: payment.paymentMethod || 'wire_qpay',
      amount: payment.amount,
      currency: payment.currency,
      planId: payment.planId,
      planName: plan?.nameMn || payment.planId,
      checkoutUrl: payment.checkoutUrl,
      bankSenderName: payment.bankSenderName,
      bankTransferRef: payment.bankTransferRef,
      rejectionReason: payment.rejectionReason,
      bankTransferDetails: BANK_TRANSFER_DETAILS,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt,
      verifiedAt: payment.verifiedAt
    });
  } catch (error: any) {
    console.error('[Payments/Get] Error:', error);
    return sendApiError(res, error, 'SERVER_ERROR', 'Захиалгын мэдээлэл авахад алдаа гарлаа.');
  }
});

// -------------------------------------------------------------
// 7. Webhook Endpoint
// POST /api/webhooks/wire
// -------------------------------------------------------------
app.post('/api/webhooks/wire', async (req: Request, res: Response) => {
  const signatureHeader = req.headers['wirepayment-signature'] as string;
  const rawBody = req.body; // Buffer from express.raw()

  if (!rawBody || (Buffer.isBuffer(rawBody) && rawBody.length === 0)) {
    return res.status(400).json({ error: 'Empty webhook body' });
  }

  if (!signatureHeader) {
    return res.status(400).json({ error: 'Missing WirePayment-Signature header' });
  }

  // 1. Verify HMAC Signature and 5-minute timestamp tolerance
  try {
    defaultWireService.verifyWebhookSignature({
      rawBody,
      signatureHeader,
      toleranceSeconds: 300
    });
  } catch (sigErr: any) {
    console.error('[Webhook/Wire] Signature verification rejected:', sigErr.message);
    return res.status(400).json({ error: 'INVALID_SIGNATURE', message: sigErr.message });
  }

  // 2. Parse payload safely
  let event: any;
  try {
    const rawString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : (rawBody as string);
    event = JSON.parse(rawString);
  } catch (parseErr: any) {
    return res.status(400).json({ error: 'INVALID_JSON', message: 'Failed to parse webhook JSON' });
  }

  const eventId = event.id;
  const eventType = event.type;

  if (!eventId) {
    return res.status(400).json({ error: 'MISSING_EVENT_ID' });
  }

  try {
    // 3. Deduplication check
    const alreadyProcessed = await Storage.hasProcessedWebhookEvent(eventId);
    if (alreadyProcessed) {
      console.log(`[Webhook/Wire] Event ${eventId} was already processed, returning 200 OK.`);
      return res.status(200).json({ received: true, deduplicated: true });
    }

    // 4. Handle payment_intent.succeeded
    if (eventType === 'payment_intent.succeeded') {
      const paymentIntentData = event.data?.object;
      const paymentIntentId = paymentIntentData?.id;

      if (!paymentIntentId) {
        return res.status(400).json({ error: 'MISSING_PAYMENT_INTENT_ID' });
      }

      const order = await Storage.getPaymentByIntentId(paymentIntentId);
      if (!order) {
        console.warn(`[Webhook/Wire] Order not found for PaymentIntent ${paymentIntentId}`);
        await Storage.recordWebhookEvent({
          eventId,
          eventType,
          paymentIntentId,
          processed: true,
          payloadSummary: 'Order not found in DB'
        });
        return res.status(200).json({ received: true, warning: 'Order not found' });
      }

      if (order.status === 'PAID') {
        console.log(`[Webhook/Wire] Order ${order.orderNumber} already fulfilled.`);
        await Storage.recordWebhookEvent({
          eventId,
          eventType,
          paymentIntentId,
          processed: true
        });
        return res.status(200).json({ received: true, note: 'Already fulfilled' });
      }

      let verifiedIntent: any = paymentIntentData;
      if (defaultWireService.isConfigured()) {
        try {
          verifiedIntent = await defaultWireService.getPaymentIntent(paymentIntentId);
        } catch (wireErr: any) {
          console.error(`[Webhook/Wire] Failed to verify intent ${paymentIntentId} with Wire API:`, wireErr.message);
          return res.status(502).json({ error: 'WIRE_API_VERIFICATION_FAILED' });
        }
      }

      if (verifiedIntent.status !== 'succeeded') {
        console.warn(`[Webhook/Wire] Verified intent status is '${verifiedIntent.status}', not 'succeeded'`);
        return res.status(400).json({ error: 'INTENT_NOT_SUCCEEDED' });
      }

      if (verifiedIntent.amount !== order.amount) {
        console.error(
          `[Webhook/Wire] Amount mismatch! Expected ${order.amount} MNT, got ${verifiedIntent.amount} MNT`
        );
        return res.status(400).json({ error: 'AMOUNT_MISMATCH' });
      }

      if (verifiedIntent.currency !== 'MNT') {
        console.error(`[Webhook/Wire] Currency mismatch! Expected MNT, got ${verifiedIntent.currency}`);
        return res.status(400).json({ error: 'CURRENCY_MISMATCH' });
      }

      const chargeId = verifiedIntent.charges?.data?.[0]?.id;
      await Storage.updatePaymentStatus(order.orderNumber, 'PAID', {
        paidAt: new Date(),
        wireChargeId: chargeId
      });

      if (order.seriesId) {
        const hours = order.rentalDurationHours || 72;
        await Storage.recordSeriesPurchase({
          userId: order.userId,
          seriesId: order.seriesId,
          accessType: order.accessType === 'permanent' ? 'permanent' : 'rental',
          amount: order.amount,
          currency: order.currency || 'MNT',
          paymentId: order.orderNumber,
          orderNumber: order.orderNumber,
          status: 'ACTIVE',
          purchasedAt: new Date(),
          expiresAt:
            order.accessType === 'permanent'
              ? null
              : new Date(Date.now() + hours * 3600 * 1000)
        });
      } else {
        await Storage.activateSubscription({
          userId: order.userId,
          planId: order.planId,
          paymentId: order.orderNumber,
          durationDays: 30
        });
      }

      await Storage.recordWebhookEvent({
        eventId,
        eventType,
        paymentIntentId,
        processed: true
      });

      console.log(
        `[Webhook/Wire] Successfully processed payment_intent.succeeded for order ${order.orderNumber}, activated plan ${order.planId} for user ${order.userId}`
      );
      return res.status(200).json({ success: true, orderNumber: order.orderNumber, planId: order.planId });
    }

    await Storage.recordWebhookEvent({
      eventId,
      eventType,
      paymentIntentId: event.data?.object?.id || 'unknown',
      processed: true
    });

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('[Webhook/Wire] Database or processing error:', err);
    return sendApiError(res, err, 'WEBHOOK_PROCESSING_FAILED', err?.message || 'Webhook боловсруулахад алдаа гарлаа.', 500);
  }
});

// -------------------------------------------------------------
// 8. Movies & Protected Streaming (Phase 2 & Phase 4)
// -------------------------------------------------------------
app.get('/api/movies', async (req: Request, res: Response) => {
  try {
    const search = req.query.search ? String(req.query.search) : undefined;
    const genre = req.query.genre ? String(req.query.genre) : undefined;
    const featuredOnly = req.query.featured === 'true';

    const list = await Storage.getAllMovies({
      publishedOnly: true,
      featuredOnly,
      search,
      genre
    });

    const user = await getAuthenticatedUser(req);
    const ageVerified = isRequestAgeVerified(req);
    const filteredList = filterMoviesForAgeGate(list as any[], ageVerified, user?.role);

    const publicList = filteredList.map((m) => {
      const { videoSource, videoUrl, ...rest } = m as any;
      return {
        ...rest,
        posterUrl: resolveSafePosterUrl(rest.posterUrl, rest.id)
      };
    });

    res.json({ movies: publicList, ageVerified });
  } catch (err: any) {
    console.error('[API/Movies] Error:', err);
    return sendApiError(res, err, 'MOVIES_FETCH_FAILED', err?.message || 'Киноны жагсаалт ачаалахад алдаа гарлаа.');
  }
});

// Real-time debounced movie title search suggestions endpoint
app.get('/api/movies/suggestions', async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q ?? req.query.search ?? '').trim();
    const limitParam = parseInt(String(req.query.limit || '6'), 10);
    const limit = Number.isFinite(limitParam) ? Math.min(10, Math.max(1, limitParam)) : 6;

    if (!query) {
      return res.json({ query: '', suggestions: [] });
    }

    const list = await Storage.getAllMovies({
      publishedOnly: true,
      search: query
    });

    const user = await getAuthenticatedUser(req);
    const ageVerified = isRequestAgeVerified(req);
    const safeList = filterMoviesForAgeGate(list as any[], ageVerified, user?.role);

    const ranked = getMovieTitleSuggestions(safeList as any, query, limit).map((m) => {
      const { videoSource, videoUrl, ...rest } = m as any;
      return {
        ...rest,
        posterUrl: resolveSafePosterUrl(rest.posterUrl, rest.id)
      };
    });

    return res.json({
      query,
      suggestions: ranked
    });
  } catch (err: any) {
    console.error('[API/Movies/Suggestions] Error:', err);
    return sendApiError(res, err, 'SUGGESTIONS_FETCH_FAILED', err?.message || 'Хайлтын санал ачаалахад алдаа гарлаа.');
  }
});

app.get('/api/movies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const movie = await Storage.getMovieById(id);
    const user = await getAuthenticatedUser(req);

    if (!movie || (!movie.published && user?.role !== 'admin')) {
      return res.status(404).json({ error: 'MOVIE_NOT_FOUND', message: 'Кино олдсонгүй.' });
    }

    if (isAdultRestrictedMovie(movie as any) && !isRequestAgeVerified(req) && user?.role !== 'admin') {
      return res.status(403).json({
        error: 'AGE_VERIFICATION_REQUIRED',
        message: 'Энэ хэсэгт зөвхөн 18 нас хүрсэн хэрэглэгч үзэх боломжтой контент байрлана.'
      });
    }

    const { videoSource, videoUrl, ...publicMovie } = movie as any;
    return res.json({
      movie: {
        ...publicMovie,
        posterUrl: resolveSafePosterUrl(publicMovie.posterUrl, publicMovie.id)
      }
    });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

// Stream endpoint with centralized server-side subscription & plan tier hierarchy check (Phase 4)
app.get('/api/movies/:id/stream', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const movie = await Storage.getMovieById(id);

    if (!movie || !movie.published) {
      const userCheck = await getAuthenticatedUser(req);
      if (!movie || (userCheck?.role !== 'admin' && !movie.published)) {
        return res.status(404).json({ error: 'MOVIE_NOT_FOUND', message: 'Кино олдсонгүй.' });
      }
    }

    const user = await getAuthenticatedUser(req);
    if (isAdultRestrictedMovie(movie as any) && !isRequestAgeVerified(req) && user?.role !== 'admin') {
      return res.status(403).json({
        error: 'AGE_VERIFICATION_REQUIRED',
        message: 'Энэ киног үзэхийн тулд 18 нас хүрсэн гэдгээ баталгаажуулах шаардлагатай.'
      });
    }

    const activeSub = user ? await Storage.getActiveSubscription(user.id) : null;

    const access = checkMovieAccess({
      movie,
      user,
      subscription: activeSub
    });

    if (!access.allowed) {
      const statusCode = access.code === 'AUTH_REQUIRED' ? 401 : 403;
      return res.status(statusCode).json({
        error: access.code || 'PREMIUM_REQUIRED',
        message: access.messageMn || 'Энэ киног үзэхийн тулд идэвхтэй гишүүнчлэл шаардлагатай.',
        messageEn: access.messageEn,
        requiresPlan: access.requiredPlan || movie.minPlan,
        currentPlan: access.currentPlan || null
      });
    }

    // Increment views count asynchronously
    Storage.incrementMovieViews(movie.id).catch(() => {});

    // Create signed token with 2 hour expiration
    const userId = user ? user.id : 'guest';
    const expiresAt = Date.now() + 2 * 60 * 60 * 1000;
    const tokenSecret = getAuthSecret();
    const tokenPayload = `${movie.id}:${userId}:${expiresAt}`;
    const signedToken = crypto.createHmac('sha256', tokenSecret).update(tokenPayload).digest('hex');

    res.json({
      authorized: true,
      movieId: movie.id,
      titleMn: movie.titleMn || movie.title?.mn,
      quality: movie.quality,
      streamUrl: movie.videoUrl || movie.videoSource,
      expiresAt,
      token: signedToken
    });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

// -------------------------------------------------------------
// 8b. Public Series Episodes List & Server-Verified Episode Stream
// -------------------------------------------------------------
app.get('/api/movies/:id/episodes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const movie = await Storage.getMovieById(id);
    if (!movie) {
      return res.status(404).json({ error: 'MOVIE_NOT_FOUND', message: 'Цуврал олдсонгүй.' });
    }

    const user = await getAuthenticatedUser(req);
    if (isAdultRestrictedMovie(movie as any) && !isRequestAgeVerified(req) && user?.role !== 'admin') {
      return res.status(403).json({
        error: 'AGE_VERIFICATION_REQUIRED',
        message: 'Энэ хэсэгт зөвхөн 18 нас хүрсэн хэрэглэгч үзэх боломжтой контент байрлана.'
      });
    }

    const episodes = await Storage.getEpisodesBySeriesId(movie.id, true);
    const activePurchase = user ? await Storage.getActiveSeriesPurchase(user.id, movie.id) : null;
    const activeSub = user ? await Storage.getActiveSubscription(user.id) : null;
    const progressList = user ? await Storage.getUserPlaybackProgress(user.id, movie.id) : [];

    // Strip raw videoUrl from public listing for locked episodes
    const sanitizedEpisodes = episodes.map((ep) => {
      const allowed = canAccessEpisode({
        episodeNumber: ep.episodeNumber,
        freeEpisodes: movie.freeEpisodes ?? 6,
        episodeIsFree: ep.isFree,
        hasActiveVip: Boolean(activeSub && activeSub.status === 'ACTIVE'),
        vipEnabled: movie.vipEnabled !== false,
        hasActiveSeriesPurchase: Boolean(activePurchase),
        userRole: user?.role
      });

      return {
        id: ep.id,
        seriesId: ep.seriesId,
        episodeNumber: ep.episodeNumber,
        title: ep.title,
        titleEn: ep.titleEn,
        duration: ep.duration,
        thumbnailUrl: ep.thumbnailUrl || movie.posterUrl,
        subtitleUrlMn: ep.subtitleUrlMn,
        isFree: ep.isFree,
        unlocked: allowed
      };
    });

    res.json({
      success: true,
      seriesId: movie.id,
      totalEpisodes: movie.totalEpisodes || sanitizedEpisodes.length,
      freeEpisodes: movie.freeEpisodes ?? 6,
      unlockPrice: movie.unlockPrice ?? 4900,
      rentalDurationHours: movie.rentalDurationHours ?? 72,
      vipEnabled: movie.vipEnabled !== false,
      purchase: activePurchase,
      hasActiveVip: Boolean(activeSub && activeSub.status === 'ACTIVE'),
      episodeProgress: progressList,
      episodes: sanitizedEpisodes
    });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Ангиудын мэдээлэл ачаалахад алдаа гарлаа.');
  }
});

app.get('/api/movies/:id/episodes/:episodeNumber/stream', async (req: Request, res: Response) => {
  try {
    const { id, episodeNumber } = req.params;
    const epNum = Math.max(1, Math.floor(Number(episodeNumber) || 1));
    const movie = await Storage.getMovieById(id);

    if (!movie) {
      return res.status(404).json({ error: 'MOVIE_NOT_FOUND', message: 'Цуврал олдсонгүй.' });
    }

    const episodes = await Storage.getEpisodesBySeriesId(movie.id, false);
    const targetEpisode = episodes.find((e) => e.episodeNumber === epNum);

    const user = await getAuthenticatedUser(req);
    if (isAdultRestrictedMovie(movie as any) && !isRequestAgeVerified(req) && user?.role !== 'admin') {
      return res.status(403).json({
        error: 'AGE_VERIFICATION_REQUIRED',
        message: 'Энэ ангийг үзэхийн тулд 18 нас хүрсэн гэдгээ баталгаажуулах шаардлагатай.'
      });
    }

    const activeSub = user ? await Storage.getActiveSubscription(user.id) : null;
    const activePurchase = user ? await Storage.getActiveSeriesPurchase(user.id, movie.id) : null;

    const allowed = canAccessEpisode({
      episodeNumber: epNum,
      freeEpisodes: movie.freeEpisodes ?? 6,
      episodeIsFree: targetEpisode?.isFree,
      hasActiveVip: Boolean(activeSub && activeSub.status === 'ACTIVE'),
      vipEnabled: movie.vipEnabled !== false,
      hasActiveSeriesPurchase: Boolean(activePurchase),
      userRole: user?.role
    });

    if (!allowed) {
      return res.status(403).json({
        authorized: false,
        error: 'EPISODE_LOCKED',
        episodeNumber: epNum,
        freeEpisodes: movie.freeEpisodes ?? 6,
        paidStartingEpisode: (movie.freeEpisodes ?? 6) + 1,
        unlockPrice: movie.unlockPrice ?? 4900,
        rentalDurationHours: movie.rentalDurationHours ?? 72,
        vipEnabled: movie.vipEnabled !== false,
        message: `${epNum}-р анги түгжээтэй байна. Эхний ${movie.freeEpisodes ?? 6} анги үнэгүй. Цааш бүх ангийг ${(movie.unlockPrice ?? 4900).toLocaleString()}₮-өөр ${movie.rentalDurationHours ?? 72} цаг түрээслэх эсвэл VIP багцаар хязгааргүй үзээрэй.`
      });
    }

    Storage.incrementMovieViews(movie.id).catch(() => {});

    const userId = user ? user.id : 'guest';
    const expiresAt = Date.now() + 2 * 60 * 60 * 1000;
    const tokenSecret = getAuthSecret();
    const tokenPayload = `${movie.id}:ep${epNum}:${userId}:${expiresAt}`;
    const signedToken = crypto.createHmac('sha256', tokenSecret).update(tokenPayload).digest('hex');

    const streamUrl = targetEpisode?.videoUrl || movie.videoUrl || movie.videoSource;

    res.json({
      authorized: true,
      movieId: movie.id,
      episodeNumber: epNum,
      episodeTitle: targetEpisode?.title || `${epNum}-р анги`,
      duration: targetEpisode?.duration || '2 мин',
      subtitleUrlMn: targetEpisode?.subtitleUrlMn || '',
      quality: movie.quality || '1080p Full HD',
      streamUrl,
      expiresAt,
      token: signedToken
    });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Анги тоглуулахад алдаа гарлаа.');
  }
});

// -------------------------------------------------------------
// 8c. User Series Purchases & Playback Progress APIs
// -------------------------------------------------------------
app.get('/api/purchases/series', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.json({ purchases: [] });
    }
    const purchases = await Storage.getUserSeriesPurchases(user.id);
    res.json({ purchases });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

app.get('/api/watch-progress', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.json({ progress: [] });
    }
    const movieId = req.query.movieId ? String(req.query.movieId) : undefined;
    const progress = await Storage.getUserPlaybackProgress(user.id, movieId);
    res.json({ progress });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

app.post('/api/watch-progress', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Нэвтэрч орно уу.' });
    }
    const { movieId, episodeNumber = 1, currentTime = 0, duration = 0, completed } = req.body || {};
    if (!movieId) {
      return res.status(400).json({ error: 'MISSING_MOVIE_ID', message: 'movieId шаардлагатай.' });
    }
    const item = await Storage.saveUserPlaybackProgress({
      userId: user.id,
      movieId: String(movieId),
      episodeNumber: Number(episodeNumber) || 1,
      currentTime: Number(currentTime) || 0,
      duration: Number(duration) || 0,
      completed: completed !== undefined ? Boolean(completed) : false
    });
    res.json({ success: true, progress: item });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

// -------------------------------------------------------------
// 9. Integration Test Simulation Endpoint (Disabled in Production)
// -------------------------------------------------------------
app.post('/api/test/simulate-wire-payment', async (req: Request, res: Response) => {
  if (isProduction) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Payment simulation is disabled in production.' });
  }
  try {
    const { orderNumber } = req.body;
    if (!orderNumber) {
      return res.status(400).json({ error: 'orderNumber is required' });
    }

    const order = await Storage.getPaymentByOrderNumber(orderNumber);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const testSecret = process.env.WIRE_WEBHOOK_SECRET || 'whsec_test_simulation_secret';
    const wireService = new WireService(process.env.WIRE_API_KEY, testSecret);

    const eventId = `evt_sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = Math.floor(Date.now() / 1000);

    const payloadObj = {
      id: eventId,
      type: 'payment_intent.succeeded',
      created: now,
      data: {
        object: {
          id: order.wirePaymentIntentId,
          amount: order.amount,
          currency: 'MNT',
          status: 'succeeded',
          metadata: {
            order_id: order.orderNumber,
            user_id: order.userId,
            plan_id: order.planId
          },
          charges: {
            data: [
              {
                id: `ch_wire_${orderNumber}`,
                amount: order.amount,
                currency: 'MNT',
                status: 'succeeded',
                paid: true
              }
            ]
          }
        }
      }
    };

    const rawBody = JSON.stringify(payloadObj);
    const signature = wireService.computeSignature(rawBody, now, testSecret);
    const signatureHeader = `t=${now},v1=${signature}`;

    wireService.verifyWebhookSignature({
      rawBody,
      signatureHeader,
      secret: testSecret,
      currentTimeSeconds: now
    });

    await Storage.updatePaymentStatus(order.orderNumber, 'PAID', {
      paidAt: new Date(),
      wireChargeId: `ch_wire_${orderNumber}`
    });

    let sub = null;
    let seriesPurchase = null;
    if (order.seriesId) {
      const hours = order.rentalDurationHours || 72;
      seriesPurchase = await Storage.recordSeriesPurchase({
        userId: order.userId,
        seriesId: order.seriesId,
        accessType: order.accessType === 'permanent' ? 'permanent' : 'rental',
        amount: order.amount,
        currency: order.currency || 'MNT',
        paymentId: order.orderNumber,
        orderNumber: order.orderNumber,
        status: 'ACTIVE',
        purchasedAt: new Date(),
        expiresAt:
          order.accessType === 'permanent'
            ? null
            : new Date(Date.now() + hours * 3600 * 1000)
      });
    } else {
      sub = await Storage.activateSubscription({
        userId: order.userId,
        planId: order.planId,
        paymentId: order.orderNumber,
        durationDays: 30
      });
    }

    await Storage.recordWebhookEvent({
      eventId,
      eventType: 'payment_intent.succeeded',
      paymentIntentId: order.wirePaymentIntentId,
      processed: true
    });

    res.json({
      success: true,
      message: 'Wire webhook simulated and verified successfully',
      eventId,
      signatureHeader,
      orderNumber: order.orderNumber,
      subscription: sub,
      seriesPurchase
    });
  } catch (err: any) {
    return sendApiError(res, err, 'SERVER_ERROR', err?.message);
  }
});

// Global API error handler: ensures any uncaught database connectivity failure returns 503
app.use('/api', (err: any, _req: Request, res: Response, _next: NextFunction) => {
  return sendApiError(res, err, 'SERVER_ERROR', err?.message || 'Сервер дээр алдаа гарлаа.');
});

// API paths must always produce JSON, including unknown endpoints.
app.use('/api', (_req: Request, res: Response) => {
  return res.status(404).json({
    error: 'API_ROUTE_NOT_FOUND',
    message: 'API endpoint олдсонгүй.'
  });
});

// -------------------------------------------------------------
// 10. Dynamic SEO Metadata Injection & Vite Integration
// -------------------------------------------------------------
function injectSeoIntoHtml(htmlTemplate: string, req: Request): string {
  const url = req.originalUrl || req.url;
  const pathLocale = getLocaleFromPath(url);
  const cookieLocale =
    req.headers.cookie?.match(/NEXT_LOCALE=([a-z]{2})/)?.[1] ||
    req.headers.cookie?.match(/ai_movie_locale=([a-z]{2})/)?.[1];
  const detectedLocale = pathLocale || (cookieLocale === 'en' ? 'en' : 'mn');

  const baseUrl = getBaseUrl(req);
  const metadata = getPageMetadata(detectedLocale as any, url, { baseUrl });

  let html = htmlTemplate;

  html = html.replace(/<html(\s+[^>]*)?lang="[^"]*"/i, `<html$1lang="${detectedLocale}"`);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${metadata.title}</title>`);
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${metadata.description}" />`
  );
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${metadata.ogTitle}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${metadata.ogDescription}" />`
  );

  const dynamicSeoSnippet = `
    <!-- Crawl-time Localized SEO & Social Cards -->
    <link rel="canonical" href="${metadata.canonicalUrl}" />
    <meta property="og:url" content="${metadata.canonicalUrl}" />
    <meta name="twitter:title" content="${metadata.ogTitle}" />
    <meta name="twitter:description" content="${metadata.ogDescription}" />
    <script type="application/ld+json" id="seo-json-ld">${JSON.stringify(metadata.jsonLd)}</script>
  `;

  html = html.replace('</head>', `${dynamicSeoSnippet}\n  </head>`);

  return html;
}

function registerHtmlRoutes(vite: any = null) {
  const distDir = path.resolve(process.cwd(), 'dist');
  if (isProduction) {
    app.use(express.static(distDir, { index: false }));
  }

  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({
      error: 'API_NOT_FOUND',
      message: 'API endpoint олдсонгүй.'
    });
  });

  app.get('*', async (req: Request, res: Response, next: NextFunction) => {
    const url = req.originalUrl;
    if (url.startsWith('/api') || path.extname(url)) {
      return next();
    }

    try {
      let template: string;
      if (!isProduction && vite) {
        template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
      } else {
        template = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
      }

      const localizedHtml = injectSeoIntoHtml(template, req);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(localizedHtml);
    } catch (e: any) {
      if (!isProduction && vite) {
        vite.ssrFixStacktrace(e);
      }
      next(e);
    }
  });
}

async function startServer() {
  if (isProduction) {
    const connected = await connectDB();
    if (!connected) {
      throw new Error('Production server cannot start without an active MongoDB connection.');
    }
    await Storage.seedFeaturedSeriesIfMissing().catch((err) =>
      console.warn('[AI MOVIE] Featured series seed warning:', err?.message)
    );
    registerHtmlRoutes();
  } else {
    try {
      await connectDB();
      await Storage.seedFeaturedSeriesIfMissing();
    } catch (err: any) {
      console.warn('[AI MOVIE] Initial MongoDB connection attempt failed (API will return 503 until connected):', err?.message);
    }
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);
    registerHtmlRoutes(vite);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI MOVIE] Server listening on http://0.0.0.0:${PORT}`);
  });
}

if (isProduction && process.env.VERCEL === '1') {
  registerHtmlRoutes();
} else if (process.env.VERCEL !== '1') {
  startServer().catch((err) => {
    console.error('[AI MOVIE] Server startup failed:', err);
    process.exitCode = 1;
  });
}

export default app;
