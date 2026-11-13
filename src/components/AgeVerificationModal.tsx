import React, { useEffect } from 'react';
import { ShieldAlert, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useLocale } from '../i18n/I18nContext.js';

interface AgeVerificationModalProps {
  isOpen: boolean;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onDecline: () => void;
}

export const AgeVerificationModal: React.FC<AgeVerificationModalProps> = ({
  isOpen,
  isSubmitting = false,
  onConfirm,
  onDecline
}) => {
  const { locale } = useLocale();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDecline();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDecline]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#080A10]/90 backdrop-blur-xl animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
    >
      <div className="relative w-full max-w-[440px] rounded-2xl bg-[#0D111B] border border-[#252D3A] p-7 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.85)] text-center overflow-hidden">
        {/* Subtle top red accent glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-40 rounded-full bg-[#E50914]/15 blur-3xl" />

        {/* 18+ Badge Icon */}
        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E50914]/15 border border-[#E50914]/40 shadow-[0_0_30px_rgba(229,9,20,0.25)]">
          <span className="text-xl font-black tracking-tight text-[#FF4D58]">18+</span>
        </div>

        {/* Brand & Title */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E50914]/10 border border-[#E50914]/30 text-[#FF5A64] text-[11px] font-bold uppercase tracking-wider mb-3">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>{locale === 'en' ? 'AGE RESTRICTED CONTENT' : 'НАСНЫ ХЯЗГААРЛАЛТТАЙ'}</span>
        </div>

        <h2
          id="age-gate-title"
          className="text-2xl font-black text-white tracking-tight mb-3"
        >
          {locale === 'en' ? '18+ AGE VERIFICATION' : '18+ НАСНЫ АНГИЛАЛ'}
        </h2>

        <p className="text-sm text-[#94A3B8] leading-relaxed mb-7">
          {locale === 'en'
            ? 'This section contains content restricted to viewers who are 18 years of age or older. Do you confirm that you are at least 18 years old?'
            : 'Энэ хэсэгт зөвхөн 18 нас хүрсэн хэрэглэгч үзэх боломжтой контент байрлана. Та 18 нас хүрсэн гэдгээ баталгаажуулж байна уу?'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            data-testid="age-gate-confirm-btn"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#E50914] to-[#C80812] hover:from-[#F41823] hover:to-[#D80A14] text-white font-bold text-sm shadow-[0_8px_25px_rgba(229,9,20,0.35)] transition-all cursor-pointer disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isSubmitting
                ? locale === 'en'
                  ? 'Verifying...'
                  : 'Баталгаажуулж байна...'
                : locale === 'en'
                ? 'Yes, I am 18 or older'
                : 'Тийм, би 18 нас хүрсэн'}
            </span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onDecline}
            data-testid="age-gate-decline-btn"
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#111827] hover:bg-[#192234] text-[#94A3B8] hover:text-white font-semibold text-sm border border-[#252D3A] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{locale === 'en' ? 'Go Back' : 'Буцах'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
