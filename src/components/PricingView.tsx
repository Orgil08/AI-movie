import React, { useState } from 'react';
import { Check, ShieldCheck, Sparkles, QrCode, ArrowRight, Building2, Copy, CheckCircle2 } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../config/subscription-plans.js';
import { BANK_TRANSFER_DETAILS } from '../config/bank-details.js';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';
import { formatCurrency } from '../i18n/types.js';

interface PricingViewProps {
  currentSubscription: any;
  onSelectPlan: (planId: string, paymentMethod?: 'wire_qpay' | 'bank_transfer') => void;
  loadingPlanId: string | null;
}

export const PricingView: React.FC<PricingViewProps> = ({
  currentSubscription,
  onSelectPlan,
  loadingPlanId
}) => {
  const t = useTranslations('Pricing');
  const { locale } = useLocale();
  const [selectedMethod, setSelectedMethod] = useState<'wire_qpay' | 'bank_transfer'>('wire_qpay');
  const [copiedAccount, setCopiedAccount] = useState(false);

  const plans = Object.values(SUBSCRIPTION_PLANS);
  const bankPartners = BANK_TRANSFER_DETAILS.supportedBanks;

  const handleCopyAccount = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(BANK_TRANSFER_DETAILS.accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  return (
    <div className="py-14 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 w-full max-w-[1600px] mx-auto select-none">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-[#e5a93c]/15 text-[#e5a93c] border border-[#e5a93c]/30">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('badge')}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          {t('title')}
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          {t('subtitle')}
        </p>

        {/* Payment Method Selector Toggle */}
        <div className="pt-4 max-w-2xl mx-auto">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            {t('choosePaymentMethod')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 bg-[#111827] rounded-2xl border border-white/10">
            <button
              onClick={() => setSelectedMethod('wire_qpay')}
              className={`p-3.5 rounded-xl flex items-center gap-3 transition cursor-pointer text-left ${
                selectedMethod === 'wire_qpay'
                  ? 'bg-[#e5a93c]/15 border-2 border-[#e5a93c] text-white shadow-lg'
                  : 'hover:bg-white/5 text-slate-400 border border-transparent'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-[#e5a93c] flex items-center justify-center text-black shrink-0 font-bold">
                <QrCode className="w-5 h-5 text-black" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{t('methodQpay')}</span>
                  <span className="px-1.5 py-0.2 text-[9px] rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                    {locale === 'en' ? 'Instant' : 'Шуурхай'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{t('methodQpayDesc')}</div>
              </div>
            </button>

            <button
              onClick={() => setSelectedMethod('bank_transfer')}
              className={`p-3.5 rounded-xl flex items-center gap-3 transition cursor-pointer text-left ${
                selectedMethod === 'bank_transfer'
                  ? 'bg-[#e5a93c]/15 border-2 border-[#e5a93c] text-white shadow-lg'
                  : 'hover:bg-white/5 text-slate-400 border border-transparent'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-[#0e1422] border border-white/15 flex items-center justify-center text-[#e5a93c] shrink-0 font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{t('methodBank')}</span>
                  <span className="px-1.5 py-0.2 text-[9px] rounded bg-amber-500/20 text-[#e5a93c] border border-amber-500/30 font-semibold">
                    {locale === 'en' ? 'Bank' : 'Данс'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">5132104221 Сүхбат Мөнх-Оргил</div>
              </div>
            </button>
          </div>

          {/* Quick Bank Account Banner if Bank Transfer selected */}
          {selectedMethod === 'bank_transfer' && (
            <div className="mt-3 p-3.5 rounded-xl bg-amber-950/30 border border-amber-700/40 text-left text-xs text-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="space-y-0.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#e5a93c]" />
                  <span>{BANK_TRANSFER_DETAILS.bankName}: {BANK_TRANSFER_DETAILS.accountNumber}</span>
                </div>
                <div className="text-[11px] text-amber-300/80">
                  {locale === 'en' ? 'Account Holder:' : 'Эзэмшигч:'}{' '}
                  <span className="font-semibold text-white">{BANK_TRANSFER_DETAILS.accountHolder}</span> ({BANK_TRANSFER_DETAILS.accountHolderEn})
                </div>
              </div>
              <button
                onClick={handleCopyAccount}
                className="px-3 py-1.5 rounded-lg bg-[#e5a93c]/20 hover:bg-[#e5a93c]/30 text-[#e5a93c] font-semibold text-xs flex items-center gap-1.5 border border-[#e5a93c]/40 transition self-start sm:self-auto cursor-pointer"
              >
                {copiedAccount ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{locale === 'en' ? 'Copied' : 'Хуулагдлаа'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{locale === 'en' ? 'Copy Account' : 'Данс хуулах'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
        {plans.map((plan) => {
          const isCurrentPlan = currentSubscription?.planId === plan.id;
          const isLoading = loadingPlanId === plan.id;
          const planName = locale === 'en' ? plan.name : plan.nameMn;
          const planDesc = locale === 'en' ? plan.descriptionEn || plan.descriptionMn : plan.descriptionMn;
          const features = locale === 'en' ? plan.featuresEn || plan.featuresMn : plan.featuresMn;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl flex flex-col justify-between transition-all duration-300 backdrop-blur-md ${
                plan.popular
                  ? 'bg-gradient-to-b from-[#111827] via-[#0f172a] to-[#1c1917] border-2 border-[#e5a93c] shadow-2xl shadow-amber-950/30 md:-translate-y-2'
                  : 'bg-[#111827]/80 border border-white/10 hover:border-white/20'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 w-max max-w-[90%] text-center">
                  <span className="px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-[#e5a93c] text-black shadow-lg shadow-amber-950/60 whitespace-nowrap border border-amber-300/40">
                    {t('mostPopular')}
                  </span>
                </div>
              )}

              <div className={`p-6 sm:p-8 ${plan.popular ? 'pt-8 sm:pt-9' : ''}`}>
                {/* Plan Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white">{planName}</h3>
                    <div className="text-[11px] text-[#e5a93c] font-bold uppercase tracking-wider mt-0.5">
                      SODON {plan.name.toUpperCase()}
                    </div>
                  </div>
                  {isCurrentPlan && (
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {t('currentPlanBadge')}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-3 min-h-[36px] leading-relaxed">
                  {planDesc}
                </p>

                {/* Price Display */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {formatCurrency(plan.price, locale, true)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {locale === 'en'
                      ? 'No auto-renewal · Explicit one-time authorization'
                      : 'Автомат сунгалтгүй • Хүссэн үедээ гараар сунгана'}
                  </div>
                </div>

                {/* Tech Specs */}
                <div className="mt-6 space-y-2.5 text-xs bg-[#070a12]/80 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{locale === 'en' ? 'Quality:' : 'Дүрсний чанар:'}</span>
                    <span className="text-white font-semibold">{plan.resolution}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{locale === 'en' ? 'Screens:' : 'Зэрэг үзэх төхөөрөмж:'}</span>
                    <span className="text-white font-semibold">
                      {plan.concurrentScreens} {locale === 'en' ? 'Screens' : 'төхөөрөмж'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{locale === 'en' ? 'Downloads:' : 'Офлайн таталт:'}</span>
                    <span className="text-white font-semibold">
                      {plan.offlineDownloads ? (locale === 'en' ? 'Yes' : 'Тийм') : (locale === 'en' ? 'No' : 'Үгүй')}
                    </span>
                  </div>
                </div>

                {/* Feature Checklist */}
                <div className="mt-6 space-y-2.5">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    {locale === 'en' ? 'Included Privileges:' : 'Багцын давуу талууд:'}
                  </div>
                  {(features || []).map((feat: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-[#e5a93c]/20 text-[#e5a93c] flex items-center justify-center shrink-0 mt-0.5 font-bold">
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
                  onClick={() => onSelectPlan(plan.id, selectedMethod)}
                  disabled={isLoading}
                  className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition duration-200 active:scale-98 cursor-pointer ${
                    plan.popular
                      ? 'bg-gradient-to-r from-[#e5a93c] via-amber-400 to-[#e5a93c] text-black shadow-xl shadow-amber-950/40 hover:brightness-110'
                      : 'bg-white hover:bg-slate-200 text-black'
                  } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>{locale === 'en' ? 'Creating order...' : 'Захиалга үүсгэж байна...'}</span>
                    </>
                  ) : selectedMethod === 'bank_transfer' ? (
                    <>
                      <span>{locale === 'en' ? 'Pay via Khan Bank (5132104221)' : 'Дансаар шилжүүлж авах'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : isCurrentPlan ? (
                    <>
                      <span>{locale === 'en' ? 'Renew Membership' : 'Эрх сунгах (30 хоног)'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>{locale === 'en' ? 'Pay with Wire (QPay)' : 'Сонгох & QPay-ээр төлөх'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Supported Banks Strip */}
      <div className="mt-14 p-6 rounded-2xl bg-[#111827]/60 border border-white/10 text-center">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#e5a93c]" />
          <span>{locale === 'en' ? 'Supported Mongolian Banking Apps via QPay & Interbank' : 'QPay болон Дансны шилжүүлгээр дэмжигдэх Монголын бүх банк'}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {bankPartners.map((bank, i) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-lg bg-[#070a12] text-slate-300 text-xs font-medium border border-white/10 shadow-sm"
            >
              {bank}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
