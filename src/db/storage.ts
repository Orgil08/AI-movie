import mongoose from 'mongoose';
import {
  IPayment,
  ISubscription,
  IWireWebhookEvent,
  IUser,
  IMovie,
  ICategory,
  IAuditLog,
  IPasswordResetToken,
  IWebsiteSettings,
  UserModel,
  PaymentModel,
  SubscriptionModel,
  WireWebhookEventModel,
  MovieModel,
  CategoryModel,
  AuditLogModel,
  PasswordResetTokenModel,
  WebsiteSettingsModel,
  PaymentStatus,
  SubscriptionStatus
} from './models.js';
import crypto from 'node:crypto';
import { hashPassword } from '../utils/crypto.js';
import { MOVIES } from '../data/movies.js';

// Disable command buffering so operations never hang when disconnected
mongoose.set('bufferCommands', false);

let isConnected = false;
let connectionPromise: Promise<boolean> | null = null;

export function isMongoUriConfigured(): boolean {
  const uri = process.env.MONGODB_URI;
  return Boolean(uri && uri.trim() !== '' && !uri.includes('<') && !uri.includes('>'));
}

export async function connectDB(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.trim() === '' || uri.includes('<') || uri.includes('>')) {
    if (process.env.NODE_ENV === 'production') {
      const err = new Error('MONGODB_URI is not configured in production.');
      (err as any).code = 'DATABASE_NOT_CONFIGURED';
      (err as any).statusCode = 503;
      throw err;
    }
    return false;
  }

  if (isConnected && mongoose.connection.readyState === 1) return true;
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return true;
  }
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        maxPoolSize: 10
      });
      isConnected = mongoose.connection.readyState === 1;
      if (isConnected) {
        console.log('[Database] Connected successfully to MongoDB Atlas');
      }
      return isConnected;
    } catch (err) {
      isConnected = false;
      console.error('[Database] MongoDB connection failed:', (err as Error).message);
      if (process.env.NODE_ENV === 'production') {
        const dbErr = new Error(`MongoDB connection failed: ${(err as Error).message}`);
        (dbErr as any).code = 'DATABASE_UNAVAILABLE';
        (dbErr as any).statusCode = 503;
        throw dbErr;
      }
      return false;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

export function isMongoActive(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

/** Production operations must never fall back to ephemeral memory data. */
function requireMongoInProduction(isMongo: boolean): void {
  if (process.env.NODE_ENV === 'production' && !isMongo) {
    const err = new Error('MongoDB is unavailable; production data cannot use the in-memory store.');
    (err as any).code = 'DATABASE_UNAVAILABLE';
    (err as any).statusCode = 503;
    throw err;
  }
}

export function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

export function normalizeMovieDoc(d: any): IMovie {
  const id = d.id || d.slug || d._id?.toString() || `movie_${Date.now()}`;
  const slug = d.slug || id;
  const mnTitle = d.titleMn || d.title?.mn || 'Гарчиггүй';
  const enTitle = d.titleEn || d.title?.en || mnTitle || 'Untitled';
  const mnSyn = d.synopsisMn || d.descriptionMn || d.synopsis?.mn || '';
  const enSyn = d.synopsisEn || d.descriptionEn || d.synopsis?.en || mnSyn || '';
  const genres: string[] =
    Array.isArray(d.genres) && d.genres.length > 0
      ? d.genres
      : d.genreMn
      ? [d.genreMn]
      : ['Sci-Fi'];
  const genreMn = d.genreMn || d.genre?.mn || genres.join(' • ') || 'Sci-Fi';
  const genreEn = d.genreEn || d.genre?.en || genres.join(' • ') || 'Sci-Fi';
  const directorMn = d.directorMn || d.director?.mn || '';
  const directorEn = d.directorEn || d.director?.en || directorMn || '';
  const castMn = d.castMn || d.cast?.mn || '';
  const castEn = d.castEn || d.cast?.en || castMn || '';
  const posterUrl = d.posterUrl || '';
  const backdropUrl = d.backdropUrl || d.bannerUrl || posterUrl;
  const bannerUrl = d.bannerUrl || backdropUrl || posterUrl;
  const videoUrl = d.videoUrl || d.videoSource || '';
  const videoSource = d.videoSource || videoUrl;

  return {
    id,
    slug,
    title: { mn: mnTitle, en: enTitle },
    synopsis: { mn: mnSyn, en: enSyn },
    titleMn: mnTitle,
    titleEn: enTitle,
    synopsisMn: mnSyn,
    synopsisEn: enSyn,
    descriptionMn: mnSyn,
    descriptionEn: enSyn,
    posterUrl,
    backdropUrl,
    bannerUrl,
    videoUrl,
    videoSource,
    trailerUrl: d.trailerUrl || '',
    year: Number(d.year) || new Date().getFullYear(),
    duration: d.duration || '1h 45m',
    genres,
    genre: { mn: genreMn, en: genreEn },
    genreMn,
    genreEn,
    rating: d.rating || '8.5',
    ageRating: d.ageRating || '13+',
    quality: d.quality || '1080p Full HD',
    director: { mn: directorMn, en: directorEn },
    directorMn,
    directorEn,
    cast: { mn: castMn, en: castEn },
    castMn,
    castEn,
    language: d.language || 'mn',
    type: d.type || 'movie',
    featured: Boolean(d.featured),
    trending: d.trending !== undefined ? Boolean(d.trending) : Boolean(d.featured),
    top10: d.top10 !== undefined ? d.top10 : undefined,
    isPremium: d.isPremium !== false,
    minPlan: d.minPlan || 'basic',
    published: d.published !== false,
    viewsCount: Number(d.viewsCount) || 0,
    tags: Array.isArray(d.tags) && d.tags.length > 0 ? d.tags : genres,
    createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
    updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date()
  };
}

function normalizePaymentDoc(doc: any): IPayment {
  return {
    id: doc._id?.toString() || doc.id,
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
    createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
    paidAt: doc.paidAt ? new Date(doc.paidAt) : undefined,
    verifiedByAdminId: doc.verifiedByAdminId || undefined,
    verifiedByAdminEmail: doc.verifiedByAdminEmail || undefined,
    verifiedAt: doc.verifiedAt ? new Date(doc.verifiedAt) : undefined,
    previousStatus: doc.previousStatus || undefined,
    rejectionReason: doc.rejectionReason || undefined
  };
}

export const DEFAULT_WEBSITE_SETTINGS: IWebsiteSettings = {
  key: 'global',
  siteName: 'SODON AI MOVIE',
  taglineMn: 'Киноны Дараагийн Үе',
  taglineEn: 'Next-Gen AI Cinema',
  featuredMovieId: 'ai-nomad-2099',
  announcementMn: 'AI Кино платформд тавтай морилно уу. 4K HDR стриминг болон Wire.mn QPay төлбөрийн систем.',
  announcementEn: 'Welcome to SODON AI Movie 4K HDR streaming platform.',
  maintenanceMode: false,
  allowRegistrations: true,
  primaryCurrency: 'MNT',
  defaultLocale: 'mn',
  contactEmail: 'support@aimovie.mn',
  contactPhone: '+976 7711-2099',
  streamingQualityDefault: '4K HDR',
  bankTransferEnabled: true,
  qpayEnabled: true,
  subscriptionPrices: {
    basic: 9900,
    standard: 14900,
    premium: 19900
  },
  faqItems: [
    {
      qMn: 'QPay болон Хаан Банкны шилжүүлэг хэрхэн баталгааждаг вэ?',
      aMn: 'Wire.mn QPay төлбөр автоматаар 10 секундэд баталгаажна. Банкны дансаар шилжүүлсэн тохиолдолд админ шалгаад гишүүнчлэлийг идэвхжүүлнэ.',
      qEn: 'How are QPay and Khan Bank transfers verified?',
      aEn: 'Wire.mn QPay payments are verified automatically within seconds. Bank transfers are placed in PENDING_REVIEW until verified by an administrator.'
    }
  ],
  updatedAt: new Date()
};

/**
 * In-memory fallback database for explicit development and isolated tests ONLY.
 * Never used in production!
 */
class MemoryDatabase {
  public users: Map<string, IUser> = new Map();
  public payments: Map<string, IPayment> = new Map();
  public subscriptions: Map<string, ISubscription> = new Map();
  public webhookEvents: Map<string, IWireWebhookEvent> = new Map();
  public movies: Map<string, IMovie> = new Map();
  public categories: Map<string, ICategory> = new Map();
  public auditLogs: IAuditLog[] = [];
  public passwordResetTokens: Map<string, IPasswordResetToken> = new Map();
  public settings: IWebsiteSettings = { ...DEFAULT_WEBSITE_SETTINGS };

  constructor() {
    if (process.env.NODE_ENV !== 'production') {
      this.seedDemoData();
    }
  }

  public seedDemoData() {
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

    for (const m of MOVIES) {
      const movieDoc = normalizeMovieDoc({
        ...m,
        slug: m.id,
        backdropUrl: m.bannerUrl || m.posterUrl,
        videoUrl: m.videoSource,
        genres: [m.genreMn || 'Sci-Fi'],
        published: true,
        viewsCount: 1200,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01')
      });
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
    this.passwordResetTokens.clear();
    this.settings = { ...DEFAULT_WEBSITE_SETTINGS };
    if (process.env.NODE_ENV !== 'production') {
      this.seedDemoData();
    }
  }
}

export const memDb = new MemoryDatabase();

export const Storage = {
  // -------------------------------------------------------------
  // Payments
  // -------------------------------------------------------------
  async createPayment(payment: Omit<IPayment, 'createdAt'> & { createdAt?: Date }): Promise<IPayment> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    const created: IPayment = {
      ...payment,
      paymentMethod: payment.paymentMethod || 'wire_qpay',
      createdAt: payment.createdAt || new Date()
    };

    if (isMongo) {
      const doc = await PaymentModel.create(created);
      return normalizePaymentDoc(doc.toObject());
    }

    const id = 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const item: IPayment = { ...created, id };
    memDb.payments.set(id, item);
    return item;
  },

  async getPaymentByOrderNumber(orderNumber: string): Promise<IPayment | null> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      const doc = await PaymentModel.findOne({ orderNumber }).lean();
      return doc ? normalizePaymentDoc(doc) : null;
    }

    for (const p of memDb.payments.values()) {
      if (p.orderNumber === orderNumber) return p;
    }
    return null;
  },

  async getPaymentByIdOrOrderNumber(idOrOrderNumber: string): Promise<IPayment | null> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      const byOrder = await PaymentModel.findOne({ orderNumber: idOrOrderNumber }).lean();
      if (byOrder) return normalizePaymentDoc(byOrder);
      if (mongoose.Types.ObjectId.isValid(idOrOrderNumber)) {
        const byId = await PaymentModel.findById(idOrOrderNumber).lean();
        if (byId) return normalizePaymentDoc(byId);
      }
      return null;
    }

    if (memDb.payments.has(idOrOrderNumber)) {
      return memDb.payments.get(idOrOrderNumber)!;
    }
    for (const p of memDb.payments.values()) {
      if (p.orderNumber === idOrOrderNumber || p.id === idOrOrderNumber) return p;
    }
    return null;
  },

  async getPaymentByIntentId(intentId: string): Promise<IPayment | null> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      const doc = await PaymentModel.findOne({ wirePaymentIntentId: intentId }).lean();
      return doc ? normalizePaymentDoc(doc) : null;
    }

    for (const p of memDb.payments.values()) {
      if (p.wirePaymentIntentId === intentId) return p;
    }
    return null;
  },

  async updatePaymentStatus(
    orderNumber: string,
    status: PaymentStatus,
    extra?: {
      paidAt?: Date;
      wireChargeId?: string;
      wireCheckoutSessionId?: string;
      bankSenderName?: string;
      bankTransferRef?: string;
      verifiedByAdminId?: string;
      verifiedByAdminEmail?: string;
      verifiedAt?: Date;
      previousStatus?: PaymentStatus;
      rejectionReason?: string;
    }
  ): Promise<IPayment | null> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      const updateData: any = { status };
      if (extra?.paidAt) updateData.paidAt = extra.paidAt;
      if (extra?.wireChargeId) updateData.wireChargeId = extra.wireChargeId;
      if (extra?.wireCheckoutSessionId) updateData.wireCheckoutSessionId = extra.wireCheckoutSessionId;
      if (extra?.bankSenderName) updateData.bankSenderName = extra.bankSenderName;
      if (extra?.bankTransferRef) updateData.bankTransferRef = extra.bankTransferRef;
      if (extra?.verifiedByAdminId) updateData.verifiedByAdminId = extra.verifiedByAdminId;
      if (extra?.verifiedByAdminEmail) updateData.verifiedByAdminEmail = extra.verifiedByAdminEmail;
      if (extra?.verifiedAt) updateData.verifiedAt = extra.verifiedAt;
      if (extra?.previousStatus) updateData.previousStatus = extra.previousStatus;
      if (extra?.rejectionReason) updateData.rejectionReason = extra.rejectionReason;

      const doc = await PaymentModel.findOneAndUpdate({ orderNumber }, updateData, { new: true }).lean();
      return doc ? normalizePaymentDoc(doc) : null;
    }

    for (const [key, p] of memDb.payments.entries()) {
      if (p.orderNumber === orderNumber || p.id === orderNumber) {
        const updated: IPayment = {
          ...p,
          status,
          paidAt: extra?.paidAt !== undefined ? extra.paidAt : p.paidAt,
          wireChargeId: extra?.wireChargeId || p.wireChargeId,
          wireCheckoutSessionId: extra?.wireCheckoutSessionId || p.wireCheckoutSessionId,
          bankSenderName: extra?.bankSenderName || p.bankSenderName,
          bankTransferRef: extra?.bankTransferRef || p.bankTransferRef,
          verifiedByAdminId: extra?.verifiedByAdminId || p.verifiedByAdminId,
          verifiedByAdminEmail: extra?.verifiedByAdminEmail || p.verifiedByAdminEmail,
          verifiedAt: extra?.verifiedAt || p.verifiedAt,
          previousStatus: extra?.previousStatus || p.previousStatus,
          rejectionReason: extra?.rejectionReason || p.rejectionReason
        };
        memDb.payments.set(key, updated);
        return updated;
      }
    }
    return null;
  },

  async approveBankTransferPayment(params: {
    idOrOrderNumber: string;
    adminId: string;
    adminEmail: string;
  }): Promise<{ payment: IPayment; subscription: ISubscription }> {
    const existing = await this.getPaymentByIdOrOrderNumber(params.idOrOrderNumber);
    if (!existing) {
      const err = new Error('Төлбөрийн захиалга олдсонгүй.');
      (err as any).code = 'ORDER_NOT_FOUND';
      throw err;
    }

    const previousStatus = existing.status;
    const now = new Date();

    const updatedPayment = await this.updatePaymentStatus(existing.orderNumber, 'PAID', {
      paidAt: now,
      verifiedByAdminId: params.adminId,
      verifiedByAdminEmail: params.adminEmail,
      verifiedAt: now,
      previousStatus
    });

    if (!updatedPayment) {
      throw new Error('Төлбөрийн төлөв шинэчлэхэд алдаа гарлаа.');
    }

    const subscription = await this.activateSubscription({
      userId: existing.userId,
      planId: existing.planId,
      paymentId: existing.orderNumber,
      durationDays: 30
    });

    await this.recordAuditLog({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: 'APPROVE_BANK_PAYMENT',
      target: existing.orderNumber,
      details: JSON.stringify({
        adminId: params.adminId,
        paymentId: existing.id || existing.orderNumber,
        orderNumber: existing.orderNumber,
        previousStatus,
        newStatus: 'PAID',
        verifiedAt: now.toISOString()
      })
    });

    return { payment: updatedPayment, subscription };
  },

  async rejectBankTransferPayment(params: {
    idOrOrderNumber: string;
    adminId: string;
    adminEmail: string;
    reason?: string;
  }): Promise<IPayment> {
    const existing = await this.getPaymentByIdOrOrderNumber(params.idOrOrderNumber);
    if (!existing) {
      const err = new Error('Төлбөрийн захиалга олдсонгүй.');
      (err as any).code = 'ORDER_NOT_FOUND';
      throw err;
    }

    const previousStatus = existing.status;
    const now = new Date();

    const updatedPayment = await this.updatePaymentStatus(existing.orderNumber, 'REJECTED', {
      verifiedByAdminId: params.adminId,
      verifiedByAdminEmail: params.adminEmail,
      verifiedAt: now,
      previousStatus,
      rejectionReason: params.reason || 'Дансны шилжүүлэг баталгаажаагүй.'
    });

    if (!updatedPayment) {
      throw new Error('Төлбөрийн төлөв шинэчлэхэд алдаа гарлаа.');
    }

    await this.recordAuditLog({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: 'REJECT_BANK_PAYMENT',
      target: existing.orderNumber,
      details: JSON.stringify({
        adminId: params.adminId,
        paymentId: existing.id || existing.orderNumber,
        orderNumber: existing.orderNumber,
        previousStatus,
        newStatus: 'REJECTED',
        verifiedAt: now.toISOString(),
        reason: params.reason || ''
      })
    });

    return updatedPayment;
  },

  async getPaymentsByUserId(userId: string): Promise<IPayment[]> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      const docs = await PaymentModel.find({ userId }).sort({ createdAt: -1 }).lean();
      return docs.map((doc: any) => normalizePaymentDoc(doc));
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
    requireMongoInProduction(isMongo);
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

    for (const sub of memDb.subscriptions.values()) {
      if (sub.userId === userId && sub.status === 'ACTIVE' && new Date(sub.endDate).getTime() > now.getTime()) {
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
    requireMongoInProduction(isMongo);

    const durationDays = params.durationDays || 30;
    const now = new Date();

    const existing = await this.getActiveSubscription(params.userId);
    const startDate = existing ? existing.startDate : now;
    const baseEndDate = existing && new Date(existing.endDate) > now ? new Date(existing.endDate) : now;
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
    requireMongoInProduction(isMongo);

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
    requireMongoInProduction(isMongo);
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
    requireMongoInProduction(isMongo);
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
    }

    const id = 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const item: IUser = { ...created, id };
    memDb.users.set(id, item);
    return item;
  },

  async getUserByEmail(email: string): Promise<IUser | null> {
    const normalized = email.trim().toLowerCase();
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      const doc = await UserModel.findOne({ email: normalized }).lean();
      if (!doc) return null;
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
    requireMongoInProduction(isMongo);

    if (isMongo) {
      try {
        const doc = await UserModel.findById(id).lean();
        if (!doc) return null;
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
      } catch (err) {
        if ((err as any)?.name === 'CastError') return null;
        throw err;
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
    requireMongoInProduction(isMongo);

    if (isMongo) {
      const docs = await UserModel.find().sort({ createdAt: -1 }).lean();
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
    requireMongoInProduction(isMongo);
    if (isMongo) {
      const updated = await UserModel.findByIdAndUpdate(userId, { role }, { new: true }).lean();
      if (!updated) throw new Error('Хэрэглэгч олдсонгүй.');
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
    requireMongoInProduction(isMongo);
    if (isMongo) {
      const updated = await UserModel.findByIdAndUpdate(userId, { status }, { new: true }).lean();
      if (!updated) throw new Error('Хэрэглэгч олдсонгүй.');
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

    const mem = memDb.users.get(userId) || target;
    mem.status = status;
    memDb.users.set(userId, mem);
    return mem;
  },

  async updateUser(userId: string, updates: { name?: string; lastLoginAt?: Date }): Promise<IUser> {
    const target = await this.getUserById(userId);
    if (!target) throw new Error('Хэрэглэгч олдсонгүй.');

    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);
    if (isMongo) {
      const updated = await UserModel.findByIdAndUpdate(userId, updates, { new: true }).lean();
      if (!updated) throw new Error('Хэрэглэгч олдсонгүй.');
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
    requireMongoInProduction(isMongo);
    if (isMongo) {
      await UserModel.findByIdAndUpdate(userId, { passwordHash });
      return true;
    }

    const mem = memDb.users.get(userId) || target;
    mem.passwordHash = passwordHash;
    memDb.users.set(userId, mem);
    return true;
  },

  // -------------------------------------------------------------
  // Movies Management (Phase 1 & 2)
  // -------------------------------------------------------------
  async getAllMovies(options?: { publishedOnly?: boolean; featuredOnly?: boolean; search?: string; genre?: string }): Promise<IMovie[]> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      const filter: any = {};
      if (options?.publishedOnly) filter.published = { $ne: false };
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
      // Always return the actual MongoDB collection (even when docs.length === 0)
      return docs.map((d: any) => normalizeMovieDoc(d));
    }

    let list = Array.from(memDb.movies.values()).map((m) => normalizeMovieDoc(m));
    if (options?.publishedOnly) {
      list = list.filter((m) => m.published !== false);
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
    requireMongoInProduction(isMongo);

    if (isMongo) {
      const doc = await MovieModel.findOne({ $or: [{ id }, { slug: id }] }).lean();
      return doc ? normalizeMovieDoc(doc) : null;
    }

    const mem = memDb.movies.get(id);
    if (mem) return normalizeMovieDoc(mem);
    for (const m of memDb.movies.values()) {
      if (m.slug === id || m.id === id) return normalizeMovieDoc(m);
    }
    return null;
  },

  async createMovie(data: Partial<IMovie> & { synopsisMn?: string; synopsisEn?: string }): Promise<IMovie> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    const slug = (data.slug || data.id || `movie-${Date.now()}`).trim().toLowerCase();
    const id = slug;

    // Duplicate slug prevention
    const existing = await this.getMovieById(slug);
    if (existing) {
      const dupErr = new Error(`Энэ slug ("${slug}") аль хэдийн бүртгэгдсэн байна. Өөр slug оруулна уу.`);
      (dupErr as any).code = 'DUPLICATE_SLUG';
      (dupErr as any).statusCode = 409;
      throw dupErr;
    }

    const mnTitle = (data.titleMn || data.title?.mn || '').trim();
    const enTitle = (data.titleEn || data.title?.en || '').trim();
    const mnSyn = (data.synopsisMn || data.descriptionMn || data.synopsis?.mn || '').trim();
    const enSyn = (data.synopsisEn || data.descriptionEn || data.synopsis?.en || '').trim();

    if (!mnTitle || !enTitle) {
      const valErr = new Error('Монгол болон Англи гарчиг заавал оруулна уу.');
      (valErr as any).code = 'VALIDATION_ERROR';
      (valErr as any).statusCode = 400;
      throw valErr;
    }

    if (!mnSyn || !enSyn) {
      const valErr = new Error('Монгол болон Англи товч агуулга (Synopsis) заавал оруулна уу.');
      (valErr as any).code = 'VALIDATION_ERROR';
      (valErr as any).statusCode = 400;
      throw valErr;
    }

    const genres = data.genres && data.genres.length > 0 ? data.genres : ['Sci-Fi'];
    const directorMn = (data.directorMn ?? data.director?.mn ?? '').trim();
    const directorEn = (data.directorEn ?? data.director?.en ?? '').trim();
    const castMn = (data.castMn ?? data.cast?.mn ?? '').trim();
    const castEn = (data.castEn ?? data.cast?.en ?? '').trim();
    const posterUrl = (data.posterUrl || '').trim();
    const backdropUrl = (data.backdropUrl || data.bannerUrl || posterUrl).trim();
    const videoUrl = (data.videoUrl || data.videoSource || '').trim();

    const now = new Date();
    const moviePayload: IMovie = normalizeMovieDoc({
      id,
      slug,
      title: { mn: mnTitle, en: enTitle },
      synopsis: { mn: mnSyn, en: enSyn },
      titleMn: mnTitle,
      titleEn: enTitle,
      synopsisMn: mnSyn,
      synopsisEn: enSyn,
      descriptionMn: mnSyn,
      descriptionEn: enSyn,
      posterUrl,
      backdropUrl,
      bannerUrl: data.bannerUrl || backdropUrl || posterUrl,
      videoUrl,
      videoSource: videoUrl,
      trailerUrl: (data.trailerUrl || '').trim(),
      year: Number(data.year) || now.getFullYear(),
      duration: (data.duration || '1h 45m').trim(),
      genres,
      genreMn: genres.join(' • '),
      genreEn: genres.join(' • '),
      rating: (data.rating || '8.5').trim(),
      ageRating: (data.ageRating || '13+').trim(),
      quality: data.quality || '1080p Full HD',
      director: { mn: directorMn, en: directorEn },
      directorMn,
      directorEn,
      cast: { mn: castMn, en: castEn },
      castMn,
      castEn,
      language: data.language || 'mn',
      type: data.type || 'movie',
      featured: Boolean(data.featured),
      trending: data.trending !== undefined ? Boolean(data.trending) : Boolean(data.featured),
      isPremium: data.isPremium !== false,
      minPlan: data.minPlan || 'basic',
      published: data.published !== false,
      viewsCount: 0,
      tags: data.tags && data.tags.length > 0 ? data.tags : genres,
      createdAt: now,
      updatedAt: now
    });

    if (isMongo) {
      try {
        const createdDoc = await MovieModel.create(moviePayload);
        return normalizeMovieDoc(createdDoc.toObject());
      } catch (err: any) {
        if (err?.code === 11000) {
          const dupErr = new Error(`Энэ slug ("${slug}") аль хэдийн бүртгэгдсэн байна.`);
          (dupErr as any).code = 'DUPLICATE_SLUG';
          (dupErr as any).statusCode = 409;
          throw dupErr;
        }
        throw err;
      }
    }

    memDb.movies.set(moviePayload.id, moviePayload);
    return moviePayload;
  },

  async updateMovie(
    id: string,
    updates: Partial<IMovie> & { synopsisMn?: string; synopsisEn?: string }
  ): Promise<IMovie | null> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    const existing = await this.getMovieById(id);
    if (!existing) return null;

    const nextSlug = updates.slug ? updates.slug.trim().toLowerCase() : existing.slug || existing.id;
    if (nextSlug !== existing.id && nextSlug !== existing.slug) {
      const collision = await this.getMovieById(nextSlug);
      if (collision && collision.id !== existing.id) {
        const dupErr = new Error(`Энэ slug ("${nextSlug}") өөр кинонд ашиглагдаж байна.`);
        (dupErr as any).code = 'DUPLICATE_SLUG';
        (dupErr as any).statusCode = 409;
        throw dupErr;
      }
    }

    const mnTitle = updates.titleMn ?? updates.title?.mn ?? existing.title.mn;
    const enTitle = updates.titleEn ?? updates.title?.en ?? existing.title.en;
    const mnSyn =
      updates.synopsisMn ?? updates.descriptionMn ?? updates.synopsis?.mn ?? existing.synopsis.mn;
    const enSyn =
      updates.synopsisEn ?? updates.descriptionEn ?? updates.synopsis?.en ?? existing.synopsis.en;
    const directorMn = updates.directorMn ?? updates.director?.mn ?? existing.director.mn;
    const directorEn = updates.directorEn ?? updates.director?.en ?? existing.director.en;
    const castMn = updates.castMn ?? updates.cast?.mn ?? existing.cast.mn;
    const castEn = updates.castEn ?? updates.cast?.en ?? existing.cast.en;
    const genres = updates.genres && updates.genres.length > 0 ? updates.genres : existing.genres;
    const posterUrl = updates.posterUrl ?? existing.posterUrl;
    const backdropUrl = updates.backdropUrl ?? updates.bannerUrl ?? existing.backdropUrl ?? posterUrl;
    const videoUrl = updates.videoUrl ?? updates.videoSource ?? existing.videoUrl;

    const merged: IMovie = normalizeMovieDoc({
      ...existing,
      ...updates,
      id: existing.id,
      slug: nextSlug,
      title: { mn: mnTitle, en: enTitle },
      synopsis: { mn: mnSyn, en: enSyn },
      titleMn: mnTitle,
      titleEn: enTitle,
      synopsisMn: mnSyn,
      synopsisEn: enSyn,
      descriptionMn: mnSyn,
      descriptionEn: enSyn,
      posterUrl,
      backdropUrl,
      bannerUrl: updates.bannerUrl ?? backdropUrl,
      videoUrl,
      videoSource: videoUrl,
      genres,
      genreMn: genres.join(' • '),
      genreEn: genres.join(' • '),
      director: { mn: directorMn, en: directorEn },
      directorMn,
      directorEn,
      cast: { mn: castMn, en: castEn },
      castMn,
      castEn,
      updatedAt: new Date()
    });

    if (isMongo) {
      const updatedDoc = await MovieModel.findOneAndUpdate(
        { $or: [{ id: existing.id }, { slug: existing.slug }] },
        merged,
        { new: true }
      ).lean();
      return updatedDoc ? normalizeMovieDoc(updatedDoc) : null;
    }

    memDb.movies.set(existing.id, merged);
    return merged;
  },

  async deleteMovie(id: string): Promise<boolean> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      const deleted = await MovieModel.findOneAndDelete({ $or: [{ id }, { slug: id }] }).lean();
      return Boolean(deleted);
    }

    const existing = await this.getMovieById(id);
    if (!existing) return false;
    return memDb.movies.delete(existing.id);
  },

  async incrementMovieViews(id: string): Promise<void> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      await MovieModel.findOneAndUpdate({ $or: [{ id }, { slug: id }] }, { $inc: { viewsCount: 1 } });
      return;
    }

    const m = memDb.movies.get(id);
    if (m) {
      m.viewsCount = (m.viewsCount || 0) + 1;
    }
  },

  // -------------------------------------------------------------
  // Categories Management
  // -------------------------------------------------------------
  async getAllCategories(): Promise<ICategory[]> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      const docs = await CategoryModel.find().sort({ order: 1 }).lean();
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

    return Array.from(memDb.categories.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  async createCategory(data: Partial<ICategory>): Promise<ICategory> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    const slug = (data.slug || `${Date.now()}`).trim().toLowerCase();
    const id = `cat-${slug}`;
    const category: ICategory = {
      id,
      slug,
      nameMn: data.nameMn || 'Шинэ ангилал',
      nameEn: data.nameEn || 'New Category',
      descriptionMn: data.descriptionMn,
      descriptionEn: data.descriptionEn,
      imageUrl: data.imageUrl,
      order: data.order || memDb.categories.size + 1
    };

    if (isMongo) {
      const created = await CategoryModel.create(category);
      const d = created.toObject();
      return {
        id: d.id,
        slug: d.slug,
        nameMn: d.nameMn,
        nameEn: d.nameEn,
        descriptionMn: d.descriptionMn,
        descriptionEn: d.descriptionEn,
        imageUrl: d.imageUrl,
        order: d.order
      };
    }

    memDb.categories.set(category.id, category);
    return category;
  },

  async updateCategory(id: string, updates: Partial<ICategory>): Promise<ICategory | null> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      const updated = await CategoryModel.findOneAndUpdate({ id }, updates, { new: true }).lean();
      if (!updated) return null;
      return {
        id: updated.id,
        slug: updated.slug,
        nameMn: updated.nameMn,
        nameEn: updated.nameEn,
        descriptionMn: updated.descriptionMn,
        descriptionEn: updated.descriptionEn,
        imageUrl: updated.imageUrl,
        order: updated.order
      };
    }

    const current = memDb.categories.get(id);
    if (!current) return null;
    const updated = { ...current, ...updates };
    memDb.categories.set(id, updated);
    return updated;
  },

  async deleteCategory(id: string): Promise<boolean> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      const deleted = await CategoryModel.findOneAndDelete({ id }).lean();
      return Boolean(deleted);
    }

    return memDb.categories.delete(id);
  },

  // -------------------------------------------------------------
  // Admin Payments & Subscriptions
  // -------------------------------------------------------------
  async getAllPayments(): Promise<IPayment[]> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      const docs = await PaymentModel.find().sort({ createdAt: -1 }).lean();
      return docs.map((doc: any) => normalizePaymentDoc(doc));
    }

    return Array.from(memDb.payments.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  },

  async getAllSubscriptions(): Promise<ISubscription[]> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      const docs = await SubscriptionModel.find().sort({ createdAt: -1 }).lean();
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
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    const log: IAuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: params.action,
      target: params.target,
      details: params.details,
      createdAt: new Date()
    };

    if (isMongo) {
      const created = await AuditLogModel.create(log);
      return {
        id: created._id.toString(),
        adminId: created.adminId,
        adminEmail: created.adminEmail,
        action: created.action,
        target: created.target,
        details: created.details,
        createdAt: created.createdAt
      };
    }

    memDb.auditLogs.unshift(log);
    if (memDb.auditLogs.length > 200) memDb.auditLogs.pop();
    return log;
  },

  async getAuditLogs(limit = 50): Promise<IAuditLog[]> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      const docs = await AuditLogModel.find().sort({ createdAt: -1 }).limit(limit).lean();
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

    return memDb.auditLogs.slice(0, limit);
  },

  async getAllWebhookEvents(): Promise<IWireWebhookEvent[]> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      const docs = await WireWebhookEventModel.find().sort({ receivedAt: -1 }).limit(100).lean();
      return docs.map((d: any) => ({
        id: d._id?.toString(),
        eventId: d.eventId,
        eventType: d.eventType,
        paymentIntentId: d.paymentIntentId,
        processed: d.processed,
        receivedAt: d.receivedAt || (d as any).createdAt || new Date(),
        processedAt: d.processedAt,
        payloadSummary: d.payloadSummary
      }));
    }
    return Array.from(memDb.webhookEvents.values()).sort(
      (a, b) => b.receivedAt.getTime() - a.receivedAt.getTime()
    );
  },

  // -------------------------------------------------------------
  // Website Settings (Phase 7)
  // -------------------------------------------------------------
  async getWebsiteSettings(): Promise<IWebsiteSettings> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      let doc = await WebsiteSettingsModel.findOne({ key: 'global' }).lean();
      if (!doc) {
        const created = await WebsiteSettingsModel.create({
          ...DEFAULT_WEBSITE_SETTINGS,
          key: 'global'
        });
        doc = created.toObject() as any;
      }
      const d = doc as any;
      return {
        id: d._id?.toString(),
        key: 'global',
        siteName: d.siteName || DEFAULT_WEBSITE_SETTINGS.siteName,
        taglineMn: d.taglineMn || DEFAULT_WEBSITE_SETTINGS.taglineMn,
        taglineEn: d.taglineEn || DEFAULT_WEBSITE_SETTINGS.taglineEn,
        featuredMovieId: d.featuredMovieId ?? DEFAULT_WEBSITE_SETTINGS.featuredMovieId,
        announcementMn: d.announcementMn ?? DEFAULT_WEBSITE_SETTINGS.announcementMn,
        announcementEn: d.announcementEn ?? DEFAULT_WEBSITE_SETTINGS.announcementEn,
        maintenanceMode: Boolean(d.maintenanceMode),
        allowRegistrations: d.allowRegistrations !== false,
        primaryCurrency: d.primaryCurrency || 'MNT',
        defaultLocale: d.defaultLocale === 'en' ? 'en' : 'mn',
        contactEmail: d.contactEmail || DEFAULT_WEBSITE_SETTINGS.contactEmail,
        contactPhone: d.contactPhone || DEFAULT_WEBSITE_SETTINGS.contactPhone,
        streamingQualityDefault: d.streamingQualityDefault || '4K HDR',
        bankTransferEnabled: d.bankTransferEnabled !== false,
        qpayEnabled: d.qpayEnabled !== false,
        subscriptionPrices: {
          basic: Number(d.subscriptionPrices?.basic) || 9900,
          standard: Number(d.subscriptionPrices?.standard) || 14900,
          premium: Number(d.subscriptionPrices?.premium) || 19900
        },
        faqItems: Array.isArray(d.faqItems) && d.faqItems.length > 0 ? d.faqItems : DEFAULT_WEBSITE_SETTINGS.faqItems,
        updatedAt: d.updatedAt || new Date()
      };
    }

    return { ...memDb.settings };
  },

  async updateWebsiteSettings(updates: Partial<IWebsiteSettings>): Promise<IWebsiteSettings> {
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    const current = await this.getWebsiteSettings();
    const merged: IWebsiteSettings = {
      ...current,
      ...updates,
      key: 'global',
      subscriptionPrices: {
        basic: Number(updates.subscriptionPrices?.basic ?? current.subscriptionPrices?.basic ?? 9900),
        standard: Number(updates.subscriptionPrices?.standard ?? current.subscriptionPrices?.standard ?? 14900),
        premium: Number(updates.subscriptionPrices?.premium ?? current.subscriptionPrices?.premium ?? 19900)
      },
      updatedAt: new Date()
    };

    if (isMongo) {
      const doc = await WebsiteSettingsModel.findOneAndUpdate(
        { key: 'global' },
        { $set: merged },
        { upsert: true, new: true }
      ).lean();
      const d = doc as any;
      return {
        ...merged,
        id: d?._id?.toString(),
        updatedAt: d?.updatedAt || merged.updatedAt
      };
    }

    memDb.settings = merged;
    return { ...memDb.settings };
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

    const pendingPayments = allPayments.filter(
      (p) => p.status === 'PENDING' || p.status === 'PENDING_REVIEW'
    ).length;
    const pendingReviewPayments = allPayments.filter((p) => p.status === 'PENDING_REVIEW').length;

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
      pendingReviewPayments,
      recentPayments: allPayments.slice(0, 5),
      recentUsers: allUsers.slice(0, 5),
      recentMovies: allMovies.slice(0, 5),
      topMovies: [...allMovies].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 5),
      monthlyRevenueData,
      subscriptionDistribution: subDist
    };
  },

  // -------------------------------------------------------------
  // Password Reset Token Methods (SHA-256 hashed token in MongoDB)
  // -------------------------------------------------------------
  async createPasswordResetToken(email: string): Promise<{ token: string; tokenHash: string; expiresAt: Date; userId: string; email: string } | null> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.id) return null;

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      await PasswordResetTokenModel.create({
        userId: user.id,
        email: user.email,
        tokenHash,
        expiresAt,
        used: false
      });
      return {
        token,
        tokenHash,
        expiresAt,
        userId: user.id,
        email: user.email
      };
    }

    memDb.passwordResetTokens.set(tokenHash, {
      id: `prt_${Date.now()}`,
      userId: user.id,
      email: user.email,
      tokenHash,
      expiresAt,
      used: false,
      createdAt: new Date()
    });

    return {
      token,
      tokenHash,
      expiresAt,
      userId: user.id,
      email: user.email
    };
  },

  async verifyPasswordResetToken(token: string): Promise<{ valid: boolean; email?: string; userId?: string; message?: string }> {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return { valid: false, message: 'Нууц үг сэргээх токен дутуу байна.' };
    }

    const tokenHash = hashResetToken(token);
    let record: IPasswordResetToken | null = null;
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      const doc = await PasswordResetTokenModel.findOne({ tokenHash }).lean();
      if (doc) {
        record = {
          id: (doc as any)._id?.toString() || (doc as any).id,
          userId: (doc as any).userId,
          email: (doc as any).email,
          tokenHash: (doc as any).tokenHash,
          expiresAt: new Date((doc as any).expiresAt),
          used: Boolean((doc as any).used),
          createdAt: new Date((doc as any).createdAt || Date.now())
        };
      }
    } else {
      record = memDb.passwordResetTokens.get(tokenHash) || null;
    }

    if (!record) {
      return { valid: false, message: 'Нууц үг сэргээх холбоос олдсонгүй эсвэл хүчингүй байна.' };
    }

    if (record.used) {
      return { valid: false, message: 'Энэхүү холбоосыг өмнө нь ашигласан байна. Дахин шинэ хүсэлт илгээнэ үү.' };
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      return { valid: false, message: 'Нууц үг сэргээх холбоосын хүчинтэй хугацаа (1 цаг) дууссан байна.' };
    }

    return {
      valid: true,
      email: record.email,
      userId: record.userId
    };
  },

  async resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const verification = await this.verifyPasswordResetToken(token);
    if (!verification.valid || !verification.userId) {
      return { success: false, message: verification.message || 'Хүчингүй хүсэлт.' };
    }

    const newHash = hashPassword(newPassword);
    const updated = await this.updateUserPassword(verification.userId, newHash);
    if (!updated) {
      return { success: false, message: 'Хэрэглэгчийн нууц үгийг шинэчлэхэд алдаа гарлаа.' };
    }

    const tokenHash = hashResetToken(token);
    const isMongo = await connectDB();
    requireMongoInProduction(isMongo);

    if (isMongo) {
      await PasswordResetTokenModel.updateOne({ tokenHash }, { $set: { used: true } });
    } else {
      const mem = memDb.passwordResetTokens.get(tokenHash);
      if (mem) {
        mem.used = true;
        memDb.passwordResetTokens.set(tokenHash, mem);
      }
    }

    return { success: true, message: 'Нууц үг амжилттай шинэчлэгдлээ.' };
  }
};
