import mongoose, { Schema, Document } from 'mongoose';

export type PaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export type PaymentMethod = 'wire_qpay' | 'bank_transfer';

export interface IPayment {
  id?: string;
  userId: string;
  orderNumber: string;
  planId: string;
  paymentMethod?: PaymentMethod;
  wirePaymentIntentId: string;
  wireCheckoutSessionId?: string;
  wireChargeId?: string;
  bankSenderName?: string;
  bankTransferRef?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  checkoutUrl?: string;
  createdAt: Date;
  paidAt?: Date;
}

export interface ISubscription {
  id?: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  paymentId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWireWebhookEvent {
  id?: string;
  eventId: string;
  eventType: string;
  paymentIntentId: string;
  processed: boolean;
  receivedAt: Date;
  processedAt?: Date;
  payloadSummary?: string;
}

export interface IPasswordResetToken {
  id?: string;
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface IUser {
  id?: string;
  name: string;
  email: string;
  passwordHash: string;
  role?: string; // 'user' | 'admin' | legacy 'member'
  status?: 'active' | 'suspended';
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface IMovie {
  id: string; // unique slug or identifier
  title: { mn: string; en: string };
  synopsis: { mn: string; en: string };
  // Backward-compatible fields
  titleMn?: string;
  titleEn?: string;
  descriptionMn?: string;
  descriptionEn?: string;
  slug?: string;
  posterUrl: string;
  backdropUrl: string;
  bannerUrl?: string;
  videoUrl: string;
  videoSource?: string;
  trailerUrl: string;
  year: number;
  duration: string;
  genres: string[];
  genreMn?: string;
  genreEn?: string;
  rating: string;
  ageRating?: string;
  quality?: '4K HDR' | '1080p Full HD' | '720p HD';
  director: { mn: string; en: string };
  directorMn?: string;
  directorEn?: string;
  cast: { mn: string; en: string };
  castMn?: string;
  castEn?: string;
  language?: string;
  type?: 'movie' | 'series';
  featured: boolean;
  isPremium: boolean;
  minPlan: 'basic' | 'standard' | 'premium';
  published: boolean;
  viewsCount?: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICategory {
  id: string;
  slug: string;
  nameMn: string;
  nameEn: string;
  descriptionMn?: string;
  descriptionEn?: string;
  imageUrl?: string;
  order?: number;
}

export interface IAuditLog {
  id?: string;
  adminId: string;
  adminEmail: string;
  action: string;
  target: string;
  details?: string;
  createdAt: Date;
}

export interface IWebsiteSettings {
  siteName: string;
  taglineMn: string;
  taglineEn: string;
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  primaryCurrency: string;
  contactEmail: string;
}

/* ============================================================
 * Mongoose Schemas (Used when MONGODB_URI is provided)
 * ============================================================ */

export const UserSchema = new Schema<IUser & Document>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'user', index: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const MovieSchema = new Schema<IMovie & Document>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: {
      mn: { type: String, required: true },
      en: { type: String, required: true }
    },
    synopsis: {
      mn: { type: String, required: true },
      en: { type: String, required: true }
    },
    titleMn: { type: String },
    titleEn: { type: String },
    descriptionMn: { type: String },
    descriptionEn: { type: String },
    slug: { type: String, index: true },
    posterUrl: { type: String, required: true },
    backdropUrl: { type: String, required: true },
    bannerUrl: { type: String },
    videoUrl: { type: String, required: true },
    videoSource: { type: String },
    trailerUrl: { type: String, default: '' },
    year: { type: Number, required: true },
    duration: { type: String, required: true },
    genres: { type: [String], default: [] },
    genreMn: { type: String },
    genreEn: { type: String },
    rating: { type: String, default: '8.5' },
    ageRating: { type: String, default: '13+' },
    quality: { type: String, default: '1080p Full HD' },
    director: {
      mn: { type: String, default: '' },
      en: { type: String, default: '' }
    },
    directorMn: { type: String },
    directorEn: { type: String },
    cast: {
      mn: { type: String, default: '' },
      en: { type: String, default: '' }
    },
    castMn: { type: String },
    castEn: { type: String },
    language: { type: String, default: 'mn' },
    type: { type: String, enum: ['movie', 'series'], default: 'movie' },
    featured: { type: Boolean, default: false, index: true },
    isPremium: { type: Boolean, default: true },
    minPlan: { type: String, enum: ['basic', 'standard', 'premium'], default: 'basic' },
    published: { type: Boolean, default: true, index: true },
    viewsCount: { type: Number, default: 0 },
    tags: { type: [String], default: [] }
  },
  { timestamps: true }
);

export const CategorySchema = new Schema<ICategory & Document>(
  {
    id: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    nameMn: { type: String, required: true },
    nameEn: { type: String, required: true },
    descriptionMn: { type: String },
    descriptionEn: { type: String },
    imageUrl: { type: String },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const AuditLogSchema = new Schema<IAuditLog & Document>(
  {
    adminId: { type: String, required: true, index: true },
    adminEmail: { type: String, required: true },
    action: { type: String, required: true },
    target: { type: String, required: true },
    details: { type: String }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PaymentSchema = new Schema<IPayment & Document>(
  {
    userId: { type: String, required: true, index: true },
    orderNumber: { type: String, required: true, unique: true, index: true },
    planId: { type: String, required: true },
    paymentMethod: { type: String, enum: ['wire_qpay', 'bank_transfer'], default: 'wire_qpay' },
    wirePaymentIntentId: { type: String, required: true, index: true },
    wireCheckoutSessionId: { type: String, default: null },
    wireChargeId: { type: String, default: null },
    bankSenderName: { type: String, default: null },
    bankTransferRef: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'MNT' },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'EXPIRED', 'FAILED'],
      default: 'PENDING',
      index: true
    },
    checkoutUrl: { type: String, default: null },
    paidAt: { type: Date, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SubscriptionSchema = new Schema<ISubscription & Document>(
  {
    userId: { type: String, required: true, index: true },
    planId: { type: String, required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true, index: true },
    paymentId: { type: String, required: true }
  },
  { timestamps: true }
);

export const WireWebhookEventSchema = new Schema<IWireWebhookEvent & Document>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true },
    paymentIntentId: { type: String, required: true, index: true },
    processed: { type: Boolean, default: false },
    receivedAt: { type: Date, default: () => new Date() },
    processedAt: { type: Date, default: null },
    payloadSummary: { type: String, default: null }
  }
);

export const PasswordResetTokenSchema = new Schema<IPasswordResetToken & Document>(
  {
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    used: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Prevent re-compilation model errors in development
export const UserModel =
  mongoose.models.User || mongoose.model<IUser & Document>('User', UserSchema);

export const MovieModel =
  mongoose.models.Movie || mongoose.model<IMovie & Document>('Movie', MovieSchema);

export const CategoryModel =
  mongoose.models.Category || mongoose.model<ICategory & Document>('Category', CategorySchema);

export const AuditLogModel =
  mongoose.models.AuditLog || mongoose.model<IAuditLog & Document>('AuditLog', AuditLogSchema);

export const PaymentModel =
  mongoose.models.Payment || mongoose.model<IPayment & Document>('Payment', PaymentSchema);

export const SubscriptionModel =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription & Document>('Subscription', SubscriptionSchema);

export const WireWebhookEventModel =
  mongoose.models.WireWebhookEvent ||
  mongoose.model<IWireWebhookEvent & Document>('WireWebhookEvent', WireWebhookEventSchema);

export const PasswordResetTokenModel =
  mongoose.models.PasswordResetToken ||
  mongoose.model<IPasswordResetToken & Document>('PasswordResetToken', PasswordResetTokenSchema);

