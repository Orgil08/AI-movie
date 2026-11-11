export type SubscriptionTier = 'basic' | 'standard' | 'premium';

export const PLAN_RANKS: Record<SubscriptionTier, number> = {
  basic: 1,
  standard: 2,
  premium: 3
};

export function getPlanRank(planId?: string | null): number {
  if (!planId) return 0;
  const key = planId.toLowerCase() as SubscriptionTier;
  return PLAN_RANKS[key] ?? 0;
}

export interface AccessCheckMovie {
  id: string;
  isPremium?: boolean;
  minPlan?: SubscriptionTier | string;
}

export interface AccessCheckUser {
  id: string;
  role?: string;
  status?: 'active' | 'suspended' | string;
}

export interface AccessCheckSubscription {
  planId: string;
  status: string;
  endDate: Date | string;
}

export interface AccessCheckResult {
  allowed: boolean;
  code?:
    | 'AUTH_REQUIRED'
    | 'ACCOUNT_SUSPENDED'
    | 'PREMIUM_REQUIRED'
    | 'SUBSCRIPTION_EXPIRED'
    | 'INSUFFICIENT_PLAN_TIER';
  messageMn?: string;
  messageEn?: string;
  requiredPlan?: SubscriptionTier;
  currentPlan?: string | null;
}

/**
 * Centralized server- and client-compatible access control check for movies.
 * Enforces:
 * 1. Free movies (!isPremium) are always accessible.
 * 2. Admins have full access if active.
 * 3. Active non-expired subscription required for premium movies.
 * 4. Plan hierarchy: basic (1) < standard (2) < premium (3).
 *    userPlanRank >= movieMinPlanRank
 */
export function checkMovieAccess(params: {
  movie: AccessCheckMovie;
  user: AccessCheckUser | null | undefined;
  subscription: AccessCheckSubscription | null | undefined;
  now?: Date;
}): AccessCheckResult {
  const { movie, user, subscription, now = new Date() } = params;
  const requiredPlan: SubscriptionTier =
    movie.minPlan === 'standard' || movie.minPlan === 'premium' ? movie.minPlan : 'basic';

  // Free movie is accessible to everyone (unless suspended user)
  if (!movie.isPremium) {
    if (user && user.status === 'suspended') {
      return {
        allowed: false,
        code: 'ACCOUNT_SUSPENDED',
        messageMn: 'Таны бүртгэл түр түдгэлзсэн байна.',
        messageEn: 'Your account is currently suspended.'
      };
    }
    return { allowed: true, requiredPlan };
  }

  if (!user) {
    return {
      allowed: false,
      code: 'AUTH_REQUIRED',
      requiredPlan,
      messageMn: 'Энэ киног үзэхийн тулд эхлээд системд нэвтэрнэ үү.',
      messageEn: 'Please sign in to watch this premium title.'
    };
  }

  if (user.status === 'suspended') {
    return {
      allowed: false,
      code: 'ACCOUNT_SUSPENDED',
      requiredPlan,
      messageMn: 'Таны бүртгэл түр түдгэлзсэн байна.',
      messageEn: 'Your account is currently suspended.'
    };
  }

  // Active administrator can preview any movie
  if (user.role === 'admin') {
    return { allowed: true, requiredPlan, currentPlan: 'admin' };
  }

  if (!subscription || subscription.status !== 'ACTIVE') {
    return {
      allowed: false,
      code: 'PREMIUM_REQUIRED',
      requiredPlan,
      currentPlan: null,
      messageMn: `Энэ киног үзэхийн тулд идэвхтэй ${requiredPlan.toUpperCase()} эсвэл түүнээс дээш багцын гишүүнчлэл шаардлагатай.`,
      messageEn: `An active ${requiredPlan.toUpperCase()} or higher subscription is required to watch this movie.`
    };
  }

  const endTime = new Date(subscription.endDate).getTime();
  if (isNaN(endTime) || endTime <= now.getTime()) {
    return {
      allowed: false,
      code: 'SUBSCRIPTION_EXPIRED',
      requiredPlan,
      currentPlan: subscription.planId,
      messageMn: 'Таны гишүүнчлэлийн хугацаа дууссан байна. Багцаа сунгана уу.',
      messageEn: 'Your subscription has expired. Please renew your plan.'
    };
  }

  const userRank = getPlanRank(subscription.planId);
  const requiredRank = getPlanRank(requiredPlan);

  if (userRank < requiredRank) {
    const planLabelMn =
      requiredPlan === 'premium' ? 'Премиум (4K VIP)' : requiredPlan === 'standard' ? 'Стандарт (Full HD)' : 'Суурь (Basic)';
    const planLabelEn =
      requiredPlan === 'premium' ? 'Premium 4K VIP' : requiredPlan === 'standard' ? 'Standard Full HD' : 'Basic';
    return {
      allowed: false,
      code: 'INSUFFICIENT_PLAN_TIER',
      requiredPlan,
      currentPlan: subscription.planId,
      messageMn: `Энэ кино зөвхөн ${planLabelMn} болон түүнээс дээш багцтай хэрэглэгчдэд нээлттэй. Таны одоогийн багц: ${subscription.planId.toUpperCase()}.`,
      messageEn: `This title requires the ${planLabelEn} plan or higher. Your current plan is ${subscription.planId.toUpperCase()}.`
    };
  }

  return {
    allowed: true,
    requiredPlan,
    currentPlan: subscription.planId
  };
}

/**
 * Convenience helper for UI components to determine if a movie is locked for the current subscription.
 */
export function isMovieLockedForSubscription(
  movie: { isPremium?: boolean; minPlan?: string },
  subscription: { planId?: string; status?: string; endDate?: Date | string } | null | undefined,
  userRole?: string
): boolean {
  if (!movie.isPremium) return false;
  if (userRole === 'admin') return false;
  if (!subscription || subscription.status !== 'ACTIVE') return true;
  if (subscription.endDate) {
    const end = new Date(subscription.endDate).getTime();
    if (!isNaN(end) && end <= Date.now()) return true;
  }
  const userRank = getPlanRank(subscription.planId);
  const reqRank = getPlanRank(movie.minPlan || 'basic');
  return userRank < reqRank;
}
