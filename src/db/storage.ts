import mongoose from 'mongoose';
import {
  IPayment,
  ISubscription,
  IWireWebhookEvent,
  IUser,
  UserModel,
  PaymentModel,
  SubscriptionModel,
  WireWebhookEventModel,
  PaymentStatus,
  SubscriptionStatus
} from './models.js';
import { hashPassword } from '../utils/crypto.js';

// Disable command buffering so operations never hang when disconnected
mongoose.set('bufferCommands', false);

let isConnected = false;

export async function connectDB(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.trim() === '' || uri.includes('<') || uri.includes('>')) {
    // Graceful fallback to memory/local store if no MongoDB URI or if placeholder brackets exist
    return false;
  }

  if (isConnected && mongoose.connection.readyState === 1) return true;

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000
    });
    isConnected = mongoose.connection.readyState === 1;
    if (isConnected) {
      console.log('[Database] Connected successfully to MongoDB Atlas');
    }
    return isConnected;
  } catch (err) {
    isConnected = false;
    console.warn('[Database] MongoDB Atlas connection failed, falling back to local storage:', (err as Error).message);
    return false;
  }
}

export function isMongoActive(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

/**
 * In-memory fallback database for development, preview and automated tests.
 */
class MemoryDatabase {
  public users: Map<string, IUser> = new Map();
  public payments: Map<string, IPayment> = new Map();
  public subscriptions: Map<string, ISubscription> = new Map();
  public webhookEvents: Map<string, IWireWebhookEvent> = new Map();

  constructor() {
    this.seedDemoData();
  }

  private seedDemoData() {
    const defaultPassword = hashPassword('password123');

    const demoUsers: IUser[] = [
      {
        id: 'user_batbayar',
        name: 'Батбаяр',
        email: 'batbayar@aimovie.mn',
        passwordHash: defaultPassword,
        role: 'member',
        createdAt: new Date('2026-01-01')
      },
      {
        id: 'user_enkhjin',
        name: 'Энхжин',
        email: 'enkhjin@aimovie.mn',
        passwordHash: defaultPassword,
        role: 'member',
        createdAt: new Date('2026-01-02')
      },
      {
        id: 'user_temuulen',
        name: 'Тэмүүлэн',
        email: 'temuulen@aimovie.mn',
        passwordHash: defaultPassword,
        role: 'member',
        createdAt: new Date('2026-01-03')
      }
    ];

    for (const u of demoUsers) {
      this.users.set(u.id!, u);
    }

    // Seed Enkhjin with active Standard subscription and Temuulen with active Premium 4K
    const now = new Date();
    const oneMonthAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    this.subscriptions.set('sub_demo_enkhjin', {
      id: 'sub_demo_enkhjin',
      userId: 'user_enkhjin',
      planId: 'standard',
      status: 'ACTIVE',
      startDate: now,
      endDate: oneMonthAhead,
      paymentId: 'pay_demo_enkhjin',
      createdAt: now,
      updatedAt: now
    });

    this.subscriptions.set('sub_demo_temuulen', {
      id: 'sub_demo_temuulen',
      userId: 'user_temuulen',
      planId: 'premium',
      status: 'ACTIVE',
      startDate: now,
      endDate: oneMonthAhead,
      paymentId: 'pay_demo_temuulen',
      createdAt: now,
      updatedAt: now
    });
  }

  public clear() {
    this.users.clear();
    this.payments.clear();
    this.subscriptions.clear();
    this.webhookEvents.clear();
    this.seedDemoData();
  }
}

export const memDb = new MemoryDatabase();

export const Storage = {
  // -------------------------------------------------------------
  // Payments
  // -------------------------------------------------------------
  async createPayment(payment: Omit<IPayment, 'createdAt'> & { createdAt?: Date }): Promise<IPayment> {
    const isMongo = await connectDB();
    const created: IPayment = {
      ...payment,
      paymentMethod: payment.paymentMethod || 'wire_qpay',
      createdAt: payment.createdAt || new Date()
    };

    if (isMongo) {
      try {
        const doc = await PaymentModel.create(created);
        return {
          id: doc._id.toString(),
          userId: doc.userId,
          orderNumber: doc.orderNumber,
          planId: doc.planId,
          paymentMethod: doc.paymentMethod as any,
          wirePaymentIntentId: doc.wirePaymentIntentId,
          wireCheckoutSessionId: doc.wireCheckoutSessionId || undefined,
          wireChargeId: doc.wireChargeId || undefined,
          bankSenderName: doc.bankSenderName || undefined,
          bankTransferRef: doc.bankTransferRef || undefined,
          amount: doc.amount,
          currency: doc.currency,
          status: doc.status as PaymentStatus,
          checkoutUrl: doc.checkoutUrl || undefined,
          createdAt: doc.createdAt,
          paidAt: doc.paidAt || undefined
        };
      } catch (err) {
        console.warn('[Storage.createPayment] MongoDB error, falling back to memory store:', (err as Error).message);
      }
    }

    // In-memory
    const id = 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const item: IPayment = { ...created, id };
    memDb.payments.set(id, item);
    return item;
  },

  async getPaymentByOrderNumber(orderNumber: string): Promise<IPayment | null> {
    const isMongo = await connectDB();
    if (isMongo) {
      try {
        const doc = await PaymentModel.findOne({ orderNumber }).lean();
        if (doc) {
          return {
            id: (doc as any)._id?.toString(),
            userId: doc.userId,
            orderNumber: doc.orderNumber,
            planId: doc.planId,
            paymentMethod: (doc as any).paymentMethod || 'wire_qpay',
            wirePaymentIntentId: doc.wirePaymentIntentId,
            wireCheckoutSessionId: doc.wireCheckoutSessionId || undefined,
            wireChargeId: doc.wireChargeId || undefined,
            bankSenderName: (doc as any).bankSenderName || undefined,
            bankTransferRef: (doc as any).bankTransferRef || undefined,
            amount: doc.amount,
            currency: doc.currency,
            status: doc.status as PaymentStatus,
            checkoutUrl: doc.checkoutUrl || undefined,
            createdAt: doc.createdAt,
            paidAt: doc.paidAt || undefined
          };
        }
      } catch (err) {
        console.warn('[Storage.getPaymentByOrderNumber] MongoDB error, falling back to memory store:', (err as Error).message);
      }
    }

    for (const p of memDb.payments.values()) {
      if (p.orderNumber === orderNumber) return p;
    }
    return null;
  },

  async getPaymentByIntentId(intentId: string): Promise<IPayment | null> {
    const isMongo = await connectDB();
    if (isMongo) {
      const doc = await PaymentModel.findOne({ wirePaymentIntentId: intentId }).lean();
      if (!doc) return null;
      return {
        id: (doc as any)._id?.toString(),
        userId: doc.userId,
        orderNumber: doc.orderNumber,
        planId: doc.planId,
        paymentMethod: (doc as any).paymentMethod || 'wire_qpay',
        wirePaymentIntentId: doc.wirePaymentIntentId,
        wireCheckoutSessionId: doc.wireCheckoutSessionId || undefined,
        wireChargeId: doc.wireChargeId || undefined,
        bankSenderName: (doc as any).bankSenderName || undefined,
        bankTransferRef: (doc as any).bankTransferRef || undefined,
        amount: doc.amount,
        currency: doc.currency,
        status: doc.status as PaymentStatus,
        checkoutUrl: doc.checkoutUrl || undefined,
        createdAt: doc.createdAt,
        paidAt: doc.paidAt || undefined
      };
    }

    for (const p of memDb.payments.values()) {
      if (p.wirePaymentIntentId === intentId) return p;
    }
    return null;
  },

  async updatePaymentStatus(
    orderNumber: string,
    status: PaymentStatus,
    extra?: { paidAt?: Date; wireChargeId?: string; bankSenderName?: string; bankTransferRef?: string }
  ): Promise<IPayment | null> {
    const isMongo = await connectDB();
    if (isMongo) {
      const updateData: any = { status };
      if (extra?.paidAt) updateData.paidAt = extra.paidAt;
      if (extra?.wireChargeId) updateData.wireChargeId = extra.wireChargeId;
      if (extra?.bankSenderName) updateData.bankSenderName = extra.bankSenderName;
      if (extra?.bankTransferRef) updateData.bankTransferRef = extra.bankTransferRef;

      const doc = await PaymentModel.findOneAndUpdate({ orderNumber }, updateData, { new: true }).lean();
      if (!doc) return null;
      return {
        id: (doc as any)._id?.toString(),
        userId: doc.userId,
        orderNumber: doc.orderNumber,
        planId: doc.planId,
        paymentMethod: (doc as any).paymentMethod || 'wire_qpay',
        wirePaymentIntentId: doc.wirePaymentIntentId,
        wireCheckoutSessionId: doc.wireCheckoutSessionId || undefined,
        wireChargeId: doc.wireChargeId || undefined,
        bankSenderName: (doc as any).bankSenderName || undefined,
        bankTransferRef: (doc as any).bankTransferRef || undefined,
        amount: doc.amount,
        currency: doc.currency,
        status: doc.status as PaymentStatus,
        checkoutUrl: doc.checkoutUrl || undefined,
        createdAt: doc.createdAt,
        paidAt: doc.paidAt || undefined
      };
    }

    for (const [key, p] of memDb.payments.entries()) {
      if (p.orderNumber === orderNumber) {
        const updated: IPayment = {
          ...p,
          status,
          paidAt: extra?.paidAt !== undefined ? extra.paidAt : p.paidAt,
          wireChargeId: extra?.wireChargeId || p.wireChargeId,
          bankSenderName: extra?.bankSenderName || p.bankSenderName,
          bankTransferRef: extra?.bankTransferRef || p.bankTransferRef
        };
        memDb.payments.set(key, updated);
        return updated;
      }
    }
    return null;
  },

  async getPaymentsByUserId(userId: string): Promise<IPayment[]> {
    const isMongo = await connectDB();
    if (isMongo) {
      const docs = await PaymentModel.find({ userId }).sort({ createdAt: -1 }).lean();
      return docs.map((doc: any) => ({
        id: doc._id?.toString(),
        userId: doc.userId,
        orderNumber: doc.orderNumber,
        planId: doc.planId,
        paymentMethod: doc.paymentMethod || 'wire_qpay',
        wirePaymentIntentId: doc.wirePaymentIntentId,
        wireCheckoutSessionId: doc.wireCheckoutSessionId || undefined,
        wireChargeId: doc.wireChargeId || undefined,
        bankSenderName: doc.bankSenderName || undefined,
        bankTransferRef: doc.bankTransferRef || undefined,
        amount: doc.amount,
        currency: doc.currency,
        status: doc.status as PaymentStatus,
        checkoutUrl: doc.checkoutUrl || undefined,
        createdAt: doc.createdAt,
        paidAt: doc.paidAt || undefined
      }));
    }

    const list: IPayment[] = [];
    for (const p of memDb.payments.values()) {
      if (p.userId === userId) list.push(p);
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  // -------------------------------------------------------------
  // Subscriptions
  // -------------------------------------------------------------
  async getActiveSubscription(userId: string): Promise<ISubscription | null> {
    const isMongo = await connectDB();
    const now = new Date();

    if (isMongo) {
      const doc = await SubscriptionModel.findOne({
        userId,
        status: 'ACTIVE',
        endDate: { $gt: now }
      })
        .sort({ endDate: -1 })
        .lean();

      if (!doc) return null;
      return {
        id: (doc as any)._id?.toString(),
        userId: doc.userId,
        planId: doc.planId,
        status: doc.status as SubscriptionStatus,
        startDate: doc.startDate,
        endDate: doc.endDate,
        paymentId: doc.paymentId,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      };
    }

    // Check memory db
    for (const sub of memDb.subscriptions.values()) {
      if (sub.userId === userId && sub.status === 'ACTIVE' && sub.endDate.getTime() > now.getTime()) {
        return sub;
      }
    }
    return null;
  },

  async activateSubscription(params: {
    userId: string;
    planId: string;
    paymentId: string;
    durationDays?: number;
  }): Promise<ISubscription> {
    const isMongo = await connectDB();
    const durationDays = params.durationDays || 30;
    const now = new Date();

    // Check if user has an existing active subscription
    const existing = await this.getActiveSubscription(params.userId);

    // If active subscription exists and not expired, extend from existing endDate
    const startDate = existing ? existing.startDate : now;
    const baseEndDate = existing && existing.endDate > now ? existing.endDate : now;
    const endDate = new Date(baseEndDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    if (isMongo) {
      if (existing && existing.id) {
        const updated = await SubscriptionModel.findByIdAndUpdate(
          existing.id,
          {
            planId: params.planId,
            status: 'ACTIVE',
            endDate,
            paymentId: params.paymentId,
            updatedAt: now
          },
          { new: true }
        ).lean();

        return {
          id: (updated as any)._id?.toString(),
          userId: updated!.userId,
          planId: updated!.planId,
          status: updated!.status as SubscriptionStatus,
          startDate: updated!.startDate,
          endDate: updated!.endDate,
          paymentId: updated!.paymentId,
          createdAt: updated!.createdAt,
          updatedAt: updated!.updatedAt
        };
      } else {
        const created = await SubscriptionModel.create({
          userId: params.userId,
          planId: params.planId,
          status: 'ACTIVE',
          startDate,
          endDate,
          paymentId: params.paymentId
        });

        return {
          id: created._id.toString(),
          userId: created.userId,
          planId: created.planId,
          status: created.status as SubscriptionStatus,
          startDate: created.startDate,
          endDate: created.endDate,
          paymentId: created.paymentId,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt
        };
      }
    }

    // In-memory
    let targetId = existing?.id;
    if (targetId && memDb.subscriptions.has(targetId)) {
      const updated: ISubscription = {
        ...memDb.subscriptions.get(targetId)!,
        planId: params.planId,
        status: 'ACTIVE',
        endDate,
        paymentId: params.paymentId,
        updatedAt: now
      };
      memDb.subscriptions.set(targetId, updated);
      return updated;
    } else {
      const id = 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const created: ISubscription = {
        id,
        userId: params.userId,
        planId: params.planId,
        status: 'ACTIVE',
        startDate,
        endDate,
        paymentId: params.paymentId,
        createdAt: now,
        updatedAt: now
      };
      memDb.subscriptions.set(id, created);
      return created;
    }
  },

  // -------------------------------------------------------------
  // Webhook Events (Deduplication)
  // -------------------------------------------------------------
  async hasProcessedWebhookEvent(eventId: string): Promise<boolean> {
    const isMongo = await connectDB();
    if (isMongo) {
      const doc = await WireWebhookEventModel.findOne({ eventId, processed: true }).lean();
      return !!doc;
    }

    const event = memDb.webhookEvents.get(eventId);
    return !!event && event.processed;
  },

  async recordWebhookEvent(event: {
    eventId: string;
    eventType: string;
    paymentIntentId: string;
    processed: boolean;
    payloadSummary?: string;
  }): Promise<IWireWebhookEvent> {
    const isMongo = await connectDB();
    const now = new Date();

    if (isMongo) {
      const doc = await WireWebhookEventModel.findOneAndUpdate(
        { eventId: event.eventId },
        {
          ...event,
          processedAt: event.processed ? now : undefined
        },
        { upsert: true, new: true }
      ).lean();

      return {
        id: (doc as any)._id?.toString(),
        eventId: doc.eventId,
        eventType: doc.eventType,
        paymentIntentId: doc.paymentIntentId,
        processed: doc.processed,
        receivedAt: doc.receivedAt,
        processedAt: doc.processedAt || undefined,
        payloadSummary: doc.payloadSummary || undefined
      };
    }

    const item: IWireWebhookEvent = {
      id: 'wev_' + Date.now(),
      ...event,
      receivedAt: now,
      processedAt: event.processed ? now : undefined
    };
    memDb.webhookEvents.set(event.eventId, item);
    return item;
  },

  // -------------------------------------------------------------
  // Users (Registration & Authentication)
  // -------------------------------------------------------------
  async createUser(user: { name: string; email: string; passwordHash: string; role?: string }): Promise<IUser> {
    const isMongo = await connectDB();
    const created: IUser = {
      name: user.name.trim(),
      email: user.email.trim().toLowerCase(),
      passwordHash: user.passwordHash,
      role: user.role || 'member',
      createdAt: new Date()
    };

    if (isMongo) {
      try {
        const doc = await UserModel.create(created);
        return {
          id: doc._id.toString(),
          name: doc.name,
          email: doc.email,
          passwordHash: doc.passwordHash,
          role: doc.role,
          createdAt: doc.createdAt
        };
      } catch (err) {
        console.warn('[Storage.createUser] MongoDB error, falling back to memory store:', (err as Error).message);
      }
    }

    const id = 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const item: IUser = { ...created, id };
    memDb.users.set(id, item);
    return item;
  },

  async getUserByEmail(email: string): Promise<IUser | null> {
    const normalized = email.trim().toLowerCase();
    const isMongo = await connectDB();
    if (isMongo) {
      try {
        const doc = await UserModel.findOne({ email: normalized }).lean();
        if (doc) {
          return {
            id: (doc as any)._id?.toString(),
            name: doc.name,
            email: doc.email,
            passwordHash: doc.passwordHash,
            role: doc.role,
            createdAt: doc.createdAt
          };
        }
      } catch (err) {
        console.warn('[Storage.getUserByEmail] MongoDB error:', (err as Error).message);
      }
    }

    for (const u of memDb.users.values()) {
      if (u.email.toLowerCase() === normalized) return u;
    }
    return null;
  },

  async getUserById(id: string): Promise<IUser | null> {
    const isMongo = await connectDB();
    if (isMongo) {
      try {
        const doc = await UserModel.findById(id).lean();
        if (doc) {
          return {
            id: (doc as any)._id?.toString(),
            name: doc.name,
            email: doc.email,
            passwordHash: doc.passwordHash,
            role: doc.role,
            createdAt: doc.createdAt
          };
        }
      } catch (err) {
        // ID might not be a valid MongoDB ObjectId (e.g. user_batbayar)
      }
    }

    return memDb.users.get(id) || null;
  },

  async getAllUsers(): Promise<IUser[]> {
    const isMongo = await connectDB();
    if (isMongo) {
      try {
        const docs = await UserModel.find().sort({ createdAt: -1 }).lean();
        if (docs.length > 0) {
          return docs.map((doc: any) => ({
            id: doc._id?.toString(),
            name: doc.name,
            email: doc.email,
            passwordHash: doc.passwordHash,
            role: doc.role,
            createdAt: doc.createdAt
          }));
        }
      } catch (err) {
        console.warn('[Storage.getAllUsers] MongoDB error:', (err as Error).message);
      }
    }

    return Array.from(memDb.users.values());
  }
};

