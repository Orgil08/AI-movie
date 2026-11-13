import mongoose, { Schema, Document } from 'mongoose';

export type PaymentStatus = 'PENDING' | 'PENDING_REVIEW' | 'PAID' | 'REJECTED' | 'EXPIRED' | 'FAILED';
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
  verifiedByAdminId?: string;
  verifiedByAdminEmail?: string;
  verifiedAt?: Date;
  previousStatus?: PaymentStatus;
  rejectionReason?: string;
  seriesId?: string;
  accessType?: 'subscription' | 'rental' | 'permanent';
  rentalDurationHours?: number;
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
  tokenHash: string;
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
  originalTitle?: string;
  synopsisMn?: string;
  synopsisEn?: string;
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
  country?: string;
  duration: string;
  genres: string[];
  genre?: { mn: string; en: string };
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
  trending?: boolean;
  top10?: number;
  isPremium: boolean;
  minPlan: 'basic' | 'standard' | 'premium';
  published: boolean;
  viewsCount?: number;
  tags?: string[];
  // TV Series & Monetization fields
  hasMongolianSubtitles?: boolean;
  isOriginal?: boolean;
  isExclusive?: boolean;
  isShortDrama?: boolean;
  totalEpisodes?: number;
  freeEpisodes?: number;
  unlockPrice?: number;
  rentalDurationHours?: number;
  vipEnabled?: boolean;
  seriesStatus?: 'ongoing' | 'completed' | 'draft';
  createdAt: Date;
  updatedAt: Date;
}

export interface IEpisode {
  id: string;
  seriesId: string;
  episodeNumber: number;
  title: string;
  titleEn?: string;
  description?: string;
  thumbnailUrl?: string;
  subtitleUrlMn?: string;
  videoUrl: string;
  duration: string;
  isPublished: boolean;
  published?: boolean;
  isFree: boolean;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISeriesPurchase {
  id?: string;
  userId: string;
  seriesId: string;
  orderNumber: string;
  amount: number;
  currency?: string;
  paymentId?: string;
  status?: string;
  accessType: 'rental' | 'permanent';
  paymentProvider?: PaymentMethod;
  paymentReference?: string;
  paymentStatus?: PaymentStatus;
  expiresAt: Date | null;
  purchasedAt: Date;
}

export interface IUserPlaybackProgress {
  id?: string;
  userId: string;
  movieId: string;
  episodeId?: string;
  episodeNumber: number;
  currentTime?: number;
  playbackPosition?: number;
  duration: number;
  completed: boolean;
  lastWatchedAt: Date;
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

export interface IFaqItem {
  qMn: string;
  aMn: string;
  qEn: string;
  aEn: string;
}

export interface IWebsiteSettings {
  id?: string;
  key?: string;
  siteName: string;
  taglineMn: string;
  taglineEn: string;
  featuredMovieId?: string;
  announcementMn: string;
  announcementEn: string;
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  primaryCurrency: string;
  defaultLocale: 'mn' | 'en';
  contactEmail: string;
  contactPhone?: string;
  streamingQualityDefault?: string;
  bankTransferEnabled?: boolean;
  qpayEnabled?: boolean;
  subscriptionPrices?: {
    basic: number;
    standard: number;
    premium: number;
  };
  faqItems?: IFaqItem[];
  updatedAt?: Date;
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
    originalTitle: { type: String },
    synopsisMn: { type: String },
    synopsisEn: { type: String },
    descriptionMn: { type: String },
    descriptionEn: { type: String },
    slug: { type: String, unique: true, sparse: true, index: true },
    posterUrl: { type: String, required: true },
    backdropUrl: { type: String, required: true },
    bannerUrl: { type: String },
    videoUrl: { type: String, required: true },
    videoSource: { type: String },
    trailerUrl: { type: String, default: '' },
    year: { type: Number, required: true },
    country: { type: String, default: 'Монгол' },
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
    trending: { type: Boolean, default: false },
    top10: { type: Number, default: null },
    isPremium: { type: Boolean, default: true },
    minPlan: { type: String, enum: ['basic', 'standard', 'premium'], default: 'basic' },
    published: { type: Boolean, default: true, index: true },
    viewsCount: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    hasMongolianSubtitles: { type: Boolean, default: true },
    isOriginal: { type: Boolean, default: false },
    isExclusive: { type: Boolean, default: false },
    isShortDrama: { type: Boolean, default: false },
    totalEpisodes: { type: Number, default: 1 },
    freeEpisodes: { type: Number, default: 1 },
    unlockPrice: { type: Number, default: 4900 },
    rentalDurationHours: { type: Number, default: 72 },
    vipEnabled: { type: Boolean, default: true },
    seriesStatus: { type: String, enum: ['ongoing', 'completed', 'draft'], default: 'ongoing' }
  },
  { timestamps: true }
);

export const EpisodeSchema = new Schema<IEpisode & Document>(
  {
    id: { type: String, required: true, unique: true, index: true },
    seriesId: { type: String, required: true, index: true },
    episodeNumber: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    videoUrl: { type: String, required: true },
    duration: { type: String, default: '2 мин' },
    isPublished: { type: Boolean, default: true },
    isFree: { type: Boolean, default: false }
  },
  { timestamps: true }
);
EpisodeSchema.index({ seriesId: 1, episodeNumber: 1 }, { unique: true });

export const SeriesPurchaseSchema = new Schema<ISeriesPurchase & Document>(
  {
    userId: { type: String, required: true, index: true },
    seriesId: { type: String, required: true, index: true },
    orderNumber: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    accessType: { type: String, enum: ['rental', 'permanent'], default: 'rental' },
    paymentProvider: { type: String, enum: ['wire_qpay', 'bank_transfer'], default: 'wire_qpay' },
    paymentReference: { type: String, required: true },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PENDING_REVIEW', 'PAID', 'REJECTED', 'EXPIRED', 'FAILED'],
      default: 'PAID',
      index: true
    },
    expiresAt: { type: Date, default: null, index: true },
    purchasedAt: { type: Date, default: () => new Date() }
  },
  { timestamps: true }
);

