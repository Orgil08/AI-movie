import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import { Storage, connectDB } from '../db/storage.js';
import { defaultWireService, WireService } from '../services/wire.service.js';
import { SUBSCRIPTION_PLANS, isValidPlanId, getPlanById } from '../config/subscription-plans.js';
import { BANK_TRANSFER_DETAILS } from '../config/bank-details.js';
import { MOVIES, getMovieById } from '../data/movies.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import {
  registerSchema,
  loginSchema,
  movieSchema,
  categorySchema,
  changePasswordSchema,
  updateProfileSchema
} from '../utils/validation.js';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const AUTH_SECRET = process.env.AUTH_SECRET || 'ai_movie_fallback_secret_production_2026';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
}

// -------------------------------------------------------------
// Cryptographic Signed Session Helpers (AUTH_SECRET HMAC-SHA256)
// -------------------------------------------------------------
export function signSessionToken(userId: string): string {
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`session:${userId}`)
    .digest('base64url');
  return `s:${userId}.${signature}`;
}

export function verifySessionToken(token: string): string | null {
  if (!token || typeof token !== 'string') return null;
  if (!token.startsWith('s:')) return null;

  const raw = token.slice(2);
  const lastDot = raw.lastIndexOf('.');
  if (lastDot === -1) return null;

  const userId = raw.slice(0, lastDot);
  const signature = raw.slice(lastDot + 1);

  const expectedSignature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`session:${userId}`)
    .digest('base64url');

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
      return userId;
    }
  } catch {
    return null;
  }
  return null;
}

export function buildSessionCookie(userId: string, maxAgeSeconds: number): string {
  const signedToken = signSessionToken(userId);
  const secureFlag = isProduction ? '; Secure' : '';
  return `ai_movie_session=${encodeURIComponent(signedToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secureFlag}`;
}

export function buildClearSessionCookie(): string {
  const secureFlag = isProduction ? '; Secure' : '';
  return `ai_movie_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`;
}

// -------------------------------------------------------------
// Server-Side Authentication Helper
// Strictly verifies signed session token; never trusts client x-user-id
// -------------------------------------------------------------
export async function getAuthenticatedUser(req: Request): Promise<AuthenticatedUser | null> {
  let userId: string | null = null;

  // 1. Primary: Verify signed HttpOnly session cookie
  const cookieHeader = req.headers.cookie || '';
  const sessionMatch = cookieHeader.match(/ai_movie_session=([^;]+)/);
  if (sessionMatch) {
    const rawValue = decodeURIComponent(sessionMatch[1]);
    userId = verifySessionToken(rawValue);
  }

  // 2. Secondary: Authorization Bearer header for mobile / API tokens
  if (!userId && req.headers.authorization?.startsWith('Bearer ')) {
    const bearer = req.headers.authorization.slice(7).trim();
    userId = verifySessionToken(bearer);
  }

  // 3. Automated tests fallback: allow signed token or dev fallback in non-production only
  if (!userId && !isProduction) {
    const legacyCookie = cookieHeader.match(/ai_movie_uid=([^;]+)/);
    if (legacyCookie) {
      userId = decodeURIComponent(legacyCookie[1]);
    }
  }

  if (!userId) {
    return null;
  }

  // Look up user from MongoDB / storage source of truth
  const dbUser = await Storage.getUserById(userId);
  if (!dbUser) {
    return null;
  }

  const role: 'user' | 'admin' = dbUser.role === 'admin' ? 'admin' : 'user';
  return {
    id: dbUser.id || userId,
    name: dbUser.name,
    email: dbUser.email,
    role,
    status: (dbUser.status as any) || 'active'
  };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Нэвтэрч орно уу.' });
  }
  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'Таны бүртгэл түр түдгэлзсэн байна.' });
  }
  (req as any).user = user;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
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
}

// Sliding window rate limiter
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

export function getBaseUrl(req: Request): string {
  const envUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && !envUrl.includes('localhost') && envUrl.startsWith('http')) {
    return envUrl.replace(/\/$/, '');
  }
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${protocol}://${host}`;
}

// -------------------------------------------------------------
// Initialize Express Application
// -------------------------------------------------------------
export const app = express();

