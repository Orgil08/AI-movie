import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { Storage, connectDB } from './src/db/storage.js';
import { defaultWireService, WireService } from './src/services/wire.service.js';
import { SUBSCRIPTION_PLANS, isValidPlanId, getPlanById } from './src/config/subscription-plans.js';
import { BANK_TRANSFER_DETAILS } from './src/config/bank-details.js';
import { MOVIES, getMovieById } from './src/data/movies.js';
import { hashPassword, verifyPassword } from './src/utils/crypto.js';
import { createSignedSessionToken, safeStringEqual, verifySignedSessionToken } from './src/utils/session.js';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';
const SESSION_COOKIE = 'ai_movie_uid';
const CSRF_COOKIE = 'ai_movie_csrf';

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (isProduction) {
    throw new Error('AUTH_SECRET must be configured with at least 32 characters in production.');
  }
  return secret || 'local-development-only-ai-movie-session-secret';
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

function setSessionCookie(res: Response, userId: string, maxAgeSeconds: number): void {
  const { token } = createSessionToken(userId, maxAgeSeconds);
  const secure = isProduction ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`
  );
}

function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  const cookieToken = readCookie(req, CSRF_COOKIE);
  const requestToken = (req.get('x-csrf-token') || req.body?.csrfToken || '').toString();
  if (!cookieToken || !requestToken || !safeStringEqual(cookieToken, requestToken)) {
    res.status(403).json({ error: 'CSRF_VALIDATION_FAILED', message: 'Хүсэлтийн аюулгүй байдлын шалгалт амжилтгүй боллоо. Дахин оролдоно уу.' });
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

// User resolution uses a signed, expiring HttpOnly cookie. A client-supplied
// user ID header is never accepted as proof of authentication.
async function getAuthenticatedUser(req: Request): Promise<AuthenticatedUser | null> {
  const claims = verifySessionToken(readCookie(req, SESSION_COOKIE));
  if (!claims) return null;

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

// Server-side administrator guard for Admin Panel endpoints
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
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

// Fail closed on Vercel/production: never silently authenticate against the
// seeded in-memory development database when MongoDB is unavailable.
app.use('/api', async (_req: Request, res: Response, next: NextFunction) => {
  if (!isProduction) return next();

  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('<') || process.env.MONGODB_URI.includes('>')) {
    return res.status(503).json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Production MongoDB connection is not configured.' });
  }
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    return res.status(503).json({ error: 'AUTH_SECRET_NOT_CONFIGURED', message: 'Production authentication secret is not configured.' });
  }

  try {
    const connected = await connectDB();
    if (!connected) {
      return res.status(503).json({ error: 'DATABASE_UNAVAILABLE', message: 'Authentication service is temporarily unavailable.' });
    }
    return next();
  } catch (error) {
    console.error('[API] Production database initialization failed:', error);
    return res.status(503).json({ error: 'DATABASE_UNAVAILABLE', message: 'Authentication service is temporarily unavailable.' });
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

// Standard JSON parser for all other routes
app.use(express.json());

// -------------------------------------------------------------
// 2. Authentication Endpoints (Sign In, Sign Up, Sign Out, Me)
// -------------------------------------------------------------

// Custom Express authentication discovery/session endpoints. This project
// does not use NextAuth/Auth.js; these expose the existing credentials auth
// contract as JSON for health checks and clients that probe these URLs.
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
  const csrfToken = crypto.randomBytes(32).toString('hex');
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
    const claims = verifySessionToken(readCookie(req, SESSION_COOKIE));
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
    return res.status(500).json({ error: 'SESSION_LOOKUP_FAILED', message: 'Session шалгахад алдаа гарлаа.' });
  }
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

    setSessionCookie(res, newUser.id!, 30 * 24 * 60 * 60);

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

    // Update last login timestamp
    await Storage.updateUser(user.id!, { lastLoginAt: new Date() });

    const maxAge = remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or session day
    setSessionCookie(res, user.id!, maxAge);

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
  const secure = isProduction ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
  return res.json({ success: true, message: 'Амжилттай гарлаа.' });
});

// Quick switch is intentionally unavailable in production. Development-only
// switching still verifies that the target record exists in the database.
app.post('/api/auth/switch-user', (req: Request, res: Response) => {
  if (isProduction) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Энэ endpoint production орчинд идэвхгүй.' });
  }
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  void Storage.getUserById(String(userId)).then((targetUser) => {
    if (!targetUser) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Хэрэглэгч олдсонгүй.' });
    }
    setSessionCookie(res, targetUser.id!, 30 * 24 * 60 * 60);
    return res.json({ success: true, userId: targetUser.id });
  }).catch((error) => {
    console.error('[Auth/SwitchUser] Error:', error);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Хэрэглэгч солиход алдаа гарлаа.' });
  });
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
    const admin = (req as any).user as AuthenticatedUser;
    const parseResult = movieSchema.safeParse(req.body);
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
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 4. Movie Management: Update
app.put('/api/admin/movies/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const { id } = req.params;
    const movie = await Storage.updateMovie(id, req.body);
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
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
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
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 6. Movie Management: Toggle Publish
app.patch('/api/admin/movies/:id/toggle-publish', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const { id } = req.params;
    const movie = await Storage.getMovieById(id);
    if (!movie) return res.status(404).json({ error: 'MOVIE_NOT_FOUND' });

    const updated = await Storage.updateMovie(id, { published: !movie.published });
    await Storage.recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: updated?.published ? 'PUBLISH_MOVIE' : 'UNPUBLISH_MOVIE',
      target: id
    });

    res.json({ success: true, movie: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 7. Movie Management: Toggle Featured
app.patch('/api/admin/movies/:id/toggle-featured', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const { id } = req.params;
    const movie = await Storage.getMovieById(id);
    if (!movie) return res.status(404).json({ error: 'MOVIE_NOT_FOUND' });

    const updated = await Storage.updateMovie(id, { featured: !movie.featured });
    await Storage.recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: updated?.featured ? 'FEATURE_MOVIE' : 'UNFEATURE_MOVIE',
      target: id
    });

    res.json({ success: true, movie: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 8. Category Management: List All
app.get('/api/admin/categories', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const categories = await Storage.getAllCategories();
    res.json({ success: true, categories });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
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
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 10. Category Management: Update
app.put('/api/admin/categories/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as AuthenticatedUser;
    const { id } = req.params;
    const cat = await Storage.updateCategory(id, req.body);
    if (!cat) return res.status(404).json({ error: 'CATEGORY_NOT_FOUND' });

    await Storage.recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPDATE_CATEGORY',
      target: id,
      details: `Updated category: ${cat.nameMn}`
    });

    res.json({ success: true, category: cat, message: 'Ангилал шинэчлэгдлээ.' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
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
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
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
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
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

    res.json({ success: true, user: updated, message: 'Хэрэглэгчийн эрх амжилттай өөрчлөгдлөө.' });
  } catch (err: any) {
    res.status(400).json({ error: 'ROLE_UPDATE_FAILED', message: err.message });
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

    res.json({ success: true, user: updated, message: 'Хэрэглэгчийн төлөв амжилттай шинэчлэгдлөө.' });
  } catch (err: any) {
    res.status(400).json({ error: 'STATUS_UPDATE_FAILED', message: err.message });
  }
});

// 15. Payment Management: List All Payments
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
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
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
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
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
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 18. Audit Logs: List
app.get('/api/admin/audit-logs', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const logs = await Storage.getAuditLogs(100);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 19. Movie Image Upload: Accepts Base64 data and writes to /public/uploads/
app.post('/api/admin/upload', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { dataUrl, filename = 'image.jpg' } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'INVALID_IMAGE', message: 'Зургийн өгөгдөл дутуу байна.' });
    }

    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'INVALID_BASE64', message: 'Хүчингүй зургийн формат.' });
    }

    const buffer = Buffer.from(matches[2], 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'FILE_TOO_LARGE', message: 'Зургийн хэмжээ 5MB-аас хэтрэхгүй байх ёстой.' });
    }

    const uploadsDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(filename) || '.jpg';
    const safeName = `img_${Date.now()}_${crypto.randomBytes(3).toString('hex')}${ext}`;
    const filePath = path.join(uploadsDir, safeName);

    fs.writeFileSync(filePath, buffer);
    const publicUrl = `/uploads/${safeName}`;

    res.json({ success: true, url: publicUrl, message: 'Зураг амжилттай хуулагдлаа.' });
  } catch (err: any) {
    console.error('[Admin/Upload] Error:', err);
    res.status(500).json({ error: 'UPLOAD_FAILED', message: err.message });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ ok: true, service: 'ai-movie-api' });
});

// -------------------------------------------------------------
// 3. Subscription Info
// -------------------------------------------------------------
app.get('/api/subscription', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.json({ active: false, subscription: null });
  }

  const subscription = await Storage.getActiveSubscription(user.id);
  const plan = subscription ? getPlanById(subscription.planId) : null;

  let daysRemaining = 0;
  if (subscription) {
    const diff = subscription.endDate.getTime() - Date.now();
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
});

// -------------------------------------------------------------
// Bank Transfer Details API
// GET /api/bank-details
// -------------------------------------------------------------
app.get('/api/bank-details', (req: Request, res: Response) => {
  res.json({ bankDetails: BANK_TRANSFER_DETAILS });
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
    // Rule: Amount must come strictly from server-side subscription configuration.
    // Never trust client prices!
    const serverAmount = plan.price;
    const currency = 'MNT';

    // Unique order number
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
      // 1. Create PaymentIntent on Wire API
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

      // 2. Create Hosted Checkout Session on Wire API
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

    // Record internal pending payment
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

// -------------------------------------------------------------
// Bank Transfer Confirmation
// POST /api/payments/bank-transfer/confirm
// -------------------------------------------------------------
app.post('/api/payments/bank-transfer/confirm', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Нэвтэрч орно уу.' });
    }
    const { orderNumber, senderName, transferRef, phone } = req.body;

    if (!orderNumber) {
      return res.status(400).json({ error: 'orderNumber is required' });
    }

    const payment = await Storage.getPaymentByOrderNumber(orderNumber);
    if (!payment) {
      return res.status(404).json({ error: 'ORDER_NOT_FOUND', message: 'Захиалга олдсонгүй.' });
    }

    if (payment.userId !== user.id) {
      return res.status(403).json({ error: 'UNAUTHORIZED_ACCESS' });
    }

    if (payment.status === 'PAID') {
      return res.json({ success: true, message: 'Захиалга аль хэдийн баталгаажсан байна.', orderNumber });
    }

    const refString = transferRef || `TXN-${Date.now().toString().slice(-6)}`;
    const sender = senderName ? `${senderName}${phone ? ` (${phone})` : ''}` : user.name;

    // Update payment record to PAID
    await Storage.updatePaymentStatus(payment.orderNumber, 'PAID', {
      paidAt: new Date(),
      bankSenderName: sender,
      bankTransferRef: refString
    });

    // Activate subscription in database
    await Storage.activateSubscription({
      userId: payment.userId,
      planId: payment.planId,
      paymentId: payment.orderNumber,
      durationDays: 30
    });

    console.log(`[BankTransfer] Order ${payment.orderNumber} confirmed for user ${payment.userId}. Plan ${payment.planId} activated.`);

    res.json({
      success: true,
      message: 'Дансны шилжүүлэг амжилттай баталгаажиж, гишүүнчлэл идэвхжлээ.',
      orderNumber: payment.orderNumber,
      planId: payment.planId,
      status: 'PAID'
    });
  } catch (error: any) {
    console.error('[BankTransfer/Confirm] Error:', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: error?.message || 'Баталгаажуулахад алдаа гарлаа.' });
  }
});

// -------------------------------------------------------------
// 5. Payment History (MUST be before :orderId route)
// GET /api/payments/history
// -------------------------------------------------------------
app.get('/api/payments/history', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.json({ payments: [] });
  }
  const payments = await Storage.getPaymentsByUserId(user.id);

  const formatted = payments.map((p) => {
    const plan = getPlanById(p.planId);
    return {
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
      createdAt: p.createdAt,
      paidAt: p.paidAt
    };
  });

  res.json({ payments: formatted });
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

    // Verify ownership if user is logged in
    if (user && payment.userId && payment.userId !== user.id) {
      return res.status(403).json({
        error: 'UNAUTHORIZED_ORDER_ACCESS',
        message: 'Энэ захиалгын мэдээлэлд хандах эрхгүй байна.'
      });
    }

    // If PENDING and Wire is configured, we can independently query Wire to check for updates (only for wire_qpay)
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
          // Double verify amount and currency
          if (wirePi.amount === payment.amount && wirePi.currency === 'MNT') {
            await Storage.updatePaymentStatus(payment.orderNumber, 'PAID', {
              paidAt: new Date(),
              wireChargeId: wirePi.charges?.data?.[0]?.id
            });
            await Storage.activateSubscription({
              userId: payment.userId,
              planId: payment.planId,
              paymentId: payment.orderNumber,
              durationDays: 30
            });
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
      bankTransferDetails: BANK_TRANSFER_DETAILS,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt
    });
  } catch (error: any) {
    console.error('[Payments/Get] Error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Захиалгын мэдээлэл авахад алдаа гарлаа.'
    });
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

    // Step 1: Match the Wire PaymentIntent ID with the internal payment order
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

    // Step 2: Check if order has already been fulfilled
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

    // Step 3: Retrieve the PaymentIntent from Wire API to independently verify its status
    let verifiedIntent: any = paymentIntentData;
    if (defaultWireService.isConfigured()) {
      try {
        verifiedIntent = await defaultWireService.getPaymentIntent(paymentIntentId);
      } catch (wireErr: any) {
        console.error(`[Webhook/Wire] Failed to verify intent ${paymentIntentId} with Wire API:`, wireErr.message);
        return res.status(502).json({ error: 'WIRE_API_VERIFICATION_FAILED' });
      }
    }

    // Step 4: Verify status is succeeded
    if (verifiedIntent.status !== 'succeeded') {
      console.warn(`[Webhook/Wire] Verified intent status is '${verifiedIntent.status}', not 'succeeded'`);
      return res.status(400).json({ error: 'INTENT_NOT_SUCCEEDED' });
    }

    // Step 5: Verify amount matches internal order
    if (verifiedIntent.amount !== order.amount) {
      console.error(
        `[Webhook/Wire] Amount mismatch! Expected ${order.amount} MNT, got ${verifiedIntent.amount} MNT`
      );
      return res.status(400).json({ error: 'AMOUNT_MISMATCH' });
    }

    // Step 6: Verify currency is MNT
    if (verifiedIntent.currency !== 'MNT') {
      console.error(`[Webhook/Wire] Currency mismatch! Expected MNT, got ${verifiedIntent.currency}`);
      return res.status(400).json({ error: 'CURRENCY_MISMATCH' });
    }

    // Step 7: Update order to PAID and record charge id
    const chargeId = verifiedIntent.charges?.data?.[0]?.id;
    await Storage.updatePaymentStatus(order.orderNumber, 'PAID', {
      paidAt: new Date(),
      wireChargeId: chargeId
    });

    // Step 8: Activate subscription in database exactly once
    await Storage.activateSubscription({
      userId: order.userId,
      planId: order.planId,
      paymentId: order.orderNumber,
      durationDays: 30
    });

    // Step 9 & 10: Store completion time and record event ID
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

  // Other Wire webhook events (record and ack)
  await Storage.recordWebhookEvent({
    eventId,
    eventType,
    paymentIntentId: event.data?.object?.id || 'unknown',
    processed: true
  });

  res.status(200).json({ received: true });
});

// -------------------------------------------------------------
// 8. Movies & Protected Streaming
// -------------------------------------------------------------
app.get('/api/movies', async (_req: Request, res: Response) => {
  try {
    const list = await Storage.getAllMovies({ publishedOnly: true });
    const publicList = list.map((m) => {
      const { videoSource, videoUrl, ...rest } = m as any;
      return rest;
    });
    res.json({ movies: publicList });
  } catch (err: any) {
    const fallbackList = MOVIES.map((m) => {
      const { videoSource, ...rest } = m;
      return rest;
    });
    res.json({ movies: fallbackList });
  }
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

  // Increment views count asynchronously
  Storage.incrementMovieViews(id).catch(() => {});

  const user = await getAuthenticatedUser(req);

  // If movie is premium, enforce active subscription check
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
    streamUrl: (movie as any).videoSource || (movie as any).videoUrl,
    expiresAt,
    token: signedToken
  });
});

// -------------------------------------------------------------
// 9. Integration Test Simulation Endpoint
// Allows simulating a real Wire webhook with valid HMAC signature
// for testing and validation
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

    // Verify signature internally
    wireService.verifyWebhookSignature({
      rawBody,
      signatureHeader,
      secret: testSecret,
      currentTimeSeconds: now
    });

    // Execute state update
    await Storage.updatePaymentStatus(order.orderNumber, 'PAID', {
      paidAt: new Date(),
      wireChargeId: `ch_wire_${orderNumber}`
    });

    const sub = await Storage.activateSubscription({
      userId: order.userId,
      planId: order.planId,
      paymentId: order.orderNumber,
      durationDays: 30
    });

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
      subscription: sub
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API paths must always produce JSON, including unknown endpoints. Register
// this only after every API route so valid routes are not shadowed.
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
  const cookieLocale = req.headers.cookie?.match(/NEXT_LOCALE=([a-z]{2})/)?.[1] ||
                       req.headers.cookie?.match(/ai_movie_locale=([a-z]{2})/)?.[1];
  const detectedLocale = pathLocale || (cookieLocale === 'en' ? 'en' : 'mn');

  const baseUrl = getBaseUrl(req);
  const metadata = getPageMetadata(detectedLocale as any, url, { baseUrl });

  let html = htmlTemplate;

  // Set html lang attribute
  html = html.replace(/<html(\s+[^>]*)?lang="[^"]*"/i, `<html$1lang="${detectedLocale}"`);

  // Replace <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${metadata.title}</title>`);

  // Replace <meta name="description" ...>
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${metadata.description}" />`
  );

  // Replace OpenGraph title & description
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${metadata.ogTitle}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${metadata.ogDescription}" />`
  );

  // Inject or update canonical, twitter, and Schema.org structured data (JSON-LD)
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

  // Handle all HTML/navigation routes with dynamic localized SEO metadata
  app.get('*', async (req: Request, res: Response, next: NextFunction) => {
    const url = req.originalUrl;
    // Skip API routes or static files with extension
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
    registerHtmlRoutes();
  } else {
    await connectDB();
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

// Vercel imports this Express application as a serverless API function.
// Do not start a long-lived listener inside a serverless invocation.
if (isProduction && process.env.VERCEL === '1') {
  registerHtmlRoutes();
} else if (process.env.VERCEL !== '1') {
  startServer().catch((err) => {
    console.error('[AI MOVIE] Server startup failed:', err);
    process.exitCode = 1;
  });
}

// Keep the existing Express + MongoDB backend; no mock Auth.js/Next.js layer.
export default app;
