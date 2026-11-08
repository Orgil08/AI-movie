import React from 'react';
import { ShieldCheck, Calendar, Clock, Tv, Film, Sparkles, RefreshCw, CreditCard, AlertCircle } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../config/subscription-plans.js';

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
  const plan = subscription?.planId ? SUBSCRIPTION_PLANS[subscription.planId] : null;

  const daysRemaining = subscription?.daysRemaining !== undefined
    ? subscription.daysRemaining
    : subscription?.endDate
    ? Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 30;

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Миний гишүүнчлэл</h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Таны AI MOVIE платформ дээрх одоогийн эрх, хугацаа болон багцын мэдээлэл.
        </p>
      </div>

      {subscription && subscription.status === 'ACTIVE' ? (
        <div className="space-y-6">
          {/* Main Active Card */}
          <div className="relative rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-red-950/30 border border-neutral-700/80 p-6 sm:p-8 shadow-2xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Идэвхтэй гишүүнчлэл
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {plan?.nameMn || subscription.planName || 'AI MOVIE Багц'}
                </h2>
                <div className="text-xs text-neutral-400 mt-0.5">
                  Сүүлийн гүйлгээний дугаар: <span className="font-mono">{subscription.paymentId}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onUpgradeOrRenew}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-900/30 transition cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Багц сунгах / Өөрчлөх</span>
                </button>
              </div>
            </div>

            {/* Timing & Privileges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800">
                <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
                  <Clock className="w-4 h-4 text-red-500" />
                  <span>Үлдсэн хугацаа:</span>
                </div>
                <div className="text-2xl font-black text-white">
                  {daysRemaining} хоног
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Автомат сунгалтгүй, хүссэн үедээ сунгана
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800">
                <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  <span>Дуусах огноо:</span>
                </div>
                <div className="text-sm font-bold text-neutral-200 mt-1">
                  {new Date(subscription.endDate).toLocaleDateString('mn-MN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Эхэлсэн: {new Date(subscription.startDate).toLocaleDateString('mn-MN')}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800">
                <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
                  <Tv className="w-4 h-4 text-amber-500" />
                  <span>Дүрсний дээд нарийвчлал:</span>
                </div>
                <div className="text-lg font-bold text-white mt-1">
                  {plan?.resolution || '1080p Full HD'}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  {plan?.concurrentScreens || 2} зэрэг үзэх төхөөрөмж
                </div>
              </div>
            </div>

            {/* Feature List */}
            {plan?.featuresMn && (
              <div className="mt-6 pt-6 border-t border-neutral-800">
                <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-3">
                  Таны багцад багтсан эрхүүд:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-300">
                  {plan.featuresMn.map((feat: string, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
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
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-950/40 border border-amber-800/40 text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-white">Идэвхтэй гишүүнчлэл олдсонгүй</h2>

          <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
            Танд одоогоор идэвхтэй багц байхгүй байна. Та QPay ашиглан 10 секундэд гишүүнчлэлээ идэвхжүүлж,
            бүх шилдэг AI киног 4K HDR чанараар үзэх боломжтой.
          </p>

          <div className="pt-2">
            <button
              onClick={onUpgradeOrRenew}
              className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm inline-flex items-center gap-2 shadow-lg shadow-red-900/40 transition cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Гишүүнчлэлийн багц сонгох (QPay)</span>
            </button>
          </div>
        </div>
      )}

      {/* Account Info Box */}
      <div className="rounded-xl bg-neutral-900/80 border border-neutral-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div>
          <div className="font-semibold text-white">Бүртгэлтэй хэрэглэгч: {user.name}</div>
          <div className="text-neutral-400">{user.email} (Хэрэглэгчийн ID: {user.id})</div>
        </div>
        <button
          onClick={onGoToHistory}
          className="text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 self-start sm:self-auto"
        >
          <span>Төлбөрийн түүх харах →</span>
        </button>
      </div>
    </div>
  );
};