export const UserPlaybackProgressSchema = new Schema<IUserPlaybackProgress & Document>(
  {
    userId: { type: String, required: true, index: true },
    movieId: { type: String, required: true, index: true },
    episodeId: { type: String, default: '' },
    episodeNumber: { type: Number, default: 1 },
    playbackPosition: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    lastWatchedAt: { type: Date, default: () => new Date(), index: true }
  },
  { timestamps: true }
);
UserPlaybackProgressSchema.index({ userId: 1, movieId: 1, episodeNumber: 1 }, { unique: true });

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
      enum: ['PENDING', 'PENDING_REVIEW', 'PAID', 'REJECTED', 'EXPIRED', 'FAILED'],
      default: 'PENDING',
      index: true
    },
    checkoutUrl: { type: String, default: null },
    paidAt: { type: Date, default: null },
    verifiedByAdminId: { type: String, default: null },
    verifiedByAdminEmail: { type: String, default: null },
    verifiedAt: { type: Date, default: null },
    previousStatus: { type: String, default: null },
    rejectionReason: { type: String, default: null },
    seriesId: { type: String, default: null, index: true },
    accessType: { type: String, enum: ['subscription', 'rental', 'permanent'], default: 'subscription' },
    rentalDurationHours: { type: Number, default: null }
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
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    used: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const WebsiteSettingsSchema = new Schema<IWebsiteSettings & Document>(
  {
    key: { type: String, required: true, unique: true, default: 'global', index: true },
    siteName: { type: String, default: 'SODON AI MOVIE' },
    taglineMn: { type: String, default: 'Киноны Дараагийн Үе' },
    taglineEn: { type: String, default: 'Next-Gen AI Cinema' },
    featuredMovieId: { type: String, default: '' },
    announcementMn: { type: String, default: '' },
    announcementEn: { type: String, default: '' },
    maintenanceMode: { type: Boolean, default: false },
    allowRegistrations: { type: Boolean, default: true },
    primaryCurrency: { type: String, default: 'MNT' },
    defaultLocale: { type: String, enum: ['mn', 'en'], default: 'mn' },
    contactEmail: { type: String, default: 'gantomor6174@gmail.com' },
    contactPhone: { type: String, default: '+976 7711-2099' },
    streamingQualityDefault: { type: String, default: '4K HDR' },
    bankTransferEnabled: { type: Boolean, default: true },
    qpayEnabled: { type: Boolean, default: true },
    subscriptionPrices: {
      basic: { type: Number, default: 9900 },
      standard: { type: Number, default: 14900 },
      premium: { type: Number, default: 19900 }
    },
    faqItems: {
      type: [
        {
          qMn: { type: String },
          aMn: { type: String },
          qEn: { type: String },
          aEn: { type: String }
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

// Prevent re-compilation model errors in development
export const UserModel =
  mongoose.models.User || mongoose.model<IUser & Document>('User', UserSchema);

export const MovieModel =
  mongoose.models.Movie || mongoose.model<IMovie & Document>('Movie', MovieSchema);

export const EpisodeModel =
  mongoose.models.Episode || mongoose.model<IEpisode & Document>('Episode', EpisodeSchema);

export const SeriesPurchaseModel =
  mongoose.models.SeriesPurchase ||
  mongoose.model<ISeriesPurchase & Document>('SeriesPurchase', SeriesPurchaseSchema);

export const UserPlaybackProgressModel =
  mongoose.models.UserPlaybackProgress ||
  mongoose.model<IUserPlaybackProgress & Document>('UserPlaybackProgress', UserPlaybackProgressSchema);

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

export const WebsiteSettingsModel =
  mongoose.models.WebsiteSettings ||
  mongoose.model<IWebsiteSettings & Document>('WebsiteSettings', WebsiteSettingsSchema);