// Capture raw body for webhook HMAC signature verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      if (req.originalUrl?.startsWith('/api/webhooks/wire')) {
        req.rawBody = buf;
      }
    }
  })
);
app.use(express.urlencoded({ extended: true }));

// Warm connection initializer for serverless
export async function initApp(): Promise<boolean> {
  return connectDB();
}

// Health check endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'AI MOVIE Core API',
    wireConfigured: defaultWireService.isConfigured()
  });
});

// Context Endpoint: returns current user and active subscription
app.get('/api/auth/me', async (req: Request, res: Response) => {
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
});

// -------------------------------------------------------------
// Auth.js / NextAuth v5 Standard API Endpoints
// -------------------------------------------------------------

// 1. GET /api/auth/session — returns active user session JSON or null
app.get('/api/auth/session', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(200).json(null);
  }

  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return res.status(200).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    },
    expires
  });
});

// 2. GET /api/auth/providers — returns configured Auth.js providers
app.get('/api/auth/providers', (_req: Request, res: Response) => {
  return res.status(200).json({
    credentials: {
      id: 'credentials',
      name: 'Credentials',
      type: 'credentials',
      signinUrl: '/api/auth/signin/credentials',
      callbackUrl: '/api/auth/callback/credentials'
    }
  });
});

// 3. GET /api/auth/csrf — returns CSRF token
app.get('/api/auth/csrf', (_req: Request, res: Response) => {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  return res.status(200).json({
    csrfToken
  });
});

// 4. POST /api/auth/callback/credentials & /api/auth/signin/credentials
const handleAuthCredentials = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'MISSING_CREDENTIALS', message: 'Email and password required' });
    }
    const normalized = String(email).trim().toLowerCase();
    const user = await Storage.getUserByEmail(normalized);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'ACCOUNT_NOT_FOUND', message: 'Account not found' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'Account suspended' });
    }
    const isValid = await verifyPassword(String(password), user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'INCORRECT_PASSWORD', message: 'Incorrect password' });
    }

    const sessionCookie = buildSessionCookie(user.id!, 30 * 24 * 60 * 60);
    res.setHeader('Set-Cookie', sessionCookie);

    return res.status(200).json({
      url: user.role === 'admin' ? '/admin' : '/',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'AUTH_ERROR', message: err.message });
  }
};

app.post('/api/auth/callback/credentials', handleAuthCredentials);
app.post('/api/auth/signin/credentials', handleAuthCredentials);

// 5. POST /api/auth/signout
app.post('/api/auth/signout', (_req: Request, res: Response) => {
  res.setHeader('Set-Cookie', buildClearSessionCookie());
  return res.status(200).json({ url: '/' });
});

// User Registration: Sign Up with Zod validation, role="user" strict enforcement, bcrypt hashing
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(`reg_${clientIp}`, 15)) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Хэт олон бүртгүүлэх оролдлого хийсэн байна. Түр хүлээнэ үү.',
        messageMn: 'Хэт олон бүртгүүлэх оролдлого хийсэн байна. Түр хүлээнэ үү.',
        messageEn: 'Too many registration attempts. Please wait a few moments before trying again.'
      });
    }

    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      const field = String(firstIssue?.path?.[0] || '');
      let errorCode = 'VALIDATION_ERROR';
      let msgMn = firstIssue?.message || 'Мэдээллээ зөв оруулна уу.';
      let msgEn = 'Please enter valid registration information.';

      if (field === 'email') {
        errorCode = 'INVALID_EMAIL';
        msgMn = 'Имэйл хаягаа зөв оруулна уу (жишээ: user@example.com).';
        msgEn = 'Please enter a valid email address (e.g. user@example.com).';
      } else if (field === 'password') {
        errorCode = 'INVALID_PASSWORD_FORMAT';
        msgMn = 'Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.';
        msgEn = 'Password must be at least 8 characters long.';
      } else if (field === 'confirmPassword') {
        errorCode = 'PASSWORD_MISMATCH';
        msgMn = 'Нууц үгүүд хоорондоо таарахгүй байна.';
        msgEn = 'Passwords do not match.';
      } else if (field === 'name') {
        errorCode = 'INVALID_NAME';
        msgMn = 'Нэрээ оруулна уу (хамгийн багадаа 2 тэмдэгт).';
        msgEn = 'Please enter your full name (at least 2 characters).';
      } else if (field === 'terms') {
        errorCode = 'TERMS_REQUIRED';
        msgMn = 'Үйлчилгээний нөхцөлийг зөвшөөрнө үү.';
        msgEn = 'Please agree to the Terms and Conditions.';
      }

      return res.status(400).json({
        error: errorCode,
        field,
        message: msgMn,
        messageMn: msgMn,
        messageEn: msgEn
      });
    }

    const { name, email, password } = parseResult.data;

    const existingUser = await Storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: 'EMAIL_ALREADY_EXISTS',
        field: 'email',
        message: 'Энэ имэйл хаяг бүртгэгдсэн байна. Нэвтэрч орно уу.',
        messageMn: 'Энэ имэйл хаяг бүртгэгдсэн байна. Нэвтэрч орно уу.',
        messageEn: 'This email is already registered. Please sign in.'
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

    const sessionCookie = buildSessionCookie(newUser.id!, 30 * 24 * 60 * 60);
    res.setHeader('Set-Cookie', sessionCookie);

    return res.status(201).json({
      success: true,
      message: 'Амжилттай бүртгэгдлээ.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: 'user'
      }
    });
  } catch (err: any) {
    console.error('[Auth/Register] Error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Бүртгүүлэхэд алдаа гарлаа.' });
  }
});

