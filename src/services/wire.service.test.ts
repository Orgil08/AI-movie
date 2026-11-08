import test from 'node:test';
import assert from 'node:assert/strict';
import { WireService } from './wire.service.js';
import { Storage, memDb } from '../db/storage.js';
import { SUBSCRIPTION_PLANS, getPlanById } from '../config/subscription-plans.js';

test('WireService - parseSignatureHeader parses standard header correctly', () => {
  const service = new WireService('dummy_key', 'test_secret');
  const parsed = service.parseSignatureHeader('t=1731000000,v1=abcdef0123456789');

  assert.equal(parsed.timestamp, 1731000000);
  assert.equal(parsed.signatures.length, 1);
  assert.equal(parsed.signatures[0], 'abcdef0123456789');
});

test('WireService - parseSignatureHeader handles multiple v1 signatures for secret rotation', () => {
  const service = new WireService('dummy_key', 'test_secret');
  const parsed = service.parseSignatureHeader('t=1731000000,v1=sig_one,v1=sig_two');

  assert.equal(parsed.timestamp, 1731000000);
  assert.equal(parsed.signatures.length, 2);
  assert.deepEqual(parsed.signatures, ['sig_one', 'sig_two']);
});

test('WireService - parseSignatureHeader throws on missing or malformed header', () => {
  const service = new WireService('dummy_key', 'test_secret');
  assert.throws(() => service.parseSignatureHeader(''), /Missing WirePayment-Signature/);
  assert.throws(() => service.parseSignatureHeader('v1=abcdef'), /missing or malformed timestamp/);
  assert.throws(() => service.parseSignatureHeader('t=1731000000'), /missing v1 signature/);
});

test('WireService - verifyWebhookSignature succeeds with valid HMAC and fresh timestamp', () => {
  const secret = 'whsec_999988887777';
  const service = new WireService('dummy_key', secret);

  const rawBody = JSON.stringify({
    id: 'evt_01JBMX9988',
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_test123', status: 'succeeded', amount: 14900, currency: 'MNT' } }
  });

  const now = 1731000000;
  const signature = service.computeSignature(rawBody, now, secret);
  const header = `t=${now},v1=${signature}`;

  const result = service.verifyWebhookSignature({
    rawBody,
    signatureHeader: header,
    currentTimeSeconds: now,
    toleranceSeconds: 300
  });

  assert.equal(result.isValid, true);
  assert.equal(result.timestamp, now);
});

test('WireService - verifyWebhookSignature rejects tampered body', () => {
  const secret = 'whsec_999988887777';
  const service = new WireService('dummy_key', secret);

  const rawBody = JSON.stringify({ amount: 14900 });
  const tamperedBody = JSON.stringify({ amount: 100 }); // attacker tried to alter amount

  const now = 1731000000;
  const signature = service.computeSignature(rawBody, now, secret);
  const header = `t=${now},v1=${signature}`;

  assert.throws(
    () =>
      service.verifyWebhookSignature({
        rawBody: tamperedBody,
        signatureHeader: header,
        currentTimeSeconds: now,
        toleranceSeconds: 300
      }),
    /Webhook signature mismatch/
  );
});

test('WireService - verifyWebhookSignature rejects expired timestamp beyond 5-minute tolerance', () => {
  const secret = 'whsec_999988887777';
  const service = new WireService('dummy_key', secret);

  const rawBody = '{"id":"evt_test"}';
  const timestamp = 1731000000;
  const now = timestamp + 301; // 301 seconds later (> 300s limit)

  const signature = service.computeSignature(rawBody, timestamp, secret);
  const header = `t=${timestamp},v1=${signature}`;

  assert.throws(
    () =>
      service.verifyWebhookSignature({
        rawBody,
        signatureHeader: header,
        currentTimeSeconds: now,
        toleranceSeconds: 300
      }),
    /Webhook timestamp expired or out of tolerance/
  );
});

test('WireService - createPaymentIntent enforces whole integer MNT and valid currency', async () => {
  const service = new WireService('test_key', 'test_secret');

  await assert.rejects(
    async () => {
      await service.createPaymentIntent({
        amount: 14900.5, // float invalid
        currency: 'MNT',
        description: 'Test',
        metadata: { order_id: '1', user_id: 'u1', plan_id: 'standard' },
        idempotencyKey: 'key_1'
      });
    },
    /positive integer in MNT/
  );

  await assert.rejects(
    async () => {
      await service.createPaymentIntent({
        amount: -500, // negative invalid
        currency: 'MNT',
        description: 'Test',
        metadata: { order_id: '1', user_id: 'u1', plan_id: 'standard' },
        idempotencyKey: 'key_1'
      });
    },
    /positive integer in MNT/
  );

  await assert.rejects(
    async () => {
      await service.createPaymentIntent({
        amount: 14900,
        currency: 'USD' as any, // non-MNT currency invalid
        description: 'Test',
        metadata: { order_id: '1', user_id: 'u1', plan_id: 'standard' },
        idempotencyKey: 'key_1'
      });
    },
    /Unsupported currency: USD/
  );
});

