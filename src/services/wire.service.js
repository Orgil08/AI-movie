import crypto from 'node:crypto';
export class WireService {
    constructor(apiKey, webhookSecret, baseUrl = 'https://api.wire.mn') {
        this.apiKey = apiKey || process.env.WIRE_API_KEY || '';
        this.webhookSecret = webhookSecret || process.env.WIRE_WEBHOOK_SECRET || '';
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }
    isConfigured() {
        return Boolean(this.apiKey && this.apiKey.trim().length > 0);
    }
    isWebhookConfigured() {
        return Boolean(this.webhookSecret && this.webhookSecret.trim().length > 0);
    }
    /**
     * Helper to perform authenticated requests to Wire API with Idempotency Key
     */
    async request(endpoint, options) {
        if (!this.apiKey) {
            throw new Error('WIRE_API_KEY is not configured in server environment');
        }
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
        if (options.idempotencyKey) {
            headers['Idempotency-Key'] = options.idempotencyKey;
        }
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            method: options.method,
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });
        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        }
        catch {
            throw new Error(`Wire API returned non-JSON response (${response.status}): ${responseText}`);
        }
        if (!response.ok) {
            const errorMsg = data?.error?.message || data?.message || `Wire API request failed with status ${response.status}`;
            const err = new Error(errorMsg);
            err.status = response.status;
            err.data = data;
            throw err;
        }
        return data;
    }
    /**
     * Create a PaymentIntent on Wire.mn
     * POST /v1/payment_intents
     */
    async createPaymentIntent(params) {
        if (!Number.isInteger(params.amount) || params.amount <= 0) {
            throw new Error('Payment amount must be a positive integer in MNT');
        }
        if (params.currency !== 'MNT') {
            throw new Error(`Unsupported currency: ${params.currency}. AI MOVIE only operates in MNT.`);
        }
        return this.request('/v1/payment_intents', {
            method: 'POST',
            idempotencyKey: params.idempotencyKey,
            body: {
                amount: params.amount,
                currency: params.currency,
                description: params.description,
                metadata: params.metadata
            }
        });
    }
    /**
     * Create a hosted checkout session on Wire.mn
     * POST /v1/checkout/sessions
     */
    async createCheckoutSession(params) {
        return this.request('/v1/checkout/sessions', {
            method: 'POST',
            idempotencyKey: params.idempotencyKey,
            body: {
                payment_intent: params.payment_intent,
                success_url: params.success_url,
                cancel_url: params.cancel_url
            }
        });
    }
    /**
     * Retrieve a PaymentIntent from Wire API
     * GET /v1/payment_intents/{paymentIntentId}
     */
    async getPaymentIntent(paymentIntentId) {
        if (!paymentIntentId) {
            throw new Error('paymentIntentId is required');
        }
        return this.request(`/v1/payment_intents/${encodeURIComponent(paymentIntentId)}`, {
            method: 'GET'
        });
    }
    /**
     * Parse the WirePayment-Signature header:
     * Example: "t=1731000000,v1=5257186dbcdf...[,v1=...]"
     */
    parseSignatureHeader(header) {
        if (!header || typeof header !== 'string') {
            throw new Error('Missing WirePayment-Signature header');
        }
        const parts = header.split(',');
        let timestamp = -1;
        const signatures = [];
        for (const part of parts) {
            const [key, value] = part.trim().split('=');
            if (key === 't') {
                timestamp = parseInt(value, 10);
            }
            else if (key === 'v1' && value) {
                signatures.push(value.trim());
            }
        }
        if (timestamp === -1 || isNaN(timestamp)) {
            throw new Error('Invalid signature header: missing or malformed timestamp');
        }
        if (signatures.length === 0) {
            throw new Error('Invalid signature header: missing v1 signature');
        }
        return { timestamp, signatures };
    }
    /**
     * Compute expected HMAC-SHA256 signature
     * signature = HMAC_SHA256(secret, timestamp + "." + raw_body)
     */
    computeSignature(payload, timestamp, secret) {
        const key = secret || this.webhookSecret;
        if (!key) {
            throw new Error('WIRE_WEBHOOK_SECRET is not configured');
        }
        const payloadBuffer = typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload;
        const prefixBuffer = Buffer.from(`${timestamp}.`, 'utf8');
        const combined = Buffer.concat([prefixBuffer, payloadBuffer]);
        return crypto.createHmac('sha256', key).update(combined).digest('hex');
    }
    /**
     * Verify webhook HMAC signature and timestamp tolerance
     * Default tolerance: 300 seconds (5 minutes)
     */
    verifyWebhookSignature(params) {
        const tolerance = params.toleranceSeconds !== undefined ? params.toleranceSeconds : 300;
        const now = params.currentTimeSeconds !== undefined ? params.currentTimeSeconds : Math.floor(Date.now() / 1000);
        const { timestamp, signatures } = this.parseSignatureHeader(params.signatureHeader);
        // Check timestamp tolerance (reject timestamps older than 5 minutes or in future by > 5 minutes)
        if (Math.abs(now - timestamp) > tolerance) {
            throw new Error(`Webhook timestamp expired or out of tolerance: header timestamp=${timestamp}, current time=${now}, diff=${Math.abs(now - timestamp)}s > tolerance=${tolerance}s`);
        }
        // Compute expected signature
        const expectedSigHex = this.computeSignature(params.rawBody, timestamp, params.secret);
        const expectedBuf = Buffer.from(expectedSigHex, 'utf8');
        let matched = false;
        for (const sig of signatures) {
            const sigBuf = Buffer.from(sig, 'utf8');
            if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
                matched = true;
                break;
            }
        }
        if (!matched) {
            throw new Error('Webhook signature mismatch: HMAC verification failed');
        }
        return { isValid: true, timestamp };
    }
}
export const defaultWireService = new WireService();