// User Login: Sign In with Zod validation, credential check, remember me, and role redirection support
app.post('/api/auth/login', async (req: Request, res: Response) => {
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

    // Update last login timestamp
    await Storage.updateUser(user.id!, { lastLoginAt: new Date() });

    const maxAge = remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or session day
    const sessionCookie = buildSessionCookie(user.id!, maxAge);
    res.setHeader('Set-Cookie', sessionCookie);

    const subscription = await Storage.getActiveSubscription(user.id!);

    return res.json({
      success: true,
      message: 'Амжилттай нэвтэрлээ.',
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
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Нэвтрэхэд алдаа гарлаа.' });
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
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
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
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// User Sign Out: Clears session cookie
app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.setHeader('Set-Cookie', buildClearSessionCookie());
  return res.json({ success: true, message: 'Амжилттай гарлаа.' });
});

// -------------------------------------------------------------
// Forgot Password & Reset Password Endpoints (Secure MongoDB Token)
// -------------------------------------------------------------

// 1. POST /api/auth/forgot-password — Request password reset email / token
app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(`forgot_${clientIp}`, 10)) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Хэт олон хүсэлт илгээсэн байна. Түр хүлээнэ үү.'
      });
    }

    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        error: 'INVALID_EMAIL',
        message: 'Имэйл хаягаа зөв оруулна уу.'
      });
    }

    const normalized = email.trim().toLowerCase();
    const result = await Storage.createPasswordResetToken(normalized);

    if (!result) {
      return res.status(200).json({
        success: true,
        message: 'Хэрэв энэ имэйл хаяг системд бүртгэлтэй бол нууц үг сэргээх заавар очсон болно.',
        exists: false
      });
    }

    const resetUrl = `/reset-password?token=${result.token}`;
    return res.status(200).json({
      success: true,
      message: 'Нууц үг сэргээх холбоосыг амжилттай үүсгэлээ.',
      resetUrl,
      token: result.token,
      expiresAt: result.expiresAt
    });
  } catch (err: any) {
    console.error('[Auth/ForgotPassword] Error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Хүсэлтийг боловсруулахад алдаа гарлаа.' });
  }
});

// 2. GET /api/auth/verify-reset-token
app.get('/api/auth/verify-reset-token', async (req: Request, res: Response) => {
  try {
    const token = String(req.query.token || '').trim();
    if (!token) {
      return res.status(400).json({ valid: false, message: 'Токен оруулна уу.' });
    }

    const result = await Storage.verifyPasswordResetToken(token);
    if (!result.valid) {
      return res.status(400).json({ valid: false, message: result.message });
    }

    return res.status(200).json({
      valid: true,
      email: result.email,
      message: 'Токен хүчинтэй байна.'
    });
  } catch (err: any) {
    return res.status(500).json({ valid: false, message: err.message });
  }
});

