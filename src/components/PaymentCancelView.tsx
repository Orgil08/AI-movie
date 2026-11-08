import React from 'react';
import { XCircle, RefreshCw, ArrowLeft, ShieldAlert } from 'lucide-react';

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
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-lg mx-auto text-center">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8">
        <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-800/60 text-red-500 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-9 h-9" />
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/30">
          Төлбөр цуцлагдсан
        </span>

        <h1 className="text-2xl font-black text-white mt-3">Төлбөрийн үйлдэл дуусгавар боллоо</h1>

        <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
          Та төлбөрийн гарцыг хаасан эсвэл гүйлгээний хугацаа (10 минут) дууссан байна.
          Таны данснаас ямар нэг шимтгэл суутгагдаагүй.
        </p>

        {orderNumber && (
          <div className="mt-4 p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-xs text-neutral-400 font-mono">
            Захиалга: {orderNumber}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={onRetry}
            className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Дахин оролдох / Багц сонгох</span>
          </button>

          <button
            onClick={onGoHome}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Нүүр хуудас руу буцах</span>
          </button>
        </div>
      </div>
    </div>
  );
};