test('Storage - Webhook deduplication prevents processing same event twice', async () => {
  memDb.clear();

  const eventId = 'evt_duplicate_test_001';
  assert.equal(await Storage.hasProcessedWebhookEvent(eventId), false);

  await Storage.recordWebhookEvent({
    eventId,
    eventType: 'payment_intent.succeeded',
    paymentIntentId: 'pi_test_999',
    processed: true
  });

  assert.equal(await Storage.hasProcessedWebhookEvent(eventId), true);
});

test('Storage - Subscription activation adds 30 days and extends active plans', async () => {
  memDb.clear();

  const userId = 'user_mn_456';
  const paymentId = 'pay_001';

  // No initial active subscription
  const initial = await Storage.getActiveSubscription(userId);
  assert.equal(initial, null);

  // Activate standard plan
  const sub1 = await Storage.activateSubscription({
    userId,
    planId: 'standard',
    paymentId,
    durationDays: 30
  });

  assert.equal(sub1.status, 'ACTIVE');
  assert.equal(sub1.planId, 'standard');
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  assert.ok(sub1.endDate.getTime() >= now + thirtyDaysMs - 2000);

  // Renewing should extend an additional 30 days
  const sub2 = await Storage.activateSubscription({
    userId,
    planId: 'standard',
    paymentId: 'pay_002',
    durationDays: 30
  });

  assert.equal(sub2.status, 'ACTIVE');
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
  assert.ok(sub2.endDate.getTime() >= now + sixtyDaysMs - 4000);
});

test('Pricing - Subscription configuration has exact official prices in whole MNT', () => {
  assert.equal(SUBSCRIPTION_PLANS.basic.price, 9900);
  assert.equal(SUBSCRIPTION_PLANS.standard.price, 14900);
  assert.equal(SUBSCRIPTION_PLANS.premium.price, 19900);

  assert.equal(SUBSCRIPTION_PLANS.basic.currency, 'MNT');
  assert.equal(SUBSCRIPTION_PLANS.standard.currency, 'MNT');
  assert.equal(SUBSCRIPTION_PLANS.premium.currency, 'MNT');

  const standardPlan = getPlanById('standard');
  assert.ok(standardPlan);
  assert.equal(standardPlan?.popular, true);
});

test('BankTransfer - Configuration contains exact account 5132104221 and sukhbat munkh-orgil', async () => {
  const { BANK_TRANSFER_DETAILS } = await import('../config/bank-details.js');
  assert.equal(BANK_TRANSFER_DETAILS.accountNumber, '5132104221');
  assert.equal(BANK_TRANSFER_DETAILS.accountHolder, 'Сүхбат Мөнх-Оргил');
  assert.equal(BANK_TRANSFER_DETAILS.accountHolderEn, 'sukhbat munkh-orgil');
  assert.ok(BANK_TRANSFER_DETAILS.bankName.includes('Хаан'));
});

test('BankTransfer - Payment order and confirmation activates user subscription', async () => {
  memDb.clear();

  const userId = 'user_bank_test';
  const orderNumber = 'AIMOV-BANK-001';

  // 1. Create bank transfer order
  const order = await Storage.createPayment({
    userId,
    orderNumber,
    planId: 'premium',
    paymentMethod: 'bank_transfer',
    wirePaymentIntentId: `bank_${orderNumber}`,
    amount: 19900,
    currency: 'MNT',
    status: 'PENDING'
  });

  assert.equal(order.status, 'PENDING');
  assert.equal(order.paymentMethod, 'bank_transfer');

  // 2. Confirm bank transfer
  const updated = await Storage.updatePaymentStatus(orderNumber, 'PAID', {
    paidAt: new Date(),
    bankSenderName: 'Сүхбат Мөнх-Оргил',
    bankTransferRef: 'TXN-998877'
  });

  assert.equal(updated?.status, 'PAID');
  assert.equal(updated?.bankSenderName, 'Сүхбат Мөнх-Оргил');
  assert.equal(updated?.bankTransferRef, 'TXN-998877');

  // 3. Activate subscription
  const sub = await Storage.activateSubscription({
    userId,
    planId: order.planId,
    paymentId: orderNumber,
    durationDays: 30
  });

  assert.equal(sub.status, 'ACTIVE');
  assert.equal(sub.planId, 'premium');

  const activeSub = await Storage.getActiveSubscription(userId);
  assert.ok(activeSub);
  assert.equal(activeSub?.planId, 'premium');
});
