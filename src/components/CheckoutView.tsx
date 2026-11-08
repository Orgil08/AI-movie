import React, { useEffect, useState } from 'react';
import { ExternalLink, ShieldCheck, QrCode, ArrowLeft, Clock, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes (600s) default payment expiration

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
        throw new Error('Төлбөрийн захиалгын мэдээлэл олдсонгүй');
      }
      const data = await res.json();
      setOrder(data);
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
      if (!res.ok) throw new Error(data.error || 'Симуляци бүтэлгүйтлээ');
      setSimResult(data);
      // Refetch
      fetchOrder();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSimulating(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-neutral-400">
        <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-sm">Захиалгын мэдээлэл ачаалж байна...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-16 px-4 max-w-lg mx-auto text-center">
        <div className="w-14 h-14 rounded-full bg-red-950/60 border border-red-800 text-red-500 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Алдаа гарлаа</h2>
        <p className="text-sm text-neutral-400 mb-6">{error || 'Захиалга олдсонгүй'}</p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold transition"
        >
          Буцах
        </button>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Буцах</span>
      </button>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-neutral-950 p-6 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-600 text-white">
                Wire.mn Checkout
              </span>
              <span className="text-xs font-medium text-neutral-400">Захиалга: {order.orderNumber}</span>
            </div>
            <h1 className="text-xl font-black text-white mt-1">Төлбөр баталгаажуулах</h1>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Order Details Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-neutral-950/80 rounded-xl p-5 border border-neutral-800/80 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-400">Сонгосон багц:</span>
              <span className="font-bold text-white">{order.planName}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-400">Хугацаа:</span>
              <span className="text-neutral-200">1 Сар (30 хоног)</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-400">Төлбөрийн оператор:</span>
              <span className="font-semibold text-red-400 flex items-center gap-1">
                <QrCode className="w-4 h-4" />
                QPay (Wire.mn гарц)
              </span>
            </div>
            <div className="pt-3 border-t border-neutral-800 flex justify-between items-baseline">
              <span className="text-sm font-semibold text-neutral-300">Төлөх дүн:</span>
              <span className="text-2xl font-black text-white tracking-tight">
                {order.amount.toLocaleString()} {order.currency}
              </span>
            </div>
          </div>

          {/* Wire Checkout Redirect CTA */}
          <div className="space-y-3">
            {order.checkoutUrl && order.checkoutUrl.startsWith('https://') ? (
              <a
                href={order.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-xl shadow-red-900/40 transition active:scale-98"
              >
                <span>Wire.mn Төлбөрийн гарц руу шилжих (QPay)</span>
                <ExternalLink className="w-5 h-5" />
              </a>
            ) : (
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-center space-y-2">
                <p className="text-xs text-neutral-300">
                  Таны төлбөрийн захиалга системд бүртгэгдсэн. Хэрэв шууд Wire.mn гарцын хуудас нээгдэхгүй бол доорх туршилтын симуляци эсвэл дараах холбоосоор орно уу.
                </p>
                <div className="text-[11px] font-mono text-neutral-400 break-all p-2 bg-neutral-900 rounded border border-neutral-800">
                  {order.checkoutUrl}
                </div>
              </div>
            )}

            <p className="text-[11px] text-neutral-500 text-center">
              * Wire-ийн албан ёсны гарц дээр QPay QR код болон бүх банкны апп холбоос автоматаар үүснэ.
            </p>
          </div>

          {/* Test Simulation Panel */}
          <div className="mt-8 pt-6 border-t border-neutral-800">
            <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Туршилтын хэрэгсэл (HMAC Webhook Симуляци)
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">Dev / QA Tool</span>
              </div>
              <p className="text-[11px] text-neutral-400 mb-3 leading-relaxed">
                Wire.mn бодит орчинд төлбөр амжилттай болсны дараа илгээгддэг{' '}
                <code className="text-neutral-300">payment_intent.succeeded</code> вебхүүкийг албан ёсны{' '}
                <code className="text-neutral-300">WirePayment-Signature</code> HMAC шалгалттайгаар симуляци хийж шалгах.
              </p>

              <button
                onClick={handleSimulateWebhook}
                disabled={simulating}
                className="w-full py-2.5 px-4 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center justify-center gap-2 border border-neutral-700 transition cursor-pointer"
              >
                {simulating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Вебхүүк илгээж баталгаажуулж байна...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>QPay Амжилттай төлбөрийг симуляци хийх (Шалгах)</span>
                  </>
                )}
              </button>

              {simResult && (
                <div className="mt-3 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Вебхүүк амжилттай баталгаажлаа!</span>
                  </div>
                  <div className="text-[11px] text-neutral-300 font-mono">
                    Ивэнт ID: {simResult.eventId}
                  </div>
                  <div className="text-[11px] text-neutral-300">
                    Гишүүнчлэл 30 хоногоор амжилттай идэвхэжлээ.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
