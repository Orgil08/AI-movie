import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Storage,
  memDb,
  DatabaseConnectionError,
  enableStrictMongoMode,
  ensureDatabaseConnection,
  getDatabaseStatus,
  normalizeStorageError,
  requireDatabaseConnection,
  requireMongoInProduction
} from '../db/storage.js';
import { checkMovieAccess, isMovieLockedForSubscription, getPlanRank } from '../utils/accessControl.js';

test('Phase 1 — Movie creation maps synopsisMn and synopsisEn and prevents duplicate slugs', async () => {
  memDb.clear();

  const movie = await Storage.createMovie({
    titleMn: 'Алтан Орд 2099',
    titleEn: 'Golden Horde 2099',
    slug: 'golden-horde-2099',
    synopsisMn: 'Монгол хэл дээрх киноны дэлгэрэнгүй тайлбар.',
    synopsisEn: 'Detailed English synopsis for Golden Horde 2099.',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    year: 2026,
    duration: '2h 15m',
    genres: ['Sci-Fi', 'Түүхэн'],
    rating: '9.5',
    quality: '4K HDR',
    isPremium: true,
    minPlan: 'premium',
    featured: true,
    published: true
  });

  assert.equal(movie.slug, 'golden-horde-2099');
  assert.equal(movie.synopsisMn, 'Монгол хэл дээрх киноны дэлгэрэнгүй тайлбар.');
  assert.equal(movie.synopsisEn, 'Detailed English synopsis for Golden Horde 2099.');
  assert.equal(movie.descriptionMn, 'Монгол хэл дээрх киноны дэлгэрэнгүй тайлбар.');
  assert.equal(movie.descriptionEn, 'Detailed English synopsis for Golden Horde 2099.');
  assert.equal(movie.synopsis?.mn, 'Монгол хэл дээрх киноны дэлгэрэнгүй тайлбар.');
  assert.equal(movie.synopsis?.en, 'Detailed English synopsis for Golden Horde 2099.');

  // Update movie synopsisMn and synopsisEn
  const updated = await Storage.updateMovie(movie.id, {
    synopsisMn: 'Шинэчлэгдсэн монгол тайлбар.',
    synopsisEn: 'Updated English synopsis.'
  });
  assert.ok(updated);
  assert.equal(updated.synopsisMn, 'Шинэчлэгдсэн монгол тайлбар.');
  assert.equal(updated.synopsisEn, 'Updated English synopsis.');

  // Duplicate slug must be rejected with DUPLICATE_SLUG (409)
  await assert.rejects(
    async () => {
      await Storage.createMovie({
        titleMn: 'Давхардсан Кино',
        titleEn: 'Duplicate Movie',
        slug: 'golden-horde-2099',
        synopsisMn: 'Тайлбар',
        synopsisEn: 'Synopsis',
        posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
        backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
      });
    },
    (err: any) => err.code === 'DUPLICATE_SLUG' && err.statusCode === 409
  );
});

test('Phase 1 — Production & Server MongoDB fail-closed: returns HTTP 503 instead of falling back to memory storage', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalMongoUri = process.env.MONGODB_URI;

  try {
    // 1. Missing MONGODB_URI in production must throw DatabaseConnectionError (503 DATABASE_NOT_CONFIGURED)
    process.env.NODE_ENV = 'production';
    delete process.env.MONGODB_URI;

    await assert.rejects(
      async () => {
        await Storage.getAllMovies();
      },
      (err: any) =>
        err instanceof DatabaseConnectionError &&
        err.statusCode === 503 &&
        err.code === 'DATABASE_NOT_CONFIGURED'
    );

    // 2. Server strict MongoDB mode in development also throws 503 instead of using memory fallback
    process.env.NODE_ENV = 'development';
    enableStrictMongoMode(true);
    await assert.rejects(
      async () => {
        await ensureDatabaseConnection();
      },
      (err: any) =>
        err instanceof DatabaseConnectionError &&
        err.statusCode === 503 &&
        err.code === 'DATABASE_NOT_CONFIGURED'
    );

    // 3. Unconnected MongoDB with configured URI must throw 503 DATABASE_UNAVAILABLE in all environments
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27999/nonexistent';
    assert.throws(
      () => {
        requireDatabaseConnection(false);
      },
      (err: any) =>
        err instanceof DatabaseConnectionError &&
        err.statusCode === 503 &&
        err.code === 'DATABASE_UNAVAILABLE'
    );
    assert.throws(
      () => {
        requireMongoInProduction(false);
      },
      (err: any) =>
        err instanceof DatabaseConnectionError &&
        err.statusCode === 503 &&
        err.code === 'DATABASE_UNAVAILABLE'
    );

    // 4. Runtime Mongoose topology / network errors normalize to 503 DatabaseConnectionError
    const networkErr = new Error('connect ECONNREFUSED 127.0.0.1:27017');
    networkErr.name = 'MongoServerSelectionError';
    const normalized = normalizeStorageError(networkErr) as DatabaseConnectionError;
    assert.ok(normalized instanceof DatabaseConnectionError);
    assert.equal(normalized.statusCode, 503);
    assert.equal(normalized.code, 'DATABASE_UNAVAILABLE');

    process.env.NODE_ENV = 'production';
    const status = getDatabaseStatus();
    assert.equal(status.isProduction, true);
    assert.equal(status.connected, false);
    assert.equal(status.mode, 'unavailable');
  } finally {
    enableStrictMongoMode(false);
    process.env.NODE_ENV = originalNodeEnv;
    if (originalMongoUri !== undefined) {
      process.env.MONGODB_URI = originalMongoUri;
    } else {
      delete process.env.MONGODB_URI;
    }
  }
});

