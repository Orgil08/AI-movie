import React from 'react';
import { X, ExternalLink, ShieldCheck, Key, CheckCircle2, QrCode } from 'lucide-react';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';

interface WireDocsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WireDocsGuideModal: React.FC<WireDocsGuideModalProps> = ({ isOpen, onClose }) => {
  const { locale } = useLocale();
  const tDocs = useTranslations('WireDocs');
  const tCommon = useTranslations('Common');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
    >
      <div className="relative w-full max-w-3xl bg-neutral-900 rounded-2xl border border-neutral-800 shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-700 flex items-center justify-center text-white">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{tDocs('title')}</h2>
              <p className="text-xs text-neutral-400">
                {tDocs('subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-neutral-300 leading-relaxed">
          {/* Official Resources */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-red-500" />
              <span>Албан ёсны эх сурвалжууд</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="https://app.wire.mn"
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white">Wire Хянах самбар</div>
                  <div className="text-[11px] text-neutral-400">app.wire.mn</div>
                </div>
                <ExternalLink className="w-4 h-4 text-neutral-500" />
              </a>

              <a
                href="https://docs.wire.mn/docs"
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white">API Баримт бичиг</div>
                  <div className="text-[11px] text-neutral-400">docs.wire.mn/docs</div>
                </div>
                <ExternalLink className="w-4 h-4 text-neutral-500" />
              </a>
            </div>
          </div>

          {/* Architecture Step by Step */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-red-500" />
              <span>QPay + Wire.mn Төлбөрийн Архитектур (11 Алхам)</span>
            </h3>
            <ol className="space-y-2.5 list-decimal list-inside bg-neutral-950 p-4 rounded-xl border border-neutral-800">
              <li>Хэрэглэгч гишүүнчлэлийн багц сонгоно (<code className="text-red-400">/pricing</code>).</li>
              <li>Backend системд MongoDB <code className="text-neutral-200">Payment</code> захиалга үүснэ.</li>
              <li>Backend нь Wire API-д <code className="text-neutral-200">POST /v1/payment_intents</code> хүсэлт илгээнэ.</li>
              <li>Backend нь Wire Checkout Session <code className="text-neutral-200">POST /v1/checkout/sessions</code> үүсгэнэ.</li>
              <li>Хэрэглэгчийг Wire-ийн хостлогдсон төлбөрийн хуудас руу шилжүүлнэ.</li>
              <li>Хэрэглэгч төслөөр зөвшөөрөгдсөн QPay оператороор (банкны апп/QR) төлнө.</li>
              <li>Wire системээс <code className="text-red-400">payment_intent.succeeded</code> вебхүүк илгээнэ.</li>
              <li>Backend нь <code className="text-neutral-200">WirePayment-Signature</code> HMAC_SHA256 гарын үсэг, 5 минутын хугацааг шалгана.</li>
              <li>Backend нь Wire API-аас <code className="text-neutral-200">GET /v1/payment_intents/[ID]</code> дуудан тусгайлан баталгаажуулна.</li>
              <li>Хэрэглэгчийн гишүүнчлэлийг өгөгдлийн санд яг 1 удаа идэвхжүүлнэ.</li>
              <li>Хэрэглэгч бүх Премиум киног 4K HDR чанараар үзэх бүрэн эрхтэй болно.</li>
            </ol>
          </div>

          {/* Wire Dashboard Setup */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-500" />
              <span>Wire.mn Хянах Самбарын Тохиргоо</span>
            </h3>
            <div className="space-y-2 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Connectors:</strong> Wire төслийн Connectors цэс рүү орж QPay операторыг идэвхжүүлнэ. Wire нь зөвхөн төсөлд зөвшөөрөгдсөн операторыг дуудах тул зохиомол оператор ID заахгүй байх нь чухал.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong>API Keys:</strong> <code className="text-red-400">WIRE_API_KEY</code> нууц түлхүүрийг авч <code className="text-neutral-300">.env</code> файлд тохируулна. Client-side JS код руу хэзээ ч гаргаж болохгүй.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Webhooks:</strong> Вебхүүк URL-аа <code className="text-white bg-neutral-900 px-1 py-0.5 rounded">https://таны-домэйн/api/webhooks/wire</code> гэж тохируулж, <code className="text-white">payment_intent.succeeded</code> ивэнтийг сонгоно. Нууц түлхүүрийг <code className="text-red-400">WIRE_WEBHOOK_SECRET</code> болгон хадгална.
                </div>
              </div>
            </div>
          </div>

          {/* Direct Bank Transfer Option */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Дансаар шилжүүлэх нэмэлт төлбөрийн систем</span>
            </h3>
            <div className="space-y-2 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
              <p className="text-neutral-300">
                Хэрэглэгчдэд зориулсан шууд банкны шилжүүлгийн данс:
              </p>
              <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-700/80 space-y-1 font-mono text-xs">
                <div>Банк: <strong className="text-white font-sans">Хаан Банк (Khan Bank)</strong></div>
                <div>Данс: <strong className="text-amber-400 text-sm">5132104221</strong></div>
                <div>Эзэмшигч: <strong className="text-white font-sans">Сүхбат Мөнх-Оргил (sukhbat munkh-orgil)</strong></div>
                <div>Гүйлгээний утга: <span className="text-red-400 font-sans">Захиалгын дугаар (Жишээ: AIMOV-...)</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs transition"
          >
            {tDocs('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
