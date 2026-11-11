import React, { useEffect, useState } from 'react';
import {
  ExternalLink,
  ShieldCheck,
  QrCode,
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle,
  Building2,
  Copy,
  CheckCircle2,
  Send,
  HelpCircle,
  Zap
} from 'lucide-react';
import { BANK_TRANSFER_DETAILS } from '../config/bank-details.js';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';
import { formatCurrency } from '../i18n/types.js';

interface CheckoutViewProps {
  orderNumber: string;
  onBack: () => void;
  onPaymentConfirmed: (orderNumber: string) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  orderNumber,
  onBack,
  onPaymentConfirmed
}) => {
  const t = useTranslations('Checkout');
  const { locale } = useLocale();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeMethod, setActiveMethod] = useState<'wire_qpay' | 'bank_transfer'>('wire_qpay');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes default payment expiration

  // Bank transfer submission state
  const [senderName, setSenderName] = useState('');
  const [phone, setPhone] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [transferSuccessMsg, setTransferSuccessMsg] = useState<string | null>(null);

  // Copy states
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);

  useEffect(() => {
    let timer: any;
    if (timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    }
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 4000); // Poll backend internal status
    return () => clearInterval(interval);
  }, [orderNumber]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/payments/${orderNumber}`);
      if (!res.ok) {
        throw new Error(locale === 'en' ? 'Payment order not found' : 'Төлбөрийн захиалгын мэдээлэл олдсонгүй');
      }
      const data = await res.json();
      setOrder(data);
      if (data.paymentMethod) {
        setActiveMethod(data.paymentMethod);
      }
      setLoading(false);

      if (data.status === 'PAID') {
        onPaymentConfirmed(orderNumber);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSimulateWebhook = async () => {
    setSimulating(true);
    setSimResult(null);
    try {
      const res = await fetch('/api/test/simulate-wire-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Simulation failed');
      setSimResult(data);
      fetchOrder();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSimulating(false);
    }
  };

  const handleConfirmBankTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTransfer(true);
    setError(null);

    try {
      const res = await fetch('/api/payments/bank-transfer/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber,
          senderName: senderName.trim(),
          phone: phone.trim(),
          transferRef: transferRef.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error confirming bank transfer');
      }

      setTransferSuccessMsg(
        locale === 'en'
          ? (data.messageEn || data.message || 'Transfer details submitted! Waiting for Admin verification.')
          : (data.message || 'Шилжүүлгийн мэдээлэл илгээгдлээ. Админ шалгаж баталгаажуулсны дараа гишүүнчлэл идэвхжинэ.')
      );
      fetchOrder();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingTransfer(false);
    }
  };

  const copyToClipboard = (text: string, type: 'account' | 'amount' | 'memo') => {
    navigator.clipboard.writeText(text);
    if (type === 'account') {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } else if (type === 'amount') {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    } else if (type === 'memo') {
      setCopiedMemo(true);
      setTimeout(() => setCopiedMemo(false), 2000);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-2 border-[#e5a93c] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-sm">{locale === 'en' ? 'Loading order details...' : 'Захиалгын мэдээлэл ачаалж байна...'}</span>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="py-16 px-4 max-w-lg mx-auto text-center">
        <div className="w-14 h-14 rounded-full bg-red-950/60 border border-red-800 text-red-400 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{locale === 'en' ? 'Error' : 'Алдаа гарлаа'}</h2>
        <p className="text-sm text-slate-400 mb-6">{error || (locale === 'en' ? 'Order not found' : 'Захиалга олдсонгүй')}</p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition"
        >
          {locale === 'en' ? 'Back' : 'Буцах'}
        </button>
      </div>
    );
  }

  const localizedPlanName = order?.plan
    ? locale === 'en'
      ? order.plan.name || order.planName
      : order.plan.nameMn || order.planName
    : order?.planName;

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto select-none">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{locale === 'en' ? 'Back to pricing' : 'Буцах'}</span>
      </button>

      <div className="bg-[#111827] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/80">
        {/* Header */}
        <div className="bg-[#0b0f19] p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#e5a93c] text-black">
                {locale === 'en' ? 'PAYMENT' : 'ТӨЛБӨР'}
              </span>
              <span className="text-xs font-medium text-slate-400">
                {t('orderNumber')}: {order.orderNumber}
              </span>
            </div>
            <h1 className="text-xl font-black text-white mt-1">{t('title')}</h1>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#e5a93c] font-mono bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Payment Method Tabs */}
        <div className="p-6 border-b border-white/10 bg-[#070a12]/60">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {locale === 'en' ? 'Payment Method:' : 'Төлбөрийн хэлбэрээ сонгоно уу:'}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveMethod('wire_qpay')}
              className={`p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer border ${
                activeMethod === 'wire_qpay'
                  ? 'bg-[#e5a93c] text-black border-[#e5a93c] shadow-lg shadow-amber-950/40'
                  : 'bg-[#0f172a] text-slate-400 border-white/10 hover:text-white hover:bg-white/5'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>QPay (Wire.mn)</span>
            </button>

            <button
              onClick={() => setActiveMethod('bank_transfer')}
              className={`p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer border ${
                activeMethod === 'bank_transfer'
                  ? 'bg-[#e5a93c] text-black border-[#e5a93c] shadow-lg shadow-amber-950/40'
                  : 'bg-[#0f172a] text-slate-400 border-white/10 hover:text-white hover:bg-white/5'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>{locale === 'en' ? 'Bank Transfer' : 'Банкаар шилжүүлэх'}</span>
            </button>
          </div>
        </div>

        {/* Order Details Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Order Summary Strip */}
          <div className="bg-[#0b0f19] rounded-xl p-5 border border-white/10 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">{t('planName')}:</span>
              <span className="font-bold text-white">{localizedPlanName}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">{locale === 'en' ? 'Duration:' : 'Хугацаа:'}</span>
              <span className="text-slate-200">{locale === 'en' ? '1 Month (30 Days)' : '1 Сар (30 хоног)'}</span>
            </div>
            <div className="pt-3 border-t border-white/10 flex justify-between items-baseline">
              <span className="text-sm font-semibold text-slate-300">{t('amountDue')}:</span>
              <span className="text-2xl font-black text-[#e5a93c] tracking-tight">
                {formatCurrency(order.amount, locale, false)}
              </span>
            </div>
          </div>

          {/* METHOD 1: QPay (Wire.mn) View */}
          {activeMethod === 'wire_qpay' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-[#0b0f19] border border-white/10 space-y-2 text-xs text-slate-300">
                <div className="font-semibold text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-[#e5a93c]" />
                  <span>{t('wireCheckoutTitle')}</span>
                </div>
                <p className="text-slate-400 leading-relaxed">{t('wireCheckoutDesc')}</p>
              </div>

              {order.checkoutUrl && order.checkoutUrl.startsWith('https://') ? (
                <a
                  href={order.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#e5a93c] to-amber-400 hover:brightness-110 text-black font-extrabold text-base flex items-center justify-center gap-2 shadow-xl shadow-amber-950/40 transition active:scale-98"
                >
                  <span>{t('proceedToWire')}</span>
                  <ExternalLink className="w-5 h-5" />
                </a>
              ) : (
                <div className="p-4 rounded-xl bg-[#0b0f19] border border-white/10 text-center space-y-2">
                  <p className="text-xs text-slate-300">
                    {locale === 'en' ? 'Wire payment order created in system.' : 'Таны Wire төлбөрийн захиалга системд бүртгэгдсэн.'}
                  </p>
                  <div className="text-[11px] font-mono text-slate-400 break-all p-2 bg-[#070a12] rounded border border-white/5">
                    {order.checkoutUrl}
                  </div>
                </div>
              )}

              {/* Webhook Simulation QA Tool */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="bg-[#0b0f19] rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#e5a93c]" />
                      {locale === 'en' ? 'Wire Webhook Sandbox Simulator' : 'QPay Webhook шалгах (Dev / QA Tool)'}
                    </span>
                  </div>
                  <button
                    onClick={handleSimulateWebhook}
                    disabled={simulating}
                    className="w-full py-2.5 px-4 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 border border-white/10 transition cursor-pointer"
                  >
                    {simulating ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{locale === 'en' ? 'Broadcasting webhook...' : 'Вебхүүк илгээж байна...'}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{locale === 'en' ? 'Simulate Wire payment_intent.succeeded' : 'QPay Амжилттай төлбөрийг симуляци хийх (Шалгах)'}</span>
                      </>
                    )}
                  </button>
                  {simResult && (
                    <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{locale === 'en' ? 'Webhook verified and subscription activated.' : 'Амжилттай баталгаажлаа.'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* METHOD 2: Direct Bank Transfer View */}
          {activeMethod === 'bank_transfer' && (
            <div className="space-y-5 animate-in fade-in">
              {/* Bank Account Details Card */}
              <div className="rounded-xl bg-gradient-to-br from-[#0b0f19] to-[#111827] border-2 border-[#e5a93c]/40 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#e5a93c]/20 text-[#e5a93c] flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {locale === 'en' ? BANK_TRANSFER_DETAILS.bankNameEn : BANK_TRANSFER_DETAILS.bankName}
                      </div>
                      <div className="text-[10px] text-slate-400">{BANK_TRANSFER_DETAILS.branch}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#e5a93c]/20 text-[#e5a93c] border border-[#e5a93c]/30">
                    {locale === 'en' ? 'Bank Transfer' : 'Дансны шилжүүлэг'}
                  </span>
                </div>

                {/* Account Number with Quick Copy */}
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400">{t('accountNumber')}:</div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#070a12] border border-white/10">
                    <span className="text-xl font-mono font-black text-[#e5a93c] tracking-wider">
                      {BANK_TRANSFER_DETAILS.accountNumber}
                    </span>
                    <button
                      onClick={() => copyToClipboard(BANK_TRANSFER_DETAILS.accountNumber, 'account')}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedAccount ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{t('copied')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{t('copy')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Account Holder Name */}
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400">{t('accountHolder')}:</div>
                  <div className="p-3 rounded-xl bg-[#070a12] border border-white/10 font-bold text-white text-sm">
                    {locale === 'en' ? BANK_TRANSFER_DETAILS.accountHolderEn : BANK_TRANSFER_DETAILS.accountHolder}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      ({locale === 'en' ? BANK_TRANSFER_DETAILS.accountHolder : BANK_TRANSFER_DETAILS.accountHolderEn})
                    </span>
                  </div>
                </div>

                {/* Amount with Quick Copy */}
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400">{t('amountDue')}:</div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#070a12] border border-white/10">
                    <span className="text-lg font-black text-white">
                      {formatCurrency(order.amount, locale, false)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(String(order.amount), 'amount')}
                      className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 text-xs flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedAmount ? t('copied') : t('copy')}
                    </button>
                  </div>
                </div>

                {/* Transaction Memo with Quick Copy */}
                <div className="space-y-1">
                  <div className="text-[11px] text-amber-300 font-semibold flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{t('transferRef')}:</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#070a12] border border-[#e5a93c]/50">
                    <span className="text-sm font-mono font-bold text-white">{order.orderNumber}</span>
                    <button
                      onClick={() => copyToClipboard(order.orderNumber, 'memo')}
                      className="px-3 py-1.5 rounded-lg bg-[#e5a93c]/20 hover:bg-[#e5a93c]/30 text-[#e5a93c] text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedMemo ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{t('copied')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{t('copy')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Pending Admin Review or Rejected Status Banner */}
              {order.status === 'PENDING_REVIEW' && (
                <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs space-y-1.5">
                  <div className="font-bold flex items-center gap-2 text-[#e5a93c]">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>
                      {locale === 'en'
                        ? 'Pending Admin Verification (PENDING_REVIEW)'
                        : 'Админ шалгаж байна (PENDING_REVIEW)'}
                    </span>
                  </div>
                  <p className="text-amber-300/90 leading-relaxed">
                    {locale === 'en'
                      ? 'Your bank transfer details have been submitted. Your subscription will activate automatically as soon as an administrator verifies the Khan Bank settlement.'
                      : 'Таны шилжүүлгийн мэдээлэл бүртгэгдсэн байна. Админ дансны гүйлгээг шалгаж баталгаажуурмагц таны гишүүнчлэл автоматаар идэвхжинэ.'}
                  </p>
                </div>
              )}

              {order.status === 'REJECTED' && (
                <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      {locale === 'en' ? 'Bank Transfer Rejected' : 'Шилжүүлэг татгалзагдсан'}
                    </span>
                  </div>
                  <p className="text-red-300/90">
                    {order.rejectionReason ||
                      (locale === 'en'
                        ? 'Your bank transfer could not be verified. Please check your reference and resubmit.'
                        : 'Таны шилжүүлгийн мэдээлэл баталгаажсангүй. Гүйлгээний утга болон мэдээллээ шалгаад дахин илгээнэ үү.')}
                  </p>
                </div>
              )}

              {/* Confirmation Form */}
              <form onSubmit={handleConfirmBankTransfer} className="p-5 rounded-xl bg-[#0b0f19] border border-white/10 space-y-4">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-[#e5a93c]" />
                  <span>{t('bankConfirmTitle')}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {locale === 'en'
                    ? 'After transferring the plan amount to the Khan Bank account above, submit your sender name, phone number, and transaction reference for admin verification.'
                    : 'Та дээрх Хаан банкны данс руу шилжүүлгээ хийсний дараа өөрийн нэр, утасны дугаар болон гүйлгээний дугаараа оруулан шалгуулахаар илгээнэ үү. Админ баталгаажуулсны дараа гишүүнчлэл идэвхжинэ.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">{t('senderName')}:</label>
                    <input
                      type="text"
                      required
                      placeholder={locale === 'en' ? 'e.g. Batbayar' : 'Жишээ: Батбаяр'}
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#070a12] border border-white/15 text-white placeholder-slate-600 focus:outline-none focus:border-[#e5a93c]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">{t('senderPhone')}:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 99112233"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#070a12] border border-white/15 text-white placeholder-slate-600 focus:outline-none focus:border-[#e5a93c]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 text-xs">
                    {locale === 'en' ? 'Transaction reference:' : 'Гүйлгээний дугаар эсвэл баримт:'}
                  </label>
                  <input
                    type="text"
                    placeholder={locale === 'en' ? 'Bank transaction ref / receipt number' : 'Банкны шилжүүлгийн лавлагаа / дугаар'}
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070a12] border border-white/15 text-white placeholder-slate-600 focus:outline-none focus:border-[#e5a93c] text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingTransfer}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#e5a93c] via-amber-400 to-[#e5a93c] hover:brightness-110 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-950/40 transition active:scale-98 cursor-pointer"
                >
                  {submittingTransfer ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>{t('confirming')}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {order.status === 'PENDING_REVIEW'
                          ? locale === 'en'
                            ? 'Update Submitted Transfer Details'
                            : 'Шилжүүлгийн мэдээлэл шинэчлэх'
                          : t('confirmTransfer')}
                      </span>
                    </>
                  )}
                </button>

                {transferSuccessMsg && (
                  <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-700/60 text-amber-200 text-xs flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#e5a93c] shrink-0" />
                    <span>{transferSuccessMsg}</span>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
