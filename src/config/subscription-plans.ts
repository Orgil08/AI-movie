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
  price: number; // Whole MNT
  currency: 'MNT';
  periodMn: string;
  descriptionMn: string;
  resolution: string;
  videoQuality: string;
  concurrentScreens: number;
  offlineDownloads: boolean;
  qpaySupported: boolean;
  popular?: boolean;
  featuresMn: string[];
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    nameMn: 'Суурь Багц',
    price: 9900,
    currency: 'MNT',
    periodMn: 'сар бүр',
    descriptionMn: 'Ганцаараа үзэх, гар утас болон таблетад тохиромжтой',
    resolution: '720p HD',
    videoQuality: 'Сайн',
    concurrentScreens: 1,
    offlineDownloads: false,
    qpaySupported: true,
    featuresMn: [
      '720p (HD) чанараар үзэх',
      'Нэг зэрэг 1 төхөөрөмж дээр тоглуулах',
      'Бүх үндсэн AI кино болон цувралууд',
      'QPay-ээр бүх банкны аппликейшнээр төлөх',
      'Зар сурталчилгаагүй үзэх'
    ]
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    nameMn: 'Стандарт Багц',
    price: 14900,
    currency: 'MNT',
    periodMn: 'сар бүр',
    descriptionMn: 'Гэр бүл, найз нөхдөд зориулсан шилдэг сонголт',
    resolution: '1080p Full HD',
    videoQuality: 'Маш сайн',
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
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    nameMn: 'Премиум Багц',
    price: 19900,
    currency: 'MNT',
    periodMn: 'сар бүр',
    descriptionMn: '4K HDR кино театрын дээд зэргийн дуугаралт, чанар',
    resolution: '4K Ultra HD + HDR',
    videoQuality: 'Дээд зэрэг (Dolby Atmos)',
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
    ]
  }
};

export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS[planId];
}

export function isValidPlanId(planId: string): planId is 'basic' | 'standard' | 'premium' {
  return planId in SUBSCRIPTION_PLANS;
}