test('Phase 3 — Bank transfer security: user confirmation sets PENDING_REVIEW and only admin approval activates subscription', async () => {
  memDb.clear();

  const user = await Storage.createUser({
    name: 'Batbayar',
    email: 'batbayar@aimovie.mn',
    passwordHash: 'hash',
    role: 'user'
  });

  assert.ok(user.id);

  const order = await Storage.createPayment({
    orderNumber: 'ORD-BANK-1001',
    userId: user.id,
    planId: 'premium',
    amount: 19900,
    currency: 'MNT',
    paymentMethod: 'bank_transfer',
    wirePaymentIntentId: 'bank_ORD-BANK-1001',
    status: 'PENDING'
  });

  // Another user cannot submit confirmation for Batbayar's order
  await assert.rejects(
    async () => {
      await Storage.submitBankTransferForReview({
        orderNumber: order.orderNumber,
        userId: 'intruder-user-id',
        senderName: 'Intruder',
        transferRef: 'FAKE-REF'
      });
    },
    (err: any) => err.code === 'UNAUTHORIZED_ACCESS' && err.statusCode === 403
  );

  // User submits transfer confirmation -> status becomes PENDING_REVIEW (never PAID)
  const pendingReviewOrder = await Storage.submitBankTransferForReview({
    orderNumber: order.orderNumber,
    userId: user.id,
    senderName: 'Batbayar',
    phone: '99112233',
    transferRef: 'KHAN-REF-7788'
  });

  assert.equal(pendingReviewOrder.status, 'PENDING_REVIEW');
  assert.equal(pendingReviewOrder.bankSenderName, 'Batbayar (99112233)');
  assert.equal(pendingReviewOrder.bankTransferRef, 'KHAN-REF-7788');
  const subBeforeAdmin = await Storage.getActiveSubscription(user.id);
  assert.equal(subBeforeAdmin, null, 'User must NOT receive an active subscription before admin approval');

  // Admin approves bank transfer -> status becomes PAID and subscription activates
  const approval = await Storage.approveBankTransferPayment({
    idOrOrderNumber: order.orderNumber,
    adminId: 'admin-1',
    adminEmail: 'admin@aimovie.mn'
  });
  assert.ok(approval.payment);
  assert.equal(approval.payment.status, 'PAID');
  assert.equal(approval.payment.verifiedByAdminId, 'admin-1');
  assert.ok(approval.subscription);
  assert.equal(approval.subscription.planId, 'premium');
  assert.equal(approval.subscription.status, 'ACTIVE');

  // Duplicate approval of an already PAID order must be rejected (409 ORDER_ALREADY_PAID)
  await assert.rejects(
    async () => {
      await Storage.approveBankTransferPayment({
        idOrOrderNumber: order.orderNumber,
        adminId: 'admin-1',
        adminEmail: 'admin@aimovie.mn'
      });
    },
    (err: any) => err.code === 'ORDER_ALREADY_PAID' && err.statusCode === 409
  );

  // Audit log created
  const logs = await Storage.getAuditLogs();
  assert.ok(logs.some((l: any) => l.action === 'APPROVE_BANK_PAYMENT' && l.target === 'ORD-BANK-1001'));
});

test('Phase 3 — Admin can reject a PENDING_REVIEW bank transfer without activating subscription', async () => {
  memDb.clear();

  const user = await Storage.createUser({
    name: 'Sarnai',
    email: 'sarnai@aimovie.mn',
    passwordHash: 'hash',
    role: 'user'
  });

  assert.ok(user.id);

  await Storage.createPayment({
    orderNumber: 'ORD-BANK-1002',
    userId: user.id,
    planId: 'standard',
    amount: 14900,
    currency: 'MNT',
    paymentMethod: 'bank_transfer',
    wirePaymentIntentId: 'bank_ORD-BANK-1002',
    status: 'PENDING_REVIEW'
  });

  const rejected = await Storage.rejectBankTransferPayment({
    idOrOrderNumber: 'ORD-BANK-1002',
    adminId: 'admin-1',
    adminEmail: 'admin@aimovie.mn',
    reason: 'Гүйлгээний утга таарахгүй байна'
  });

  assert.equal(rejected?.status, 'REJECTED');
  assert.equal(rejected?.rejectionReason, 'Гүйлгээний утга таарахгүй байна');

  const sub = await Storage.getActiveSubscription(user.id);
  assert.equal(sub, null, 'Rejected payment must not activate subscription');
});

