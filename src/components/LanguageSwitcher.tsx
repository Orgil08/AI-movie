import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLocale } from '../i18n/I18nContext.js';
import { Locale, LOCALE_CONFIGS, LOCALES } from '../i18n/types.js';

interface LanguageSwitcherProps {
  isMobile?: boolean;
  onSelect?: () => void;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ isMobile = false, onSelect }) => {
  const { locale, setLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (code: Locale) => {
    setLocale(code);
    setIsOpen(false);
    if (onSelect) onSelect();
  };

  if (isMobile) {
    return (
      <div className="w-full pt-3 pb-2 border-t border-white/10">
        <div className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-2.5 flex items-center gap-2 px-1">
          <Globe className="w-3.5 h-3.5 text-[#e5a93c]" />
          <span>{locale === 'mn' ? 'Хэл сонгох' : 'Select Language'}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {LOCALES.map((code) => {
            const conf = LOCALE_CONFIGS[code];
            const isActive = locale === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => handleSelect(code)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#e5a93c]/15 text-[#e5a93c] border border-[#e5a93c]/40 font-semibold'
                    : 'bg-[#1e293b]/50 text-slate-300 border border-white/5 hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">{conf.flag}</span>
                  <span>{conf.nativeName}</span>
                </span>
                {isActive && <Check className="w-4 h-4 text-[#e5a93c]" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const currentConf = LOCALE_CONFIGS[locale];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-all text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#e5a93c]/50"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Select language"
      >
        <Globe className="w-3.5 h-3.5 text-[#e5a93c]" />
        <span className="font-semibold tracking-wider">{currentConf.label}</span>
        <span className="text-sm">{currentConf.flag}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl bg-[#0f172a] border border-white/15 shadow-2xl shadow-black/80 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-medium border-b border-white/10">
            {locale === 'mn' ? 'Хэл солих' : 'Switch Language'}
          </div>
          {LOCALES.map((code) => {
            const conf = LOCALE_CONFIGS[code];
            const isActive = locale === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => handleSelect(code)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer text-left ${
                  isActive
                    ? 'bg-[#e5a93c]/15 text-[#e5a93c] font-semibold'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">{conf.flag}</span>
                  <span>{conf.nativeName}</span>
                </span>
                {isActive && <Check className="w-3.5 h-3.5 text-[#e5a93c]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
