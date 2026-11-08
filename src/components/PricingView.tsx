import React, { useState } from 'react';
import { Check, ShieldCheck, Zap, Sparkles, QrCode, ArrowRight, Smartphone, AlertCircle } from 'lucide-react';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../config/subscription-plans.js';

interface PricingViewProps {
  currentSubscription: any;
  onSelectPlan: (planId: string) => void;
  loadingPlanId: string | null;
}

export const PricingView: React.FC<PricingViewProps> = ({
  currentSubscription,
  onSelectPlan,
  loadingPlanId
}) => {
  const [billingCycle] = useState<'monthly'>('monthly');

  const plans = Object.values(SUBSCRIPTION_PLANS);

  const bankPartners = [
    'Хаан Банк',
    'Голомт Банк',
    'ХХБ (TDB)',
    'Төрийн Банк',
    'ХасБанк',
    'Монгол Шуудан',
    'Most Money',
    'SocialPay',
    'Ард Апп'
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/30">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Netflix загварын AI Кино Платформ</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Өөрт тохирох гишүүнчлэлийн багцаа сонгоно уу
        </h1>

        <p className="text-base text-neutral-400 max-w-2xl mx-auto">
          Бүх киног зар сурталчилгаагүй, 4K Ultra HD өндөр нарийвчлалтайгаар хүссэн төхөөрөмж дээрээ үзээрэй.
          Монголын бүх банкны <span className="text-white font-semibold">QPay</span> болон{' '}
          <span className="text-white font-semibold">Wire.mn</span> төлбөрийн гарцаар баталгаажна.
        </p>

        {/* QPay & Wire Trust Banner */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-400">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Wire.mn Албан ёсны гарц</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800">
            <QrCode className="w-4 h-4 text-red-400" />
            <span>QPay 100% найдвартай төлбөр</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>10 секундэд шууд идэвхжинэ</span>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => {
          const isCurrentPlan = currentSubscription?.planId === plan.id;
          const isLoading = loadingPlanId === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl flex flex-col justify-between transition-all duration-300 ${
                plan.popular
                  ? 'bg-gradient-to-b from-neutral-900 via-neutral-900 to-red-950/20 border-2 border-red-600 shadow-2xl shadow-red-950/40 md:-translate-y-2'
                  : 'bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-600 text-white shadow-lg">
                    Хамгийн эрэлттэй сонголт
                  </span>
                </div>
              )}

              <div className="p-6 sm:p-8">
                {/* Plan Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">{plan.nameMn}</h3>
                    <div className="text-xs text-neutral-400 uppercase tracking-wider mt-0.5">
                      {plan.name} Plan
                    </div>
                  </div>
                  {isCurrentPlan && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Идэвхтэй байна
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-400 mt-3 min-h-[32px] leading-relaxed">
                  {plan.descriptionMn}
                </p>

                {/* Price Display */}
                <div className="mt-6 pt-6 border-t border-neutral-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white tracking-tight">
                      {plan.price.toLocaleString()}₮
                    </span>
                    <span className="text-xs font-medium text-neutral-400">/ {plan.periodMn}</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    Автомат сунгалтгүй • Хүссэн үедээ гараар сунгана
                  </div>
                </div>

                {/* Tech Specs */}
                <div className="mt-6 space-y-2.5 text-xs bg-neutral-950/60 p-4 rounded-xl border border-neutral-800/80">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Дүрсний чанар:</span>
                    <span className="text-white font-semibold">{plan.resolution}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Нэг зэрэг үзэх төхөөрөмж:</span>
                    <span className="text-white font-semibold">{plan.concurrentScreens} төхөөрөмж</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Офлайн таталт:</span>
                    <span className="text-white font-semibold">
                      {plan.offlineDownloads ? 'Тийм' : 'Үгүй'}
                    </span>
                  </div>
                </div>

                {/* Feature Checklist */}
                <div className="mt-6 space-y-2.5">
                  <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                    Давуу талууд:
                  </div>
                  {plan.featuresMn.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-neutral-300">
                      <div className="w-4 h-4 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="p-6 sm:p-8 pt-0">
                <button
                  onClick={() => onSelectPlan(plan.id)}
                  disabled={isLoading}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition duration-200 active:scale-98 cursor-pointer ${
                    plan.popular
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-900/30'
                      : 'bg-white hover:bg-neutral-200 text-black'
                  } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Захиалга үүсгэж байна...</span>
                    </>
                  ) : isCurrentPlan ? (
                    <>
                      <span>Эрх сунгах (30 хоног)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Сонгох & QPay-ээр төлөх</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Supported Banks QPay Strip */}
      <div className="mt-16 p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center">
        <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center justify-center gap-2">
          <Smartphone className="w-4 h-4 text-red-500" />
          <span>QPay-ээр дэмжигдэх Монголын бүх банк болон цахим хэтэвч</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {bankPartners.map((bank, i) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-lg bg-neutral-950 text-neutral-300 text-xs font-medium border border-neutral-800 shadow-sm"
            >
              {bank}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
