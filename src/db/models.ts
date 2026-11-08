import mongoose, { Schema, Document } from 'mongoose';

export type PaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface IPayment {
  id?: string;
  userId: string;
  orderNumber: string;
  planId: string;
  wirePaymentIntentId: string;
  wireCheckoutSessionId?: string;
  wireChargeId?: string;
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

/* ============================================================
 * Mongoose Schemas (Used when MONGODB_URI is provided)
 * ============================================================ */

export const PaymentSchema = new Schema<IPayment & Document>(
  {
    userId: { type: String, required: true, index: true },
    orderNumber: { type: String, required: true, unique: true, index: true },
    planId: { type: String, required: true },
    wirePaymentIntentId: { type: String, required: true, index: true },
    wireCheckoutSessionId: { type: String, default: null },
    wireChargeId: { type: String, default: null },
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

// Prevent re-compilation model errors in development
export const PaymentModel =
  mongoose.models.Payment || mongoose.model<IPayment & Document>('Payment', PaymentSchema);

export const SubscriptionModel =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription & Document>('Subscription', SubscriptionSchema);

export const WireWebhookEventModel =
  mongoose.models.WireWebhookEvent ||
  mongoose.model<IWireWebhookEvent & Document>('WireWebhookEvent', WireWebhookEventSchema);
