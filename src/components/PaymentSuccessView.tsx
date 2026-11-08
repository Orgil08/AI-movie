import React, { useEffect, useState } from 'react';
import { CheckCircle2, Film, Sparkles, ArrowRight, ShieldCheck, Clock } from 'lucide-react';

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
          throw new Error('Төлбөрийн мэдээлэл олдсонгүй');
        }
        const data = await res.json();
        setOrder(data);

        // Only stop polling when status is confirmed PAID or EXPIRED/FAILED
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

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-lg mx-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8 text-center">
        {loading ? (
          <div className="py-8 space-y-4">
            <div className="w-14 h-14 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-white">Wire төлбөрийг баталгаажуулж байна...</h2>
            <p className="text-xs text-neutral-400">
              QPay-ээр хийсэн төлбөрийн вебхүүк болон банкны гүйлгээг серверээс шалгаж байна.
            </p>
          </div>
        ) : order && order.status === 'PAID' ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Success Icon */}
            <div className="w-20 h-20 rounded-full bg-emerald-950/60 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-900/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Төлбөр амжилттай баталгаажлаа
              </span>
              <h1 className="text-2xl font-black text-white mt-3">
                AI MOVIE Гишүүнчлэл идэвхжлээ!
              </h1>
              <p className="text-xs text-neutral-400 mt-2">
                Таны {order.planName} багц 30 хоногийн хугацаатайгаар амжилттай идэвхжлээ.
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="bg-neutral-950/80 rounded-xl p-4 border border-neutral-800/80 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-400">Захиалгын дугаар:</span>
                <span className="font-mono text-neutral-200">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Багц:</span>
                <span className="font-semibold text-white">{order.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Төлсөн дүн:</span>
                <span className="font-bold text-emerald-400">
                  {order.amount.toLocaleString()} {order.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Огноо:</span>
                <span className="text-neutral-300">
                  {order.paidAt ? new Date(order.paidAt).toLocaleString('mn-MN') : 'Саяхан'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={onGoToHome}
                className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 transition cursor-pointer"
              >
                <Film className="w-4 h-4" />
                <span>Кино сан руу очиж үзэх</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onGoToSubscription}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition cursor-pointer"
              >
                Миний гишүүнчлэлийн мэдээлэл харах
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-950/60 border border-amber-800 text-amber-400 flex items-center justify-center mx-auto">
              <Clock className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white">Төлбөр хүлээгдэж байна</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Банкны шилжүүлэг эсвэл QPay төлбөр хараахан бүртгэгдээгүй байна. Хэрэв та төлбөрөө хийсэн бол хэдхэн секунд хүлээнэ үү.
            </p>
            <div className="pt-4 flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold"
              >
                Дахин шалгах
              </button>
              <button
                onClick={onGoToHome}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
              >
                Нүүр хуудас
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
