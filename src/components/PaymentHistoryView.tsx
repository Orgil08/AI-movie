import React, { useEffect, useState } from 'react';
import { History, CheckCircle2, Clock, XCircle, AlertCircle, ArrowUpRight, RefreshCw } from 'lucide-react';

interface PaymentHistoryViewProps {
  onRenewPlan: () => void;
}

export const PaymentHistoryView: React.FC<PaymentHistoryViewProps> = ({ onRenewPlan }) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/history');
      if (!res.ok) throw new Error('Төлбөрийн түүх авахад алдаа гарлаа');
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Төлөгдсөн</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            <span>Хүлээгдэж буй</span>
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700">
            <Clock className="w-3 h-3" />
            <span>Хугацаа дууссан</span>
          </span>
        );
      case 'FAILED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3" />
            <span>Амжилтгүй</span>
          </span>
        );
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <History className="w-7 h-7 text-red-500" />
            <span>Төлбөрийн түүх</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Wire.mn болон QPay-ээр хийгдсэн бүх төлбөрийн бүртгэл.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold flex items-center gap-2 self-start sm:self-auto transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Шинэчлэх</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-neutral-400">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs">Төлбөрийн түүх ачаалж байна...</span>
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
            <History className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white">Төлбөрийн бүртгэл байхгүй байна</h2>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Та хараахан захиалга хийгээгүй байна. Гишүүнчлэл авснаар таны төлбөрийн түүх энд харагдана.
          </p>
          <div className="pt-2">
            <button
              onClick={onRenewPlan}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
            >
              Багц сонгох (QPay)
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-950 text-neutral-400 font-bold uppercase tracking-wider text-[10px] border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4">Захиалгын дугаар</th>
                  <th className="px-6 py-4">Багц</th>
                  <th className="px-6 py-4">Төлбөрийн дүн</th>
                  <th className="px-6 py-4">Төлөв</th>
                  <th className="px-6 py-4">Огноо</th>
                  <th className="px-6 py-4">Wire Intent ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {payments.map((p, idx) => (
                  <tr key={idx} className="hover:bg-neutral-800/40 transition">
                    <td className="px-6 py-4 font-mono font-bold text-white">{p.orderNumber}</td>
                    <td className="px-6 py-4 font-semibold text-neutral-200">{p.planName}</td>
                    <td className="px-6 py-4 font-bold text-white">
                      {p.amount.toLocaleString()} {p.currency}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(p.status)}</td>
                    <td className="px-6 py-4 text-neutral-400">
                      {new Date(p.createdAt).toLocaleDateString('mn-MN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-neutral-500">
                      {p.wirePaymentIntentId ? p.wirePaymentIntentId.substring(0, 18) + '...' : '-'}
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
