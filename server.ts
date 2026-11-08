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
import { getPageMetadata } from './src/i18n/seo.js';
import { getLocaleFromPath } from './src/i18n/routing.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// User resolution helper (supports cookie, auth header, or registered users in database)
async function getAuthenticatedUser(req: Request): Promise<{ id: string; name: string; email: string } | null> {
  const headerUserId = req.headers['x-user-id'] as string;
  const cookieMatch = req.headers.cookie?.match(/ai_movie_uid=([^;]+)/);
  const cookieUserId = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;

  const userId = headerUserId || cookieUserId;
  if (!userId) {
    return null;
  }

  const dbUser = await Storage.getUserById(userId);
  if (dbUser) {
    return { id: dbUser.id || userId, name: dbUser.name, email: dbUser.email };
  }

  const userDirectory: Record<string, { id: string; name: string; email: string }> = {
    user_batbayar: { id: 'user_batbayar', name: 'Батбаяр', email: 'batbayar@aimovie.mn' },
    user_enkhjin: { id: 'user_enkhjin', name: 'Энхжин', email: 'enkhjin@aimovie.mn' },
    user_temuulen: { id: 'user_temuulen', name: 'Тэмүүлэн', email: 'temuulen@aimovie.mn' }
  };

  if (userDirectory[userId]) {
    return userDirectory[userId];
  }

  return { id: userId, name: userId, email: `${userId}@aimovie.mn` };
}

// Generate base app URL
function getBaseUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${protocol}://${host}`;
}

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

// User Registration: Sign Up with name, email, password
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        error: 'INVALID_NAME',
        message: 'Нэр хамгийн багадаа 2 тэмдэгт байх ёстой.'
      });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        error: 'INVALID_EMAIL',
        message: 'Имэйл хаягаа зөв оруулна уу.'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        error: 'INVALID_PASSWORD',
        message: 'Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.'
      });
    }

    const existingUser = await Storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: 'EMAIL_ALREADY_EXISTS',
        message: 'Энэ имэйл хаяг бүртгэгдсэн байна. Нэвтэрч орно уу.'
      });
    }

    const passwordHash = hashPassword(password);
    const newUser = await Storage.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: 'member'
    });

    res.setHeader('Set-Cookie', `ai_movie_uid=${encodeURIComponent(newUser.id!)}; Path=/; HttpOnly; SameSite=Lax`);

    return res.status(201).json({
      success: true,
      message: 'Амжилттай бүртгэгдлээ.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (err: any) {
    console.error('[Auth/Register] Error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Бүртгүүлэхэд алдаа гарлаа.' });
  }
});

// User Login: Sign In with email, password
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Имэйл болон нууц үгээ оруулна уу.'
      });
    }

    const user = await Storage.getUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Имэйл эсвэл нууц үг буруу байна.'
      });
    }

    res.setHeader('Set-Cookie', `ai_movie_uid=${encodeURIComponent(user.id!)}; Path=/; HttpOnly; SameSite=Lax`);

    const subscription = await Storage.getActiveSubscription(user.id!);

    return res.json({
      success: true,
      message: 'Амжилттай нэвтэрлээ.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      subscription
    });
  } catch (err: any) {
    console.error('[Auth/Login] Error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Нэвтрэхэд алдаа гарлаа.' });
  }
});

// User Sign Out: Clears session cookie
app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.setHeader('Set-Cookie', 'ai_movie_uid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return res.json({ success: true, message: 'Амжилттай гарлаа.' });
});

// Quick Switch User (demo test helper)
app.post('/api/auth/switch-user', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  res.setHeader('Set-Cookie', `ai_movie_uid=${encodeURIComponent(userId)}; Path=/; HttpOnly; SameSite=Lax`);
  res.json({ success: true, userId });
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
app.get('/api/movies', (req: Request, res: Response) => {
  const publicList = MOVIES.map((m) => {
    const { videoSource, ...rest } = m;
    return rest;
  });
  res.json({ movies: publicList });
});

// Stream endpoint with server-side subscription check
app.get('/api/movies/:id/stream', async (req: Request, res: Response) => {
  const { id } = req.params;
  const movie = getMovieById(id);

  if (!movie) {
    return res.status(404).json({ error: 'MOVIE_NOT_FOUND', message: 'Кино олдсонгүй.' });
  }

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
  const tokenSecret = process.env.AUTH_SECRET || 'ai_movie_secret_stream_key';
  const tokenPayload = `${movie.id}:${userId}:${expiresAt}`;
  const signedToken = crypto.createHmac('sha256', tokenSecret).update(tokenPayload).digest('hex');

  res.json({
    authorized: true,
    movieId: movie.id,
    titleMn: movie.titleMn,
    quality: movie.quality,
    streamUrl: movie.videoSource,
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

async function startServer() {
  await connectDB();

  let vite: any = null;
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist'), { index: false }));
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
        template = fs.readFileSync(path.resolve(__dirname, 'dist', 'index.html'), 'utf-8');
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI MOVIE] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[AI MOVIE] Server startup failed:', err);
});
