import React, { useEffect, useState } from 'react';
import { History, CheckCircle2, Clock, XCircle, RefreshCw } from 'lucide-react';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';
import { formatCurrency, formatDate } from '../i18n/types.js';

interface PaymentHistoryViewProps {
  onRenewPlan: () => void;
}

export const PaymentHistoryView: React.FC<PaymentHistoryViewProps> = ({ onRenewPlan }) => {
  const t = useTranslations('Account');
  const tCommon = useTranslations('Common');
  const { locale } = useLocale();

  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/history');
      if (!res.ok) throw new Error('Failed to fetch payment history');
      const data = await res.json();
      setPayments(data.payments || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>{tCommon('success')}</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-[#e5a93c] border border-amber-500/30">
            <Clock className="w-3 h-3" />
            <span>{locale === 'en' ? 'PENDING' : 'Хүлээгдэж буй'}</span>
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-white/5 text-slate-400 border border-white/10">
            <Clock className="w-3 h-3" />
            <span>{t('statusExpired')}</span>
          </span>
        );
      case 'FAILED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3" />
            <span>{tCommon('error')}</span>
          </span>
        );
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <History className="w-7 h-7 text-[#e5a93c]" />
            <span>{t('paymentHistory')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {locale === 'en'
              ? 'Complete transaction ledger for Wire.mn QPay and direct bank settlement.'
              : 'Wire.mn болон QPay-ээр хийгдсэн бүх төлбөрийн бүртгэл.'}
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 self-start sm:self-auto transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#e5a93c]' : ''}`} />
          <span>{t('refresh')}</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-[#e5a93c] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs">{t('loadingTransactions')}</span>
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-2xl bg-[#111827] border border-white/10 p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-white/5 text-slate-400 flex items-center justify-center mx-auto">
            <History className="w-7 h-7 text-[#e5a93c]" />
          </div>
          <h2 className="text-lg font-bold text-white">{t('noPayments')}</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {t('noPaymentsDesc')}
          </p>
          <div className="pt-2">
            <button
              onClick={onRenewPlan}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e5a93c] to-amber-400 text-black font-extrabold text-xs shadow-lg hover:brightness-110 cursor-pointer"
            >
              {t('choosePlanQpay')}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#111827] border border-white/10 overflow-hidden shadow-2xl shadow-black/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0b0f19] text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">{t('orderNumberCol')}</th>
                  <th className="px-6 py-4">{t('planTierCol')}</th>
                  <th className="px-6 py-4">{t('methodCol')}</th>
                  <th className="px-6 py-4">{t('amountCol')}</th>
                  <th className="px-6 py-4">{t('statusCol')}</th>
                  <th className="px-6 py-4">{t('dateCol')}</th>
                  <th className="px-6 py-4">{t('refIdCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map((p, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4 font-mono font-bold text-white">{p.orderNumber}</td>
                    <td className="px-6 py-4 font-semibold text-slate-200">{p.planName}</td>
                    <td className="px-6 py-4">
                      {p.paymentMethod === 'bank_transfer' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#e5a93c]/20 text-[#e5a93c] border border-[#e5a93c]/30">
                          {t('bankKhanLabel')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          QPay (Wire.mn)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-[#e5a93c]">
                      {formatCurrency(p.amount, locale, false)}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(p.status)}</td>
                    <td className="px-6 py-4 text-slate-400">
                      {formatDate(p.createdAt, locale)}
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-500">
                      {p.bankTransferRef
                        ? p.bankTransferRef
                        : p.wirePaymentIntentId
                        ? p.wirePaymentIntentId.substring(0, 18) + '...'
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