test('Phase 4 — Centralized subscription tier hierarchy enforcement (basic < standard < premium)', () => {
  assert.equal(getPlanRank('basic'), 1);
  assert.equal(getPlanRank('standard'), 2);
  assert.equal(getPlanRank('premium'), 3);

  const futureDate = new Date(Date.now() + 86400 * 1000).toISOString();
  const pastDate = new Date(Date.now() - 86400 * 1000).toISOString();

  const premiumMovie = { id: 'm-premium', isPremium: true, minPlan: 'premium' as const };
  const standardMovie = { id: 'm-standard', isPremium: true, minPlan: 'standard' as const };
  const basicMovie = { id: 'm-basic', isPremium: true, minPlan: 'basic' as const };
  const freeMovie = { id: 'm-free', isPremium: false, minPlan: 'basic' as const };
  const activeUser = { id: 'u1', role: 'user', status: 'active' as const };

  // 1. Free movie is accessible to everyone
  assert.equal(checkMovieAccess({ movie: freeMovie, user: null, subscription: null }).allowed, true);

  // 2. Unauthenticated user denied for premium movie
  const unauthResult = checkMovieAccess({ movie: basicMovie, user: null, subscription: null });
  assert.equal(unauthResult.allowed, false);
  assert.equal(unauthResult.code, 'AUTH_REQUIRED');

  // 3. Basic user can watch basic movie, but NOT standard or premium movie
  const basicSub = { status: 'ACTIVE', planId: 'basic', endDate: futureDate };
  assert.equal(checkMovieAccess({ movie: basicMovie, user: activeUser, subscription: basicSub }).allowed, true);
  const basicOnStandard = checkMovieAccess({ movie: standardMovie, user: activeUser, subscription: basicSub });
  assert.equal(basicOnStandard.allowed, false);
  assert.equal(basicOnStandard.code, 'INSUFFICIENT_PLAN_TIER');
  assert.equal(basicOnStandard.requiredPlan, 'standard');

  // 4. Standard user can watch basic & standard, but NOT premium
  const standardSub = { status: 'ACTIVE', planId: 'standard', endDate: futureDate };
  assert.equal(checkMovieAccess({ movie: basicMovie, user: activeUser, subscription: standardSub }).allowed, true);
  assert.equal(checkMovieAccess({ movie: standardMovie, user: activeUser, subscription: standardSub }).allowed, true);
  assert.equal(checkMovieAccess({ movie: premiumMovie, user: activeUser, subscription: standardSub }).allowed, false);

  // 5. Premium user can watch all tiers
  const premiumSub = { status: 'ACTIVE', planId: 'premium', endDate: futureDate };
  assert.equal(checkMovieAccess({ movie: basicMovie, user: activeUser, subscription: premiumSub }).allowed, true);
  assert.equal(checkMovieAccess({ movie: standardMovie, user: activeUser, subscription: premiumSub }).allowed, true);
  assert.equal(checkMovieAccess({ movie: premiumMovie, user: activeUser, subscription: premiumSub }).allowed, true);

  // 6. Expired subscription is rejected even if status says ACTIVE
  const expiredSub = { status: 'ACTIVE', planId: 'premium', endDate: pastDate };
  const expiredResult = checkMovieAccess({ movie: basicMovie, user: activeUser, subscription: expiredSub });
  assert.equal(expiredResult.allowed, false);
  assert.equal(expiredResult.code, 'SUBSCRIPTION_EXPIRED');

  // 7. Admin bypasses subscription lock
  assert.equal(
    checkMovieAccess({ movie: premiumMovie, user: { id: 'admin-1', role: 'admin', status: 'active' }, subscription: null }).allowed,
    true
  );
  assert.equal(isMovieLockedForSubscription(premiumMovie, null, 'admin'), false);
});

test('Phase 7 — Website settings persist in Storage', async () => {
  memDb.clear();

  const initial = await Storage.getWebsiteSettings();
  assert.equal(initial.siteName, 'SODON AI MOVIE');

  const updated = await Storage.updateWebsiteSettings({
    siteName: 'SODON 4K CINEMA',
    announcementMn: 'Шинэ кино нэмэгдлээ!',
    maintenanceMode: false,
    allowRegistrations: true,
    subscriptionPrices: { basic: 10900, standard: 15900, premium: 21900 }
  });

  assert.equal(updated.siteName, 'SODON 4K CINEMA');
  assert.equal(updated.announcementMn, 'Шинэ кино нэмэгдлээ!');
  assert.equal(updated.subscriptionPrices?.premium, 21900);
});
