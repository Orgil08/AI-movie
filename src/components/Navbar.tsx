import React, { useState } from 'react';
import { Shield, User, History, ChevronDown, Search, Menu, X, LogIn, LogOut } from 'lucide-react';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';
import { LanguageSwitcher } from './LanguageSwitcher.js';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: { id: string; name: string; email: string } | null;
  subscription: any;
  onSwitchUser: (userId: string) => void;
  onOpenDocs: () => void;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  onSignOut: () => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  subscription,
  onSwitchUser,
  onOpenDocs,
  onOpenAuth,
  onSignOut,
  searchQuery = '',
  setSearchQuery
}) => {
  const t = useTranslations('Navigation');
  const { locale } = useLocale();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const demoUsers = [
    {
      id: 'user_batbayar',
      name: 'Батбаяр',
      roleMn: 'Шинэ зочин (Эрхгүй)',
      roleEn: 'Guest (Unsubscribed)'
    },
    {
      id: 'user_enkhjin',
      name: 'Энхжин',
      roleMn: 'Стандарт гишүүн',
      roleEn: 'Standard Member'
    },
    {
      id: 'user_temuulen',
      name: 'Тэмүүлэн',
      roleMn: 'Премиум 4K гишүүн',
      roleEn: 'Premium 4K VIP'
    }
  ];

  const handleNavClick = (tab: string) => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);
  };

  const planName = subscription?.plan
    ? locale === 'en'
      ? subscription.plan.nameEn || subscription.plan.name
      : subscription.plan.nameMn || 'Идэвхтэй'
    : null;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b0f19]/90 backdrop-blur-md border-b border-white/10 transition-colors">
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 h-16 flex items-center justify-between gap-3 sm:gap-6">
        {/* Left: Brand & Desktop Nav Links */}
        <div className="flex items-center gap-3 lg:gap-6 shrink-0">
          {/* SODON AI MOVIE Typography Wordmark */}
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-baseline gap-2 group cursor-pointer focus:outline-none shrink-0"
            aria-label="SODON AI MOVIE Home"
          >
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white group-hover:text-white/95">
              SODON
            </span>
            <span className="text-xs font-medium tracking-widest text-[#e5a93c] uppercase">
              AI MOVIE
            </span>
          </button>

          {/* Nav links (Admin removed per user request, strictly single-line whitespace-nowrap) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 text-xs lg:text-sm font-medium whitespace-nowrap shrink-0">
            <button
              onClick={() => handleNavClick('home')}
              className={`px-2.5 lg:px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                currentTab === 'home'
                  ? 'text-white font-semibold bg-white/5'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t('home')}
            </button>
            <button
              onClick={() => handleNavClick('movies')}
              className={`px-2.5 lg:px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                currentTab === 'movies'
                  ? 'text-white font-semibold bg-white/5'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="whitespace-nowrap">{t('movies')}</span>
            </button>
            <button
              onClick={() => handleNavClick('pricing')}
              className={`px-2.5 lg:px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                currentTab === 'pricing'
                  ? 'text-[#e5a93c] font-semibold bg-[#e5a93c]/10 border border-[#e5a93c]/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="whitespace-nowrap">{t('pricing')}</span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[#e5a93c]/20 text-[#e5a93c] uppercase whitespace-nowrap shrink-0">
                QPay
              </span>
            </button>
            <button
              onClick={() => handleNavClick('subscription')}
              className={`px-2.5 lg:px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                currentTab === 'subscription'
                  ? 'text-white font-semibold bg-white/5'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="whitespace-nowrap">{t('activePlan')}</span>
            </button>
            <button
              onClick={() => handleNavClick('payments')}
              className={`px-2.5 lg:px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                currentTab === 'payments'
                  ? 'text-white font-semibold bg-white/5'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="whitespace-nowrap">{locale === 'en' ? 'History' : 'Түүх'}</span>
            </button>
          </nav>
        </div>

        {/* Right side: Search, Language, Membership Pill, Auth/Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Search Trigger */}
          {setSearchQuery && (
            <div className="relative">
              {searchOpen ? (
                <div className="flex items-center bg-[#111827] border border-white/15 rounded-lg px-2.5 py-1 text-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="bg-transparent text-white placeholder-slate-500 focus:outline-none w-36 sm:w-48 text-xs"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="text-slate-400 hover:text-white ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Search movies"
                >
                  <Search className="w-4 h-4 text-slate-300" />
                </button>
              )}
            </div>
          )}

          {/* Professional Language Switcher */}
          <LanguageSwitcher />

          {/* Membership Badge (when logged in) */}
          {currentUser && (
            <button
              onClick={() => handleNavClick('subscription')}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                subscription
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900/40'
                  : 'bg-amber-950/40 text-[#e5a93c] border-[#e5a93c]/40 hover:bg-amber-900/40'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  subscription ? 'bg-emerald-400' : 'bg-[#e5a93c]'
                }`}
              ></span>
              <span>{planName || t('noPlan')}</span>
            </button>
          )}

          {/* User Profile or Sign In / Sign Up buttons */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 p-1 sm:p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
                aria-expanded={userMenuOpen}
                aria-label="User profile"
              >
                <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-[#e5a93c] to-amber-600 flex items-center justify-center text-xs font-bold text-black uppercase">
                  {currentUser.name.charAt(0)}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0f172a] border border-white/15 shadow-2xl shadow-black/90 p-2 z-50 animate-in fade-in zoom-in-95 backdrop-blur-md">
                  <div className="px-3 py-2 border-b border-white/10">
                    <div className="text-xs font-semibold text-white">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
                    <div className="mt-1 text-[10px] text-[#e5a93c] font-medium flex items-center gap-1">
                      <span>{planName ? `VIP: ${planName}` : t('noPlan')}</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                      {t('switchUser')}
                    </div>
                    {demoUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          onSwitchUser(u.id);
                          setUserMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition flex flex-col cursor-pointer ${
                          currentUser.id === u.id
                            ? 'bg-[#e5a93c]/15 text-[#e5a93c] font-semibold'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span>{u.name}</span>
                        <span className="text-[10px] text-slate-500">
                          {locale === 'en' ? u.roleEn : u.roleMn}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-1 mt-1 border-t border-white/10 space-y-0.5">
                    <button
                      onClick={() => {
                        handleNavClick('subscription');
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-md text-xs text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>{t('profile')}</span>
                    </button>
                    <button
                      onClick={() => {
                        handleNavClick('payments');
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-md text-xs text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2 cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>{locale === 'en' ? 'Payment History' : 'Төлбөрийн түүх'}</span>
                    </button>
                    <button
                      onClick={() => {
                        onOpenDocs();
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-md text-xs text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2 cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-[#e5a93c]" />
                      <span>{t('docsGuide')}</span>
                    </button>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-md text-xs text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 flex items-center gap-2 cursor-pointer mt-1 border-t border-white/5 pt-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{locale === 'en' ? 'Sign Out' : 'Гарах'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('signin')}
                className="px-3 py-1.5 rounded-lg bg-[#e5a93c] hover:bg-amber-400 text-black text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-950/30"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{locale === 'en' ? 'Sign In' : 'Нэвтрэх'}</span>
              </button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="hidden sm:flex px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition cursor-pointer"
              >
                <span>{locale === 'en' ? 'Sign Up' : 'Бүртгүүлэх'}</span>
              </button>
            </div>
          )}

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-3 pb-6 bg-[#0b0f19] border-b border-white/15 space-y-3 animate-in slide-in-from-top-4 duration-200">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <button
              onClick={() => handleNavClick('home')}
              className={`p-2.5 rounded-lg text-left font-medium ${
                currentTab === 'home' ? 'bg-[#e5a93c]/15 text-[#e5a93c]' : 'text-slate-300 bg-white/5'
              }`}
            >
              {t('home')}
            </button>
            <button
              onClick={() => handleNavClick('movies')}
              className={`p-2.5 rounded-lg text-left font-medium ${
                currentTab === 'movies' ? 'bg-[#e5a93c]/15 text-[#e5a93c]' : 'text-slate-300 bg-white/5'
              }`}
            >
              {t('movies')}
            </button>
            <button
              onClick={() => handleNavClick('pricing')}
              className={`p-2.5 rounded-lg text-left font-medium ${
                currentTab === 'pricing' ? 'bg-[#e5a93c]/15 text-[#e5a93c]' : 'text-slate-300 bg-white/5'
              }`}
            >
              {t('pricing')} (QPay)
            </button>
            <button
              onClick={() => handleNavClick('subscription')}
              className={`p-2.5 rounded-lg text-left font-medium ${
                currentTab === 'subscription' ? 'bg-[#e5a93c]/15 text-[#e5a93c]' : 'text-slate-300 bg-white/5'
              }`}
            >
              {t('activePlan')}
            </button>
            <button
              onClick={() => handleNavClick('payments')}
              className={`p-2.5 rounded-lg text-left font-medium ${
                currentTab === 'payments' ? 'bg-[#e5a93c]/15 text-[#e5a93c]' : 'text-slate-300 bg-white/5'
              }`}
            >
              {locale === 'en' ? 'History' : 'Төлбөрийн түүх'}
            </button>
          </div>

          {/* Mobile Auth actions */}
          <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
            {currentUser ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5">
                <div>
                  <div className="text-xs font-bold text-white">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-400">{currentUser.email}</div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-950/40 rounded transition flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{locale === 'en' ? 'Sign Out' : 'Гарах'}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signin');
                  }}
                  className="py-2 px-3 rounded-lg bg-[#e5a93c] text-black text-xs font-bold text-center"
                >
                  {locale === 'en' ? 'Sign In' : 'Нэвтрэх'}
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signup');
                  }}
                  className="py-2 px-3 rounded-lg bg-white/10 text-white text-xs font-bold text-center"
                >
                  {locale === 'en' ? 'Sign Up' : 'Бүртгүүлэх'}
                </button>
              </div>
            )}
          </div>

          {/* Mobile Language Switcher */}
          <LanguageSwitcher isMobile={true} onSelect={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </header>
  );
};