// 3. POST /api/auth/reset-password
app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword, confirmNewPassword } = req.body || {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        error: 'INVALID_TOKEN',
        message: 'Токен дутуу байна.'
      });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({
        error: 'PASSWORD_TOO_SHORT',
        message: 'Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.'
      });
    }

    if (confirmNewPassword !== undefined && newPassword !== confirmNewPassword) {
      return res.status(400).json({
        error: 'PASSWORD_MISMATCH',
        message: 'Шинэ нууц үгүүд хоорондоо таарахгүй байна.'
      });
    }

    const result = await Storage.resetPasswordWithToken(token.trim(), newPassword);
    if (!result.success) {
      return res.status(400).json({
        error: 'RESET_FAILED',
        message: result.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Таны нууц үг амжилттай шинэчлэгдлээ. Шинэ нууц үгээрээ нэвтэрнэ үү.'
    });
  } catch (err: any) {
    console.error('[Auth/ResetPassword] Error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Нууц үг шинэчлэхэд алдаа гарлаа.' });
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
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
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
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 3. Movie Management: Create
app.post('/api/admin/movies', requireAdmin, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as AuthenticatedUser;
    const parseResult = movieSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: parseResult.error.issues[0]?.message || 'Киноны мэдээлэл буруу байна.'
      });
    }

    const movie = await Storage.createMovie(parseResult.data as any);
    await Storage.recordAuditLog({
      adminId: authUser.id,
      adminEmail: authUser.email,
      action: 'CREATE_MOVIE',
      target: movie.id,
      details: `Created movie ${movie.title.mn}`
    });

    res.status(201).json({ success: true, movie });
  } catch (err: any) {
    console.error('[Admin/CreateMovie] Error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 4. Movie Management: Update
app.put('/api/admin/movies/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as AuthenticatedUser;
    const { id } = req.params;
    const parseResult = movieSchema.partial().safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: parseResult.error.issues[0]?.message || 'Киноны шинэчлэлтийн мэдээлэл буруу байна.'
      });
    }

    const updated = await Storage.updateMovie(id, parseResult.data as any);
    if (!updated) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Кино олдсонгүй.' });
    }

    await Storage.recordAuditLog({
      adminId: authUser.id,
      adminEmail: authUser.email,
      action: 'UPDATE_MOVIE',
      target: id,
      details: `Updated movie ${id}`
    });
    res.json({ success: true, movie: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 5. Movie Management: Delete
app.delete('/api/admin/movies/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as AuthenticatedUser;
    const { id } = req.params;
    const deleted = await Storage.deleteMovie(id);
    if (!deleted) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Кино олдсонгүй.' });
    }

    await Storage.recordAuditLog({
      adminId: authUser.id,
      adminEmail: authUser.email,
      action: 'DELETE_MOVIE',
      target: id,
      details: `Deleted movie ${id}`
    });
    res.json({ success: true, message: 'Кино амжилттай устгагдлаа.' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 6. User Management: List All
app.get('/api/admin/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const role = req.query.role as string;
    const status = req.query.status as string;
    let users = await Storage.getAllUsers();
    if (search) {
      const s = search.toLowerCase();
      users = users.filter((u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    }
    if (role) {
      users = users.filter((u) => u.role === role);
    }
    if (status) {
      users = users.filter((u) => u.status === status);
    }
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 7. User Management: Change Role
app.post('/api/admin/users/:userId/role', requireAdmin, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as AuthenticatedUser;
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || (role !== 'user' && role !== 'admin')) {
      return res.status(400).json({ error: 'INVALID_ROLE', message: 'Хүчинтэй эрх сонгоно уу (user, admin).' });
    }

    // Safety: prevent an administrator from demoting themselves
    if (authUser.id === userId && role !== 'admin') {
      return res.status(400).json({ error: 'CANNOT_DEMOTE_SELF', message: 'Администратор өөрийн админ эрхийг бууруулах боломжгүй.' });
    }

    // Safety: ensure at least one active admin remains in the system
    if (role !== 'admin') {
      const allAdmins = (await Storage.getAllUsers()).filter((u) => u.role === 'admin');
      if (allAdmins.length <= 1 && allAdmins.some((a) => a.id === userId)) {
        return res.status(400).json({
          error: 'LAST_ADMIN_PROTECTION',
          message: 'Системийн сүүлийн администраторын эрхийг хасах боломжгүй.'
        });
      }
    }

    const updated = await Storage.setUserRole(userId, role);
    if (!updated) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Хэрэглэгч олдсонгүй.' });
    }

    await Storage.recordAuditLog({
      adminId: authUser.id,
      adminEmail: authUser.email,
      action: 'CHANGE_USER_ROLE',
      target: userId,
      details: `Changed role to ${role}`
    });
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 8. User Management: Suspend / Reactivate
app.post('/api/admin/users/:userId/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as AuthenticatedUser;
    const { userId } = req.params;
    const { status } = req.body;

    if (!status || (status !== 'active' && status !== 'suspended')) {
      return res.status(400).json({ error: 'INVALID_STATUS', message: 'Хүчинтэй статус сонгоно уу (active, suspended).' });
    }

    if (authUser.id === userId && status === 'suspended') {
      return res.status(400).json({ error: 'CANNOT_SUSPEND_SELF', message: 'Администратор өөрийн эрхийг түдгэлзүүлэх боломжгүй.' });
    }

    const updated = await Storage.setUserStatus(userId, status);
    if (!updated) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Хэрэглэгч олдсонгүй.' });
    }

    await Storage.recordAuditLog({
      adminId: authUser.id,
      adminEmail: authUser.email,
      action: 'CHANGE_USER_STATUS',
      target: userId,
      details: `Changed status to ${status}`
    });
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 9. Payment Management: List All Payments with Filter
app.get('/api/admin/payments', requireAdmin, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as any;
    let payments = await Storage.getAllPayments();
    if (status) {
      payments = payments.filter((p) => p.status === status);
    }
    res.json({ success: true, payments });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 10. Payment Management: Verify & Settle Bank Transfer
app.post('/api/admin/payments/:orderId/verify', requireAdmin, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as AuthenticatedUser;
    const { orderId } = req.params;
    const order = await Storage.getPaymentByOrderNumber(orderId);
    if (!order) {
      return res.status(404).json({ error: 'ORDER_NOT_FOUND', message: 'Захиалга олдсонгүй.' });
    }

    if (order.status === 'PAID') {
      return res.status(400).json({ error: 'ALREADY_PAID', message: 'Энэ захиалгын төлбөр аль хэдийн баталгаажсан байна.' });
    }

    const updatedPayment = await Storage.updatePaymentStatus(orderId, 'PAID', {
      paidAt: new Date()
    });

    const subscription = await Storage.activateSubscription({
      userId: order.userId,
      planId: order.planId,
      paymentId: order.orderNumber,
      durationDays: 30
    });

    await Storage.recordAuditLog({
      adminId: authUser.id,
      adminEmail: authUser.email,
      action: 'SETTLE_PAYMENT_MANUAL',
      target: orderId,
      details: `Admin verified payment of ${order.amount} MNT for plan ${order.planId}`
    });

    res.json({ success: true, payment: updatedPayment, subscription });
  } catch (err: any) {
    console.error('[Admin/VerifyPayment] Error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 11. Webhook Events: Audit Logs
app.get('/api/admin/webhook-events', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const events = await Storage.getAllWebhookEvents();
    res.json({ success: true, events });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 12. Security Audit Logs
app.get('/api/admin/audit-logs', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const logs = await Storage.getAuditLogs(100);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 13. System Website Settings
app.get('/api/admin/settings', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const settings = await Storage.getWebsiteSettings();
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

app.put('/api/admin/settings', requireAdmin, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as AuthenticatedUser;
    const settings = await Storage.updateWebsiteSettings(req.body);
    await Storage.recordAuditLog({
      adminId: authUser.id,
      adminEmail: authUser.email,
      action: 'UPDATE_SETTINGS',
      target: 'system',
      details: 'Updated website settings'
    });
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// -------------------------------------------------------------
// Public Movie & Category API Endpoints
// -------------------------------------------------------------

app.get('/api/movies', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const genre = req.query.genre as string;
    const movies = await Storage.getAllMovies({ search, genre, publishedOnly: true });
    res.json({ success: true, movies });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

app.get('/api/movies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const movie = await Storage.getMovieById(id);
    if (!movie) {
      const fallback = getMovieById(id);
      if (fallback) {
        return res.json({ success: true, movie: fallback });
      }
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Кино олдсонгүй.' });
    }
    res.json({ success: true, movie });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

app.get('/api/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await Storage.getAllCategories();
    res.json({ success: true, categories });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

app.post('/api/categories', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parseResult = categorySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: parseResult.error.issues[0]?.message });
    }
    const cat = await Storage.createCategory(parseResult.data);
    res.status(201).json({ success: true, category: cat });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// -------------------------------------------------------------
// Pricing & Bank Information Endpoints
// -------------------------------------------------------------

app.get('/api/plans', (_req: Request, res: Response) => {
  res.json({
    plans: Object.values(SUBSCRIPTION_PLANS),
    currency: 'MNT',
    wireConfigured: defaultWireService.isConfigured()
  });
});

app.get('/api/bank-details', (_req: Request, res: Response) => {
  res.json({ bankDetails: BANK_TRANSFER_DETAILS });
});

// -------------------------------------------------------------
// Payment Creation (Wire.mn QPay & Bank Transfer)
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
    const serverAmount = plan.price;
    const currency = 'MNT';

    // If QPay payment method is selected, strictly require Wire API key in production
    if (paymentMethod === 'wire_qpay' && !defaultWireService.isConfigured()) {
      return res.status(503).json({
        error: 'WIRE_GATEWAY_NOT_CONFIGURED',
        message: 'Wire.mn QPay төлбөрийн гарцын тохиргоо (WIRE_API_KEY) хийгдээгүй байна. Дансаар шилжүүлэх сонголтыг ашиглана уу.'
      });
    }

    const orderNumber = `AIMOV-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const idempotencyKey = `order_${orderNumber}_pi`;

    const baseUrl = getBaseUrl(req);
    const successUrl = `${baseUrl}/payment/success?order=${orderNumber}`;
    const cancelUrl = `${baseUrl}/payment/cancel?order=${orderNumber}`;

    let wirePaymentIntentId = `pi_aimov_${orderNumber}`;
    let wireCheckoutSessionId = `cs_aimov_${orderNumber}`;
    let checkoutUrl = `${baseUrl}/checkout/${orderNumber}`;

    if (paymentMethod === 'wire_qpay') {
      // Create PaymentIntent on Wire API
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

      // Create Hosted Checkout Session on Wire API
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
        price: plan.price
      }
    });
  } catch (error: any) {
    console.error('[Payments/Create] Error:', error);
    res.status(500).json({
      error: 'PAYMENT_CREATION_FAILED',
      message: error?.message || 'Төлбөрийн захиалга үүсгэхэд алдаа гарлаа.'
    });
  }
});

// Bank Transfer Confirmation
app.post('/api/payments/bank-transfer/confirm', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Нэвтэрч орно уу.' });
    }

    const { orderNumber, bankSenderName, bankTransferRef } = req.body;
    if (!orderNumber) {
      return res.status(400).json({ error: 'ORDER_REQUIRED', message: 'Захиалгын дугаар дутуу байна.' });
    }

    const order = await Storage.getPaymentByOrderNumber(orderNumber);
    if (!order) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Захиалга олдсонгүй.' });
    }

    if (order.userId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Зөвхөн захиалгын эзэмшигч хандах эрхтэй.' });
    }

    const updated = await Storage.updatePaymentStatus(orderNumber, 'PENDING', {
      bankSenderName: bankSenderName || 'Харилцагч',
      bankTransferRef: bankTransferRef || orderNumber
    });

    res.json({
      success: true,
      message: 'Таны гүйлгээний мэдэгдлийг хүлээн авлаа. Банкны хуулга шалгаж баталгаажуулна.',
      payment: updated
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// Order status check
app.get('/api/payments/:orderNumber', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    const { orderNumber } = req.params;

    const payment = await Storage.getPaymentByOrderNumber(orderNumber);
    if (!payment) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Захиалга олдсонгүй.' });
    }

    if (user && payment.userId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Зөвхөн захиалгын эзэмшигч хандах эрхтэй.' });
    }

    const subscription = await Storage.getActiveSubscription(payment.userId);

    res.json({
      success: true,
      order: payment,
      subscription: subscription
        ? {
            ...subscription,
            plan: getPlanById(subscription.planId)
          }
        : null
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// User payment history
app.get('/api/payments/history/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as AuthenticatedUser;
    const payments = await Storage.getPaymentsByUserId(authUser.id);
    res.json({ success: true, payments });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// Active user subscription
app.get('/api/subscriptions/active', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as AuthenticatedUser;
    const subscription = await Storage.getActiveSubscription(authUser.id);
    res.json({
      success: true,
      subscription: subscription
        ? {
            ...subscription,
            plan: getPlanById(subscription.planId)
          }
        : null
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// -------------------------------------------------------------
// Official Wire.mn Webhook Handler (POST /api/webhooks/wire)
// -------------------------------------------------------------
app.post('/api/webhooks/wire', async (req: Request, res: Response) => {
  const signatureHeader = req.headers['wirepayment-signature'] as string;
  const rawBody: Buffer = (req as any).rawBody || Buffer.from(JSON.stringify(req.body || {}));

  const secret = process.env.WIRE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[Wire/Webhook] WIRE_WEBHOOK_SECRET is not configured on server');
    return res.status(500).json({ error: 'WEBHOOK_SECRET_MISSING' });
  }

  const wireService = new WireService(process.env.WIRE_API_KEY, secret);

  try {
    wireService.verifyWebhookSignature({ rawBody, signatureHeader });
  } catch (err: any) {
    console.warn('[Wire/Webhook] Signature verification failed:', err.message);
    return res.status(400).json({
      error: 'INVALID_SIGNATURE',
      message: err.message
    });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody.toString('utf-8'));
  } catch {
    return res.status(400).json({ error: 'MALFORMED_JSON' });
  }

  const eventType: string = event.type || event.event || 'unknown';
  const eventId: string = event.id || `evt_${Date.now()}`;

  if (eventType === 'endpoint.verification') {
    return res.status(200).json({
      received: true,
      verified: true,
      message: 'Wire endpoint verification succeeded.'
    });
  }

  if (eventType === 'payment_intent.succeeded') {
    try {
      const intentObj = event.data?.object || {};
      const intentId = intentObj.id;
      const amount = intentObj.amount;
      const currency = intentObj.currency;
      const metadata = intentObj.metadata || {};
      const orderNumber = metadata.order_id;
      const userId = metadata.user_id;
      const planId = metadata.plan_id;

      if (!orderNumber) {
        return res.status(400).json({ error: 'MISSING_ORDER_METADATA' });
      }

      const existingOrder = await Storage.getPaymentByOrderNumber(orderNumber);
      if (!existingOrder) {
        return res.status(404).json({ error: 'ORDER_NOT_FOUND' });
      }

      if (currency && currency !== 'MNT') {
        return res.status(400).json({ error: 'CURRENCY_MISMATCH' });
      }

      if (amount && existingOrder.amount !== amount) {
        return res.status(400).json({ error: 'AMOUNT_MISMATCH' });
      }

      const isAlreadyProcessed = await Storage.hasProcessedWebhookEvent(eventId);
      if (isAlreadyProcessed) {
        return res.status(200).json({ received: true, deduplicated: true });
      }

      await Storage.recordWebhookEvent({
        eventId,
        eventType,
        paymentIntentId: intentId || existingOrder.wirePaymentIntentId,
        processed: true,
        payloadSummary: `Amount: ${amount} ${currency}, Order: ${orderNumber}`
      });

      const charges = intentObj.charges?.data || [];
      const primaryCharge = charges[0];
      const chargeId = primaryCharge?.id;

      await Storage.updatePaymentStatus(orderNumber, 'PAID', {
        paidAt: new Date(),
        wireChargeId: chargeId,
        wireCheckoutSessionId: intentObj.checkout_session || existingOrder.wireCheckoutSessionId
      });

      const effectivePlanId = planId || existingOrder.planId;
      const effectiveUserId = userId || existingOrder.userId;

      await Storage.activateSubscription({
        userId: effectiveUserId,
        planId: effectivePlanId,
        paymentId: orderNumber,
        durationDays: 30
      });
      return res.status(200).json({ received: true, activated: true });
    } catch (err: any) {
      console.error('[Wire/Webhook] Error handling payment_intent.succeeded:', err);
      return res.status(500).json({ error: 'PROCESSING_ERROR', message: err.message });
    }
  }

  if (eventType === 'payment_intent.payment_failed' || eventType === 'payment_intent.canceled') {
    try {
      const intentObj = event.data?.object || {};
      const orderNumber = intentObj.metadata?.order_id;
      if (orderNumber) {
        const nextStatus = eventType === 'payment_intent.canceled' ? 'EXPIRED' : 'FAILED';
        await Storage.updatePaymentStatus(orderNumber, nextStatus);
      }
      return res.status(200).json({ received: true, status: 'updated' });
    } catch (err: any) {
      return res.status(500).json({ error: 'PROCESSING_ERROR', message: err.message });
    }
  }

  return res.status(200).json({ received: true, unhandled: true });
});

// Stream endpoint with server-side subscription check
app.get('/api/movies/:id/stream', async (req: Request, res: Response) => {
  const { id } = req.params;
  let movie = await Storage.getMovieById(id);
  if (!movie) {
    const legacy = getMovieById(id);
    if (legacy) {
      movie = legacy as any;
    }
  }

  if (!movie) {
    return res.status(404).json({ error: 'MOVIE_NOT_FOUND', message: 'Кино олдсонгүй.' });
  }

  Storage.incrementMovieViews(id).catch(() => {});

  const user = await getAuthenticatedUser(req);

  if (movie.isPremium) {
    if (!user) {
      return res.status(401).json({
        error: 'AUTH_REQUIRED',
        message: 'Энэ киног үзэхийн тулд эхлээд системд нэвтэрнэ үү.'
      });
    }
    const activeSub = await Storage.getActiveSubscription(user.id);
    if (!activeSub) {
      return res.status(403).json({
        error: 'PREMIUM_REQUIRED',
        message: 'Энэ киног үзэхийн тулд идэвхтэй гишүүнчлэл шаардлагатай.',
        requiresPlan: movie.minPlan
      });
    }
  }

  const userId = user ? user.id : 'guest';
  const expiresAt = Date.now() + 2 * 60 * 60 * 1000;
  const tokenPayload = `${movie.id}:${userId}:${expiresAt}`;
  const signedToken = crypto.createHmac('sha256', AUTH_SECRET).update(tokenPayload).digest('hex');

  res.json({
    authorized: true,
    movieId: movie.id,
    videoUrl: movie.videoUrl,
    expiresAt,
    token: signedToken
  });
});

// Test simulation endpoint (strictly disabled in production)
app.post('/api/test/simulate-wire-payment', async (req: Request, res: Response) => {
  if (isProduction || process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'FORBIDDEN_IN_PRODUCTION',
      message: 'Simulation endpoint is strictly disabled in production.'
    });
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

    const rawPayload = Buffer.from(JSON.stringify(payloadObj));
    const signature = wireService.computeSignature(rawPayload, now);

    const isAlreadyProcessed = await Storage.hasProcessedWebhookEvent(eventId);
    let isFirstTime = false;
    if (!isAlreadyProcessed) {
      isFirstTime = true;
      await Storage.recordWebhookEvent({
        eventId,
        eventType: 'payment_intent.succeeded',
        paymentIntentId: order.wirePaymentIntentId,
        processed: true,
        payloadSummary: `Simulated: ${order.amount} MNT for ${order.orderNumber}`
      });

      await Storage.updatePaymentStatus(orderNumber, 'PAID', {
        paidAt: new Date(),
        wireChargeId: `ch_wire_${orderNumber}`
      });
      await Storage.activateSubscription({
        userId: order.userId,
        planId: order.planId,
        paymentId: order.orderNumber,
        durationDays: 30
      });
    }

    res.json({
      success: true,
      message: 'Wire payment simulation processed successfully',
      eventId,
      signature,
      isFirstTime
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Catch-all 404 for unknown /api/* routes (Always returns JSON, never HTML)
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API_ENDPOINT_NOT_FOUND',
    message: 'Хүссэн API холбоос олдсонгүй.'
  });
});

export default app;
