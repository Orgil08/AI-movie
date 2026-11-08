/**
 * AI MOVIE Subscription Plans Configuration
 * Official pricing in whole Mongolian Tugrik (MNT)
 * Basic: 9,900 MNT / month
 * Standard: 14,900 MNT / month
 * Premium: 19,900 MNT / month
 */

export interface SubscriptionPlan {
  id: 'basic' | 'standard' | 'premium';
  name: string;
  nameMn: string;
  nameEn?: string;
  price: number; // Whole MNT
  currency: 'MNT';
  periodMn: string;
  periodEn?: string;
  descriptionMn: string;
  descriptionEn?: string;
  resolution: string;
  videoQuality: string;
  concurrentScreens: number;
  offlineDownloads: boolean;
  qpaySupported: boolean;
  popular?: boolean;
  featuresMn: string[];
  featuresEn?: string[];
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    nameMn: 'Суурь Багц',
    nameEn: 'Basic Plan',
    price: 9900,
    currency: 'MNT',
    periodMn: 'сар бүр',
    periodEn: 'month',
    descriptionMn: 'Ганцаараа үзэх, гар утас болон таблетад тохиромжтой',
    descriptionEn: 'Essential personal viewing on smartphones and tablets with zero ads',
    resolution: '720p HD',
    videoQuality: 'Good',
    concurrentScreens: 1,
    offlineDownloads: false,
    qpaySupported: true,
    featuresMn: [
      '720p (HD) чанараар үзэх',
      'Нэг зэрэг 1 төхөөрөмж дээр тоглуулах',
      'Бүх үндсэн AI кино болон цувралууд',
      'QPay-ээр бүх банкны аппликейшнээр төлөх',
      'Зар сурталчилгаагүй үзэх'
    ],
    featuresEn: [
      '720p HD crisp video playback',
      '1 concurrent stream',
      'Full access to core AI movie library',
      'Instant QPay & Khan Bank payment',
      '100% ad-free experience'
    ]
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    nameMn: 'Стандарт Багц',
    nameEn: 'Standard Plan',
    price: 14900,
    currency: 'MNT',
    periodMn: 'сар бүр',
    periodEn: 'month',
    descriptionMn: 'Гэр бүл, найз нөхдөд зориулсан шилдэг сонголт',
    descriptionEn: 'Full HD multi-screen cinema streaming with offline mobile downloads',
    resolution: '1080p Full HD',
    videoQuality: 'Great',
    concurrentScreens: 2,
    offlineDownloads: true,
    qpaySupported: true,
    popular: true,
    featuresMn: [
      '1080p (Full HD) өндөр чанар',
      'Нэг зэрэг 2 төхөөрөмж дээр тоглуулах',
      'Бүх Премиум болон онцгой AI кинонууд',
      'Гар утсанд татаж аваад офлайн үзэх',
      'QPay-ээр бүх банкны аппликейшнээр төлөх',
      'Ухаалаг ТВ, компьютер, гар утас дэмжинэ'
    ],
    featuresEn: [
      '1080p Full HD cinema resolution',
      '2 concurrent screen streams',
      'All exclusive AI movies & premieres',
      'Mobile offline downloads',
      'Smart TV, desktop & tablet apps',
      'QPay instant verification'
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    nameMn: 'Премиум Багц',
    nameEn: 'Premium 4K VIP',
    price: 19900,
    currency: 'MNT',
    periodMn: 'сар бүр',
    periodEn: 'month',
    descriptionMn: '4K HDR кино театрын дээд зэргийн дуугаралт, чанар',
    descriptionEn: 'The ultimate 4K Ultra HD & Dolby Atmos experience for up to 4 devices',
    resolution: '4K Ultra HD + HDR',
    videoQuality: 'Ultimate (Dolby Atmos)',
    concurrentScreens: 4,
    offlineDownloads: true,
    qpaySupported: true,
    featuresMn: [
      '4K Ultra HD + HDR дээд зэрэглэлийн чанар',
      'Нэг зэрэг 4 төхөөрөмж дээр зэрэг үзэх',
      'Бүх кино, AI нээлт болон шууд дамжуулалт',
      'Dolby Atmos орон зайн дуугаралт',
      'Офлайн таталт (Хязгааргүй төхөөрөмж)',
      'QPay банкны апп-уудаар 10 секундэд баталгаажих'
    ],
    featuresEn: [
      '4K Ultra HD + HDR cinematic master',
      '4 concurrent devices simultaneously',
      'All VIP titles, premieres & livestreams',
      'Dolby Atmos spatial soundstage',
      'Unlimited offline downloads',
      'Instant QPay & Khan Bank 5132104221 settlement'
    ]
  }
};

export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS[planId];
}

export function isValidPlanId(planId: string): planId is 'basic' | 'standard' | 'premium' {
  return planId in SUBSCRIPTION_PLANS;
}
