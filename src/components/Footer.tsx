import React from 'react';
import { Film, Shield, Mail, Phone, MapPin, Globe } from 'lucide-react';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';

interface FooterProps {
  onNavClick: (tab: string) => void;
  onOpenDocs: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavClick, onOpenDocs }) => {
  const t = useTranslations('Footer');
  const tNav = useTranslations('Navigation');
  const { locale } = useLocale();

  return (
    <footer className="w-full bg-[#070a12] border-t border-white/10 text-slate-400 text-xs py-14 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 select-none">
      <div className="w-full max-w-[1920px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* Brand & Description */}
        <div className="md:col-span-5 space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-white tracking-tight">SODON</span>
              <span className="text-xs font-medium text-[#e5a93c] tracking-widest uppercase">AI MOVIE</span>
            </div>

          <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
            {t('description')}
          </p>

          <div className="flex items-center gap-2 pt-1 text-slate-300">
            <Shield className="w-4 h-4 text-[#e5a93c]" />
            <span className="font-semibold">{t('security')}</span>
          </div>
        </div>

        {/* Quick Links (Admin removed per user request) */}
        <div className="md:col-span-2 space-y-3">
          <h4 className="text-xs font-black text-white uppercase tracking-wider">
            {t('quickLinks')}
          </h4>
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => onNavClick('home')}
                className="hover:text-white transition cursor-pointer"
              >
                {tNav('home')}
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavClick('movies')}
                className="hover:text-white transition cursor-pointer"
              >
                {tNav('movies')}
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavClick('pricing')}
                className="hover:text-white transition cursor-pointer"
              >
                {tNav('pricing')}
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavClick('subscription')}
                className="hover:text-white transition cursor-pointer"
              >
                {tNav('activePlan')}
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavClick('payments')}
                className="hover:text-white transition cursor-pointer"
              >
                {locale === 'en' ? 'History' : 'Төлбөрийн түүх'}
              </button>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div className="md:col-span-2 space-y-3">
          <h4 className="text-xs font-black text-white uppercase tracking-wider">
            {t('legal')}
          </h4>
          <ul className="space-y-2">
            <li>
              <span className="hover:text-white transition cursor-pointer">{t('terms')}</span>
            </li>
            <li>
              <span className="hover:text-white transition cursor-pointer">{t('privacy')}</span>
            </li>
            <li>
              <button
                onClick={onOpenDocs}
                className="text-[#e5a93c] hover:underline transition cursor-pointer"
              >
                Wire.mn API Guide
              </button>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div className="md:col-span-3 space-y-3">
          <h4 className="text-xs font-black text-white uppercase tracking-wider">
            {t('contact')}
          </h4>
          <ul className="space-y-2.5">
            <li className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#e5a93c]" />
              <span>{t('contactEmail')}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#e5a93c]" />
              <span>{t('contactPhone')}</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#e5a93c] shrink-0 mt-0.5" />
              <span>{t('location')}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="w-full max-w-[1920px] mx-auto mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
        <div>
          © {new Date().getFullYear()} SODON AI MOVIE. {t('copyright')}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[#e5a93c]">Wire.mn QPay Partner</span>
          <span>·</span>
          <span>Khan Bank Direct</span>
          <span>·</span>
          <span>4K Ultra HD</span>
        </div>
      </div>
    </footer>
  );
};
