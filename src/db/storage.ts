import mongoose from 'mongoose';
import {
  IPayment,
  ISubscription,
  IWireWebhookEvent,
  IUser,
  IMovie,
  ICategory,
  IAuditLog,
  UserModel,
  PaymentModel,
  SubscriptionModel,
  WireWebhookEventModel,
  MovieModel,
  CategoryModel,
  AuditLogModel,
  PaymentStatus,
  SubscriptionStatus
} from './models.js';
import { hashPassword } from '../utils/crypto.js';
import { MOVIES } from '../data/movies.js';

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
  public movies: Map<string, IMovie> = new Map();
  public categories: Map<string, ICategory> = new Map();
  public auditLogs: IAuditLog[] = [];

  constructor() {
    this.seedDemoData();
  }

  private seedDemoData() {
    const defaultPassword = hashPassword('password123');

    const demoUsers: IUser[] = [
      {
        id: 'user_admin',
        name: 'Системийн Администратор',
        email: 'admin@aimovie.mn',
        passwordHash: defaultPassword,
        role: 'admin',
        status: 'active',
        createdAt: new Date('2025-12-01')
      },
      {
        id: 'user_temuulen',
        name: 'Тэмүүлэн',
        email: 'temuulen@aimovie.mn',
        passwordHash: defaultPassword,
        role: 'user',
        status: 'active',
        createdAt: new Date('2026-01-03')
      },
      {
        id: 'user_batbayar',
        name: 'Батбаяр',
        email: 'batbayar@aimovie.mn',
        passwordHash: defaultPassword,
        role: 'user',
        status: 'active',
        createdAt: new Date('2026-01-01')
      },
      {
        id: 'user_enkhjin',
        name: 'Энхжин',
        email: 'enkhjin@aimovie.mn',
        passwordHash: defaultPassword,
        role: 'user',
        status: 'active',
        createdAt: new Date('2026-01-02')
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

    // Seed Initial Categories
    const initialCategories: ICategory[] = [
      { id: 'cat-action', slug: 'action', nameMn: 'Тулаант', nameEn: 'Action', descriptionMn: 'Эрч хүч, тулаантай кинонууд', descriptionEn: 'High-octane action films', order: 1 },
      { id: 'cat-scifi', slug: 'scifi', nameMn: 'Уран зөгнөлт', nameEn: 'Sci-Fi', descriptionMn: 'Ирээдүй, AI технологи, сансар', descriptionEn: 'Futuristic sci-fi and AI synthetic cinema', order: 2 },
      { id: 'cat-thriller', slug: 'thriller', nameMn: 'Триллер', nameEn: 'Thriller', descriptionMn: 'Сэтгэл хөдөлгөм, нууцлаг кинонууд', descriptionEn: 'Gripping psychological thrillers', order: 3 },
      { id: 'cat-horror', slug: 'horror', nameMn: 'Аймшгийн', nameEn: 'Horror', descriptionMn: 'Сүрдэм, айдас дагуулсан үзвэрүүд', descriptionEn: 'Spine-chilling horror and suspense', order: 4 },
      { id: 'cat-drama', slug: 'drama', nameMn: 'Драма', nameEn: 'Drama', descriptionMn: 'Хүмүүний харилцаа, гүн сэтгэгдэл', descriptionEn: 'Deep emotional human stories', order: 5 },
      { id: 'cat-comedy', slug: 'comedy', nameMn: 'Инээдмийн', nameEn: 'Comedy', descriptionMn: 'Хөгжилтэй, инээд бэлэглэх бүтээлүүд', descriptionEn: 'Lighthearted and hilarious comedies', order: 6 },
      { id: 'cat-fantasy', slug: 'fantasy', nameMn: 'Уран сэтгэмж', nameEn: 'Fantasy', descriptionMn: 'Домог, шидэт ертөнц', descriptionEn: 'Mythical and magic-infused realms', order: 7 },
      { id: 'cat-anime', slug: 'anime', nameMn: 'Анимэ', nameEn: 'Anime', descriptionMn: 'AI анимейшн ба хүүхэлдэйн кино', descriptionEn: 'Generative anime and animated stories', order: 8 },
      { id: 'cat-adventure', slug: 'adventure', nameMn: 'Адал явдалт', nameEn: 'Adventure', descriptionMn: 'Аялал, эрэл хайгуул, адал явдал', descriptionEn: 'Expeditions and quests into the unknown', order: 9 },
      { id: 'cat-documentary', slug: 'documentary', nameMn: 'Баримтат', nameEn: 'Documentary', descriptionMn: 'Бодит түүх, шинжлэх ухаан', descriptionEn: 'Fact-based stories and tech deep-dives', order: 10 }
    ];

    for (const c of initialCategories) {
      this.categories.set(c.id, c);
    }

    // Seed Initial Movies
    for (const m of MOVIES) {
      const mnTitle = typeof m.title === 'object' && m.title ? m.title.mn || m.titleMn : m.titleMn;
      const enTitle = typeof m.title === 'object' && m.title ? m.title.en || m.titleEn : m.titleEn;
      const mnSyn = typeof m.synopsis === 'object' && m.synopsis ? m.synopsis.mn || m.descriptionMn : m.descriptionMn;
      const enSyn = typeof m.synopsis === 'object' && m.synopsis ? m.synopsis.en || m.descriptionEn || '' : m.descriptionEn || '';

      const movieDoc: IMovie = {
        id: m.id,
        slug: m.id,
        title: { mn: mnTitle, en: enTitle },
        synopsis: { mn: mnSyn, en: enSyn },
        titleMn: mnTitle,
        titleEn: enTitle,
        descriptionMn: mnSyn,
        descriptionEn: enSyn,
        posterUrl: m.posterUrl,
        backdropUrl: m.bannerUrl || m.posterUrl,
        bannerUrl: m.bannerUrl,
        videoUrl: m.videoSource,
        videoSource: m.videoSource,
        trailerUrl: m.trailerUrl,
        year: m.year,
        duration: m.duration,
        genres: [m.genreMn || 'Sci-Fi'],
        genreMn: m.genreMn,
        genreEn: m.genreEn,
        rating: m.rating,
        ageRating: '13+',
        quality: m.quality,
        director: {
          mn: typeof m.director === 'object' && m.director ? m.director.mn || m.directorMn : m.directorMn,
          en: typeof m.director === 'object' && m.director ? m.director.en || m.directorEn || '' : m.directorEn || ''
        },
        directorMn: m.directorMn,
        directorEn: m.directorEn,
        cast: {
          mn: typeof m.cast === 'object' && m.cast ? m.cast.mn || m.castMn || '' : m.castMn || '',
          en: typeof m.cast === 'object' && m.cast ? m.cast.en || m.castEn || '' : m.castEn || ''
        },
        castMn: m.castMn,
        castEn: m.castEn,
        language: 'mn',
        type: 'movie',
        featured: Boolean(m.featured),
        isPremium: Boolean(m.isPremium),
        minPlan: m.minPlan || 'basic',
        published: true,
        viewsCount: Math.floor(Math.random() * 2000) + 500,
        tags: m.tags || [],
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01')
      };

      this.movies.set(movieDoc.id, movieDoc);
    }
  }

  public clear() {
    this.users.clear();
    this.payments.clear();
    this.subscriptions.clear();
    this.webhookEvents.clear();
    this.movies.clear();
    this.categories.clear();
    this.auditLogs = [];
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
      // Mandatory security rule: newly registered users always receive 'user' role
      role: 'user',
      status: 'active',
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
          status: doc.status || 'active',
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
            role: (doc as any).role === 'admin' ? 'admin' : 'user',
            status: (doc as any).status || 'active',
            lastLoginAt: (doc as any).lastLoginAt,
            createdAt: doc.createdAt
          };
        }
      } catch (err) {
        console.warn('[Storage.getUserByEmail] MongoDB error:', (err as Error).message);
      }
    }

    for (const u of memDb.users.values()) {
      if (u.email.toLowerCase() === normalized) {
        return {
          ...u,
          role: u.role === 'admin' ? 'admin' : 'user',
          status: u.status || 'active'
        };
      }
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
            role: (doc as any).role === 'admin' ? 'admin' : 'user',
            status: (doc as any).status || 'active',
            lastLoginAt: (doc as any).lastLoginAt,
            createdAt: doc.createdAt
          };
        }
      } catch (err) {
        // ID might not be a valid MongoDB ObjectId (e.g. user_batbayar)
      }
    }

    const mem = memDb.users.get(id);
    if (mem) {
      return {
        ...mem,
        role: mem.role === 'admin' ? 'admin' : 'user',
        status: mem.status || 'active'
      };
    }
    return null;
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
            role: doc.role === 'admin' ? 'admin' : 'user',
            status: doc.status || 'active',
            lastLoginAt: doc.lastLoginAt,
            createdAt: doc.createdAt
          }));
        }
      } catch (err) {
        console.warn('[Storage.getAllUsers] MongoDB error:', (err as Error).message);
      }
    }

    return Array.from(memDb.users.values()).map((u) => ({
      ...u,
      role: u.role === 'admin' ? 'admin' : 'user',
      status: u.status || 'active'
    }));
  },

  async countAdmins(): Promise<number> {
    const users = await this.getAllUsers();
    return users.filter((u) => u.role === 'admin' && u.status !== 'suspended').length;
  },

  async setUserRole(userId: string, role: 'user' | 'admin'): Promise<IUser> {
    const target = await this.getUserById(userId);
    if (!target) throw new Error('Хэрэглэгч олдсонгүй.');

    if (target.role === 'admin' && role === 'user') {
      const activeAdmins = await this.countAdmins();
      if (activeAdmins <= 1) {
        throw new Error('Хамгийн сүүлийн администраторын эрхийг хасах боломжгүй.');
      }
    }

    const isMongo = await connectDB();
    if (isMongo) {
      try {
        const updated = await UserModel.findByIdAndUpdate(userId, { role }, { new: true }).lean();
        if (updated) {
          return {
            id: (updated as any)._id?.toString(),
            name: updated.name,
            email: updated.email,
            passwordHash: updated.passwordHash,
            role: (updated as any).role,
            status: (updated as any).status || 'active',
            createdAt: updated.createdAt
          };
        }
      } catch (err) {
        console.warn('[Storage.setUserRole] MongoDB update error:', (err as Error).message);
      }
    }

    const mem = memDb.users.get(userId) || target;
    mem.role = role;
    memDb.users.set(userId, mem);
    return mem;
  },

  async setUserStatus(userId: string, status: 'active' | 'suspended'): Promise<IUser> {
    const target = await this.getUserById(userId);
    if (!target) throw new Error('Хэрэглэгч олдсонгүй.');

    if (target.role === 'admin' && status === 'suspended') {
      const activeAdmins = await this.countAdmins();
      if (activeAdmins <= 1) {
        throw new Error('Хамгийн сүүлийн администраторыг түдгэлзүүлэх боломжгүй.');
      }
    }

    const isMongo = await connectDB();
    if (isMongo) {
      try {
        const updated = await UserModel.findByIdAndUpdate(userId, { status }, { new: true }).lean();
        if (updated) {
          return {
            id: (updated as any)._id?.toString(),
            name: updated.name,
            email: updated.email,
            passwordHash: updated.passwordHash,
            role: (updated as any).role,
            status: (updated as any).status,
            createdAt: updated.createdAt
          };
        }
      } catch (err) {
        console.warn('[Storage.setUserStatus] MongoDB error:', (err as Error).message);
      }
    }

    const mem = memDb.users.get(userId) || target;
    mem.status = status;
    memDb.users.set(userId, mem);
    return mem;
  },

  async updateUser(userId: string, updates: { name?: string; lastLoginAt?: Date }): Promise<IUser> {
    const target = await this.getUserById(userId);
    if (!target) throw new Error('Хэрэглэгч олдсонгүй.');

    const isMongo = await connectDB();
    if (isMongo) {
      try {
        const updated = await UserModel.findByIdAndUpdate(userId, updates, { new: true }).lean();
        if (updated) {
          return {
            id: (updated as any)._id?.toString(),
            name: updated.name,
            email: updated.email,
            passwordHash: updated.passwordHash,
            role: (updated as any).role,
            status: (updated as any).status || 'active',
            lastLoginAt: (updated as any).lastLoginAt,
            createdAt: updated.createdAt
          };
        }
      } catch (err) {
        console.warn('[Storage.updateUser] MongoDB error:', (err as Error).message);
      }
    }

    const mem = memDb.users.get(userId) || target;
    if (updates.name) mem.name = updates.name.trim();
    if (updates.lastLoginAt) mem.lastLoginAt = updates.lastLoginAt;
    memDb.users.set(userId, mem);
    return mem;
  },

  async updateUserPassword(userId: string, passwordHash: string): Promise<boolean> {
    const target = await this.getUserById(userId);
    if (!target) return false;

    const isMongo = await connectDB();
    if (isMongo) {
      try {
        await UserModel.findByIdAndUpdate(userId, { passwordHash });
        return true;
      } catch (err) {
        console.warn('[Storage.updateUserPassword] MongoDB error:', (err as Error).message);
      }
    }

    const mem = memDb.users.get(userId) || target;
    mem.passwordHash = passwordHash;
    memDb.users.set(userId, mem);
    return true;
  },

  // -------------------------------------------------------------
  // Movies Management
  // -------------------------------------------------------------
  async getAllMovies(options?: { publishedOnly?: boolean; featuredOnly?: boolean; search?: string; genre?: string }): Promise<IMovie[]> {
    const isMongo = await connectDB();
    if (isMongo) {
      try {
        const filter: any = {};
        if (options?.publishedOnly) filter.published = true;
        if (options?.featuredOnly) filter.featured = true;
        if (options?.genre && options.genre !== 'all') {
          filter.genres = { $in: [new RegExp(options.genre, 'i')] };
        }
        if (options?.search) {
          const s = options.search;
          filter.$or = [
            { 'title.mn': new RegExp(s, 'i') },
            { 'title.en': new RegExp(s, 'i') },
            { titleMn: new RegExp(s, 'i') },
            { titleEn: new RegExp(s, 'i') }
          ];
        }

        const docs = await MovieModel.find(filter).sort({ createdAt: -1 }).lean();
        if (docs.length > 0) {
          return docs.map((d: any) => ({
            id: d.id || d._id?.toString(),
            slug: d.slug || d.id,
            title: d.title || { mn: d.titleMn, en: d.titleEn },
            synopsis: d.synopsis || { mn: d.descriptionMn, en: d.descriptionEn },
            titleMn: d.titleMn || d.title?.mn,
            titleEn: d.titleEn || d.title?.en,
            descriptionMn: d.descriptionMn || d.synopsis?.mn,
            descriptionEn: d.descriptionEn || d.synopsis?.en,
            posterUrl: d.posterUrl,
            backdropUrl: d.backdropUrl || d.bannerUrl || d.posterUrl,
            bannerUrl: d.bannerUrl,
            videoUrl: d.videoUrl || d.videoSource,
            videoSource: d.videoSource || d.videoUrl,
            trailerUrl: d.trailerUrl || '',
            year: d.year,
            duration: d.duration,
            genres: d.genres || [],
            genreMn: d.genreMn || d.genres?.[0] || '',
            genreEn: d.genreEn || d.genres?.[0] || '',
            rating: d.rating || '8.5',
            ageRating: d.ageRating || '13+',
            quality: d.quality || '1080p Full HD',
            director: d.director || { mn: d.directorMn || '', en: d.directorEn || '' },
            directorMn: d.directorMn || d.director?.mn,
            directorEn: d.directorEn || d.director?.en,
            cast: d.cast || { mn: d.castMn || '', en: d.castEn || '' },
            castMn: d.castMn || d.cast?.mn,
            castEn: d.castEn || d.cast?.en,
            language: d.language || 'mn',
            type: d.type || 'movie',
            featured: Boolean(d.featured),
            isPremium: Boolean(d.isPremium),
            minPlan: d.minPlan || 'basic',
            published: d.published !== false,
            viewsCount: d.viewsCount || 0,
            tags: d.tags || [],
            createdAt: d.createdAt || new Date(),
            updatedAt: d.updatedAt || new Date()
          }));
        }
      } catch (err) {
        console.warn('[Storage.getAllMovies] MongoDB error, using memory store:', (err as Error).message);
      }
    }

    let list = Array.from(memDb.movies.values());
    if (options?.publishedOnly) {
      list = list.filter((m) => m.published);
    }
    if (options?.featuredOnly) {
      list = list.filter((m) => m.featured);
    }
    if (options?.genre && options.genre !== 'all') {
      const g = options.genre.toLowerCase();
      list = list.filter((m) => m.genres.some((x) => x.toLowerCase().includes(g)));
    }
    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      list = list.filter((m) => {
        const mn = (m.title?.mn || m.titleMn || '').toLowerCase();
        const en = (m.title?.en || m.titleEn || '').toLowerCase();
        return mn.includes(q) || en.includes(q);
      });
    }
    return list.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  },

  async getMovieById(id: string): Promise<IMovie | null> {
    const isMongo = await connectDB();
    if (isMongo) {
      try {
        const doc = await MovieModel.findOne({ $or: [{ id }, { slug: id }] }).lean();
        if (doc) {
          const d = doc as any;
          return {
            id: d.id,
            slug: d.slug || d.id,
            title: d.title || { mn: d.titleMn, en: d.titleEn },
            synopsis: d.synopsis || { mn: d.descriptionMn, en: d.descriptionEn },
            titleMn: d.titleMn || d.title?.mn,
            titleEn: d.titleEn || d.title?.en,
            descriptionMn: d.descriptionMn || d.synopsis?.mn,
            descriptionEn: d.descriptionEn || d.synopsis?.en,
            posterUrl: d.posterUrl,
            backdropUrl: d.backdropUrl || d.bannerUrl || d.posterUrl,
            bannerUrl: d.bannerUrl,
            videoUrl: d.videoUrl || d.videoSource,
            videoSource: d.videoSource || d.videoUrl,
            trailerUrl: d.trailerUrl || '',
            year: d.year,
            duration: d.duration,
            genres: d.genres || [],
            genreMn: d.genreMn,
            genreEn: d.genreEn,
            rating: d.rating,
            ageRating: d.ageRating,
            quality: d.quality,
            director: d.director || { mn: d.directorMn || '', en: d.directorEn || '' },
            directorMn: d.directorMn,
            directorEn: d.directorEn,
            cast: d.cast || { mn: d.castMn || '', en: d.castEn || '' },
            castMn: d.castMn,
            castEn: d.castEn,
            language: d.language || 'mn',
            type: d.type || 'movie',
            featured: Boolean(d.featured),
            isPremium: Boolean(d.isPremium),
            minPlan: d.minPlan || 'basic',
            published: d.published !== false,
            viewsCount: d.viewsCount || 0,
            tags: d.tags || [],
            createdAt: d.createdAt,
            updatedAt: d.updatedAt
          };
        }
      } catch (err) {
        console.warn('[Storage.getMovieById] MongoDB error:', (err as Error).message);
      }
    }

    return memDb.movies.get(id) || null;
  },

  async createMovie(data: Partial<IMovie>): Promise<IMovie> {
    const id = data.slug || data.id || `movie_${Date.now()}`;
    const mnTitle = data.titleMn || data.title?.mn || 'Гарчиггүй';
    const enTitle = data.titleEn || data.title?.en || 'Untitled';
    const mnSyn = data.descriptionMn || data.synopsis?.mn || '';
    const enSyn = data.descriptionEn || data.synopsis?.en || '';

    const movie: IMovie = {
      id,
      slug: data.slug || id,
      title: { mn: mnTitle, en: enTitle },
      synopsis: { mn: mnSyn, en: enSyn },
      titleMn: mnTitle,
      titleEn: enTitle,
      descriptionMn: mnSyn,
      descriptionEn: enSyn,
      posterUrl: data.posterUrl || '',
      backdropUrl: data.backdropUrl || data.posterUrl || '',
      bannerUrl: data.bannerUrl || data.backdropUrl || data.posterUrl,
      videoUrl: data.videoUrl || data.videoSource || '',
      videoSource: data.videoUrl || data.videoSource || '',
      trailerUrl: data.trailerUrl || '',
      year: data.year || new Date().getFullYear(),
      duration: data.duration || '1h 30m',
      genres: data.genres && data.genres.length > 0 ? data.genres : ['Sci-Fi'],
      genreMn: data.genres?.[0] || 'Sci-Fi',
      genreEn: data.genres?.[0] || 'Sci-Fi',
      rating: data.rating || '8.5',
      ageRating: data.ageRating || '13+',
      quality: data.quality || '1080p Full HD',
      director: { mn: data.directorMn || '', en: data.directorEn || '' },
      directorMn: data.directorMn || '',
      directorEn: data.directorEn || '',
      cast: { mn: data.castMn || '', en: data.castEn || '' },
      castMn: data.castMn || '',
      castEn: data.castEn || '',
      language: data.language || 'mn',
      type: data.type || 'movie',
      featured: Boolean(data.featured),
      isPremium: data.isPremium !== false,
      minPlan: data.minPlan || 'basic',
      published: data.published !== false,
      viewsCount: 0,
      tags: data.tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const isMongo = await connectDB();
    if (isMongo) {
      try {
        await MovieModel.create(movie);
      } catch (err) {
        console.warn('[Storage.createMovie] MongoDB error:', (err as Error).message);
      }
    }

    memDb.movies.set(movie.id, movie);
    return movie;
  },

  async updateMovie(id: string, updates: Partial<IMovie>): Promise<IMovie | null> {
    const existing = await this.getMovieById(id);
    if (!existing) return null;

    const merged: IMovie = {
      ...existing,
      ...updates,
      title: {
        mn: updates.titleMn || updates.title?.mn || existing.title.mn,
        en: updates.titleEn || updates.title?.en || existing.title.en
      },
      synopsis: {
        mn: updates.descriptionMn || updates.synopsis?.mn || existing.synopsis.mn,
        en: updates.descriptionEn || updates.synopsis?.en || existing.synopsis.en
      },
      titleMn: updates.titleMn || updates.title?.mn || existing.titleMn,
      titleEn: updates.titleEn || updates.title?.en || existing.titleEn,
      descriptionMn: updates.descriptionMn || updates.synopsis?.mn || existing.descriptionMn,
      descriptionEn: updates.descriptionEn || updates.synopsis?.en || existing.descriptionEn,
      director: {
        mn: updates.directorMn || updates.director?.mn || existing.director.mn,
        en: updates.directorEn || updates.director?.en || existing.director.en
      },
      cast: {
        mn: updates.castMn || updates.cast?.mn || existing.cast.mn,
        en: updates.castEn || updates.cast?.en || existing.cast.en
      },
      updatedAt: new Date()
    };

    const isMongo = await connectDB();
    if (isMongo) {
      try {
        await MovieModel.findOneAndUpdate({ id }, merged, { new: true });
      } catch (err) {
        console.warn('[Storage.updateMovie] MongoDB error:', (err as Error).message);
      }
    }

    memDb.movies.set(id, merged);
    return merged;
  },

  async deleteMovie(id: string): Promise<boolean> {
    const isMongo = await connectDB();
    if (isMongo) {
      try {
        await MovieModel.findOneAndDelete({ id });
      } catch (err) {
        console.warn('[Storage.deleteMovie] MongoDB error:', (err as Error).message);
      }
    }

    const had = memDb.movies.has(id);
    memDb.movies.delete(id);
    return had;
  },

  async incrementMovieViews(id: string): Promise<void> {
    const m = memDb.movies.get(id);
    if (m) {
      m.viewsCount = (m.viewsCount || 0) + 1;
    }
    const isMongo = await connectDB();
    if (isMongo) {
      try {
        await MovieModel.findOneAndUpdate({ id }, { $inc: { viewsCount: 1 } });
      } catch {}
    }
  },

  // -------------------------------------------------------------
  // Categories Management
  // -------------------------------------------------------------
  async getAllCategories(): Promise<ICategory[]> {
    const isMongo = await connectDB();
    if (isMongo) {
      try {
        const docs = await CategoryModel.find().sort({ order: 1 }).lean();
        if (docs.length > 0) {
          return docs.map((d: any) => ({
            id: d.id,
            slug: d.slug,
            nameMn: d.nameMn,
            nameEn: d.nameEn,
            descriptionMn: d.descriptionMn,
            descriptionEn: d.descriptionEn,
            imageUrl: d.imageUrl,
            order: d.order
          }));
        }
      } catch (err) {
        console.warn('[Storage.getAllCategories] MongoDB error:', (err as Error).message);
      }
    }

    return Array.from(memDb.categories.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  async createCategory(data: Partial<ICategory>): Promise<ICategory> {
    const id = `cat-${data.slug || Date.now()}`;
    const category: ICategory = {
      id,
      slug: data.slug || id,
      nameMn: data.nameMn || 'Шинэ ангилал',
      nameEn: data.nameEn || 'New Category',
      descriptionMn: data.descriptionMn,
      descriptionEn: data.descriptionEn,
      imageUrl: data.imageUrl,
      order: data.order || memDb.categories.size + 1
    };

    const isMongo = await connectDB();
    if (isMongo) {
      try {
        await CategoryModel.create(category);
      } catch (err) {
        console.warn('[Storage.createCategory] MongoDB error:', (err as Error).message);
      }
    }

    memDb.categories.set(category.id, category);
    return category;
  },

  async updateCategory(id: string, updates: Partial<ICategory>): Promise<ICategory | null> {
    const current = memDb.categories.get(id);
    if (!current) return null;

    const updated = { ...current, ...updates };

    const isMongo = await connectDB();
    if (isMongo) {
      try {
        await CategoryModel.findOneAndUpdate({ id }, updated);
      } catch {}
    }

    memDb.categories.set(id, updated);
    return updated;
  },

  async deleteCategory(id: string): Promise<boolean> {
    const isMongo = await connectDB();
    if (isMongo) {
      try {
        await CategoryModel.findOneAndDelete({ id });
      } catch {}
    }

    return memDb.categories.delete(id);
  },

  // -------------------------------------------------------------
  // Admin Payments & Subscriptions
  // -------------------------------------------------------------
  async getAllPayments(): Promise<IPayment[]> {
    const isMongo = await connectDB();
    if (isMongo) {
      try {
        const docs = await PaymentModel.find().sort({ createdAt: -1 }).lean();
        if (docs.length > 0) {
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
      } catch (err) {
        console.warn('[Storage.getAllPayments] MongoDB error:', (err as Error).message);
      }
    }

    return Array.from(memDb.payments.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  },

  async getAllSubscriptions(): Promise<ISubscription[]> {
    const isMongo = await connectDB();
    if (isMongo) {
      try {
        const docs = await SubscriptionModel.find().sort({ createdAt: -1 }).lean();
        if (docs.length > 0) {
          return docs.map((doc: any) => ({
            id: doc._id?.toString(),
            userId: doc.userId,
            planId: doc.planId,
            status: doc.status as SubscriptionStatus,
            startDate: doc.startDate,
            endDate: doc.endDate,
            paymentId: doc.paymentId,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
          }));
        }
      } catch (err) {
        console.warn('[Storage.getAllSubscriptions] MongoDB error:', (err as Error).message);
      }
    }

    return Array.from(memDb.subscriptions.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  },

  async adminAdjustSubscription(params: {
    userId: string;
    planId: string;
    durationDays: number;
    adminId: string;
    adminEmail: string;
  }): Promise<ISubscription> {
    const sub = await this.activateSubscription({
      userId: params.userId,
      planId: params.planId,
      paymentId: `admin_adjust_${Date.now()}`,
      durationDays: params.durationDays
    });

    await this.recordAuditLog({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: 'ADJUST_SUBSCRIPTION',
      target: params.userId,
      details: `Plan: ${params.planId}, Duration: +${params.durationDays} days`
    });

    return sub;
  },

  // -------------------------------------------------------------
  // Audit Logs
  // -------------------------------------------------------------
  async recordAuditLog(params: {
    adminId: string;
    adminEmail: string;
    action: string;
    target: string;
    details?: string;
  }): Promise<IAuditLog> {
    const log: IAuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: params.action,
      target: params.target,
      details: params.details,
      createdAt: new Date()
    };

    const isMongo = await connectDB();
    if (isMongo) {
      try {
        await AuditLogModel.create(log);
      } catch {}
    }

    memDb.auditLogs.unshift(log);
    if (memDb.auditLogs.length > 200) memDb.auditLogs.pop();
    return log;
  },

  async getAuditLogs(limit = 50): Promise<IAuditLog[]> {
    const isMongo = await connectDB();
    if (isMongo) {
      try {
        const docs = await AuditLogModel.find().sort({ createdAt: -1 }).limit(limit).lean();
        if (docs.length > 0) {
          return docs.map((d: any) => ({
            id: d._id?.toString(),
            adminId: d.adminId,
            adminEmail: d.adminEmail,
            action: d.action,
            target: d.target,
            details: d.details,
            createdAt: d.createdAt
          }));
        }
      } catch {}
    }

    return memDb.auditLogs.slice(0, limit);
  },

  // -------------------------------------------------------------
  // Dashboard Analytics
  // -------------------------------------------------------------
  async getDashboardStats() {
    const allMovies = await this.getAllMovies();
    const allUsers = await this.getAllUsers();
    const allSubs = await this.getAllSubscriptions();
    const allPayments = await this.getAllPayments();

    const now = new Date();
    const activeSubs = allSubs.filter(
      (s) => s.status === 'ACTIVE' && new Date(s.endDate).getTime() > now.getTime()
    );

    const paidPayments = allPayments.filter((p) => p.status === 'PAID');
    const totalRevenue = paidPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthPayments = paidPayments.filter((p) => {
      const d = new Date(p.paidAt || p.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthRevenue = monthPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    const pendingPayments = allPayments.filter((p) => p.status === 'PENDING').length;

    // Monthly revenue trend (last 6 months)
    const monthNames = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];
    const monthlyRevenueData = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const m = targetDate.getMonth();
      const y = targetDate.getFullYear();
      const sum = paidPayments
        .filter((p) => {
          const d = new Date(p.paidAt || p.createdAt);
          return d.getMonth() === m && d.getFullYear() === y;
        })
        .reduce((acc, p) => acc + (p.amount || 0), 0);
      monthlyRevenueData.push({
        label: `${monthNames[m]}`,
        year: y,
        amount: sum
      });
    }

    // Subscription distribution
    const subDist: Record<string, number> = { basic: 0, standard: 0, premium: 0 };
    for (const s of activeSubs) {
      if (subDist[s.planId] !== undefined) {
        subDist[s.planId]++;
      } else {
        subDist[s.planId] = 1;
      }
    }

    return {
      totalMovies: allMovies.length,
      totalUsers: allUsers.length,
      activeSubscriptions: activeSubs.length,
      totalRevenue,
      monthRevenue,
      pendingPayments,
      recentPayments: allPayments.slice(0, 5),
      recentUsers: allUsers.slice(0, 5),
      recentMovies: allMovies.slice(0, 5),
      topMovies: [...allMovies].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 5),
      monthlyRevenueData,
      subscriptionDistribution: subDist
    };
  }
};

