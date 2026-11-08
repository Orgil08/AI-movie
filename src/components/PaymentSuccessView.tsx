import React, { useEffect, useState } from 'react';
import { CheckCircle2, Film, ArrowRight, Clock } from 'lucide-react';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';
import { formatCurrency, formatDate } from '../i18n/types.js';

interface PaymentSuccessViewProps {
  orderNumber: string;
  onGoToHome: () => void;
  onGoToSubscription: () => void;
}

export const PaymentSuccessView: React.FC<PaymentSuccessViewProps> = ({
  orderNumber,
  onGoToHome,
  onGoToSubscription
}) => {
  const t = useTranslations('Payment');
  const { locale } = useLocale();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 15;

    const checkStatus = async () => {
      try {
        attempts++;
        const res = await fetch(`/api/payments/${orderNumber}`);
        if (!res.ok) {
          throw new Error('Order details not found');
        }
        const data = await res.json();
        setOrder(data);

        // Only stop polling when status is confirmed PAID
        if (data.status === 'PAID') {
          setLoading(false);
          return;
        }

        if (attempts >= maxAttempts) {
          setLoading(false);
          return;
        }

        // Retry every 2.5 seconds if still PENDING
        setTimeout(checkStatus, 2500);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    checkStatus();
  }, [orderNumber]);

  const localizedPlanName = order?.plan
    ? locale === 'en'
      ? order.plan.name || order.planName
      : order.plan.nameMn || order.planName
    : order?.planName;

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-lg mx-auto select-none">
      <div className="bg-[#111827] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/80 p-6 sm:p-8 text-center">
        {loading ? (
          <div className="py-8 space-y-4">
            <div className="w-14 h-14 border-4 border-[#e5a93c] border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-white">{t('waiting')}</h2>
            <p className="text-xs text-slate-400">
              {locale === 'en'
                ? 'Verifying Wire webhook signature and bank settlement in background...'
                : 'QPay-ээр хийсэн төлбөрийн вебхүүк болон банкны гүйлгээг серверээс шалгаж байна.'}
            </p>
          </div>
        ) : order && order.status === 'PAID' ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Success Icon */}
            <div className="w-20 h-20 rounded-full bg-emerald-950/60 border-2 border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-950/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {t('successTitle')}
              </span>
              <h1 className="text-2xl font-black text-white mt-3">
                {locale === 'en' ? 'Streamline VIP Membership Activated!' : 'AI MOVIE Гишүүнчлэл идэвхжлээ!'}
              </h1>
              <p className="text-xs text-slate-400 mt-2">
                {t('successSubtitle')}
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="bg-[#0b0f19] rounded-xl p-4 border border-white/10 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">{locale === 'en' ? 'Order Number:' : 'Захиалгын дугаар:'}</span>
                <span className="font-mono text-slate-200">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{locale === 'en' ? 'Plan Tier:' : 'Багц:'}</span>
                <span className="font-semibold text-white">{localizedPlanName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{locale === 'en' ? 'Amount Paid:' : 'Төлсөн дүн:'}</span>
                <span className="font-bold text-[#e5a93c]">
                  {formatCurrency(order.amount, locale, false)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t('paymentDate')}:</span>
                <span className="text-slate-300">
                  {order.paidAt ? formatDate(order.paidAt, locale) : (locale === 'en' ? 'Just now' : 'Саяхан')}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={onGoToHome}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#e5a93c] via-amber-400 to-[#e5a93c] text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-950/40 transition hover:brightness-110 cursor-pointer"
              >
                <Film className="w-4 h-4 fill-black" />
                <span>{t('returnToMovies')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onGoToSubscription}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs border border-white/10 transition cursor-pointer"
              >
                {locale === 'en' ? 'View Membership Status' : 'Миний гишүүнчлэлийн мэдээлэл харах'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-950/60 border border-amber-800 text-amber-400 flex items-center justify-center mx-auto">
              <Clock className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white">{t('statusPending')}</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {locale === 'en'
                ? 'Your payment is still pending. If you just completed the transfer, please wait a moment or click retry.'
                : 'Банкны шилжүүлэг эсвэл QPay төлбөр хараахан бүртгэгдээгүй байна. Хэрэв та төлбөрөө хийсэн бол түр хүлээнэ үү.'}
            </p>
            <div className="pt-4 flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
              >
                {t('retry')}
              </button>
              <button
                onClick={onGoToHome}
                className="flex-1 py-2.5 rounded-lg bg-[#e5a93c] text-black text-xs font-bold hover:brightness-110 cursor-pointer"
              >
                {t('returnToMovies')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
