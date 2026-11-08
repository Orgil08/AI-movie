import React from 'react';
import { Calendar, Clock, Tv, RefreshCw, CreditCard, AlertCircle } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../config/subscription-plans.js';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';
import { formatDate } from '../i18n/types.js';

interface SubscriptionViewProps {
  subscription: any;
  user: { id: string; name: string; email: string };
  onUpgradeOrRenew: () => void;
  onGoToHistory: () => void;
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({
  subscription,
  user,
  onUpgradeOrRenew,
  onGoToHistory
}) => {
  const t = useTranslations('Subscription');
  const { locale } = useLocale();

  const plan = subscription?.planId ? SUBSCRIPTION_PLANS[subscription.planId] : null;

  const daysRemaining = subscription?.daysRemaining !== undefined
    ? subscription.daysRemaining
    : subscription?.endDate
    ? Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 30;

  const planName = plan
    ? locale === 'en'
      ? plan.name
      : plan.nameMn
    : subscription?.planName || (locale === 'en' ? 'AI MOVIE Plan' : 'AI MOVIE Багц');

  const features = plan
    ? locale === 'en'
      ? plan.featuresEn || plan.featuresMn
      : plan.featuresMn
    : [];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8 select-none">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">{t('title')}</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          {locale === 'en'
            ? 'Your active Streamline subscription status, remaining days, and 4K benefits.'
            : 'Таны AI MOVIE платформ дээрх одоогийн эрх, хугацаа болон багцын мэдээлэл.'}
        </p>
      </div>

      {subscription && subscription.status === 'ACTIVE' ? (
        <div className="space-y-6">
          {/* Main Active Card */}
          <div className="relative rounded-2xl bg-[#111827] border border-[#e5a93c]/40 p-6 sm:p-8 shadow-2xl shadow-black/80 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    {t('statusActive')}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {planName}
                </h2>
                <div className="text-xs text-slate-400 mt-0.5">
                  {locale === 'en' ? 'Order Reference:' : 'Сүүлийн гүйлгээний дугаар:'}{' '}
                  <span className="font-mono text-slate-300">{subscription.paymentId}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onUpgradeOrRenew}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e5a93c] via-amber-400 to-[#e5a93c] text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-950/40 hover:brightness-110 transition cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{t('renewPlan')}</span>
                </button>
              </div>
            </div>

            {/* Timing & Privileges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="p-4 rounded-xl bg-[#0b0f19] border border-white/10">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Clock className="w-4 h-4 text-[#e5a93c]" />
                  <span>{t('daysRemaining')}:</span>
                </div>
                <div className="text-2xl font-black text-[#e5a93c]">
                  {daysRemaining} {t('days')}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {locale === 'en' ? 'No auto-charges, renew explicitly' : 'Автомат сунгалтгүй, хүссэн үедээ сунгана'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0b0f19] border border-white/10">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>{t('expiresOn')}:</span>
                </div>
                <div className="text-sm font-bold text-slate-200 mt-1">
                  {formatDate(subscription.endDate, locale)}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {t('startDate')}: {formatDate(subscription.startDate, locale)}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0b0f19] border border-white/10">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Tv className="w-4 h-4 text-amber-400" />
                  <span>{locale === 'en' ? 'Streaming Tier:' : 'Дүрсний дээд нарийвчлал:'}</span>
                </div>
                <div className="text-lg font-bold text-white mt-1">
                  {plan?.resolution || '4K Ultra HD'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {plan?.concurrentScreens || 4} {locale === 'en' ? 'Screens' : 'зэрэг үзэх төхөөрөмж'}
                </div>
              </div>
            </div>

            {/* Feature List */}
            {features.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  {t('includedFeatures')}:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  {features.map((feat: string, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#e5a93c] shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty / Inactive state */
        <div className="rounded-2xl bg-[#111827] border border-white/10 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-950/40 border border-amber-800/40 text-[#e5a93c] flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-white">{t('noActiveSubscription')}</h2>

          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            {locale === 'en'
              ? 'Activate your subscription in 10 seconds with Wire.mn QPay or direct bank transfer for instant 4K Ultra HD movie streaming.'
              : 'Танд одоогоор идэвхтэй багц байхгүй байна. Та QPay эсвэл Дансаар шилжүүлэн 1 минутад гишүүнчлэлээ идэвхжүүлэх боломжтой.'}
          </p>

          <div className="pt-2">
            <button
              onClick={onUpgradeOrRenew}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#e5a93c] via-amber-400 to-[#e5a93c] text-black font-extrabold text-sm inline-flex items-center gap-2 shadow-xl shadow-amber-950/40 hover:brightness-110 transition cursor-pointer"
            >
              <CreditCard className="w-4 h-4 fill-black" />
              <span>{t('upgradeNow')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Account Info Box */}
      <div className="rounded-xl bg-[#111827]/80 border border-white/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div>
          <div className="font-semibold text-white">
            {locale === 'en' ? 'Active Member:' : 'Бүртгэлтэй хэрэглэгч:'} {user.name}
          </div>
          <div className="text-slate-400">
            {user.email} (ID: {user.id})
          </div>
        </div>
        <button
          onClick={onGoToHistory}
          className="text-[#e5a93c] hover:underline font-semibold flex items-center gap-1 self-start sm:self-auto cursor-pointer"
        >
          <span>{locale === 'en' ? 'View Payment History →' : 'Төлбөрийн түүх харах →'}</span>
        </button>
      </div>
    </div>
  );
};
