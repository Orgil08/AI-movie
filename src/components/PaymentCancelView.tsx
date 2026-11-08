import React from 'react';
import { XCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';

interface PaymentCancelViewProps {
  orderNumber?: string;
  onRetry: () => void;
  onGoHome: () => void;
}

export const PaymentCancelView: React.FC<PaymentCancelViewProps> = ({
  orderNumber,
  onRetry,
  onGoHome
}) => {
  const t = useTranslations('Payment');
  const { locale } = useLocale();

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-lg mx-auto text-center select-none">
      <div className="bg-[#111827] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/80 p-6 sm:p-8">
        <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-800/60 text-red-400 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-9 h-9" />
        </div>

        <span className="px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
          {t('cancelTitle')}
        </span>

        <h1 className="text-2xl font-black text-white mt-3">
          {locale === 'en' ? 'Checkout Session Closed' : 'Төлбөрийн үйлдэл дуусгавар боллоо'}
        </h1>

        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          {t('cancelSubtitle')}
        </p>

        {orderNumber && (
          <div className="mt-4 p-3 bg-[#0b0f19] rounded-lg border border-white/10 text-xs text-slate-400 font-mono">
            {locale === 'en' ? 'Order' : 'Захиалга'}: {orderNumber}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={onRetry}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#e5a93c] via-amber-400 to-[#e5a93c] text-black font-extrabold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition shadow-lg shadow-amber-950/40 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t('retry')}</span>
          </button>

          <button
            onClick={onGoHome}
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 border border-white/10 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('returnToMovies')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
