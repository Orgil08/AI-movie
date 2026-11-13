import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Crown,
  User,
  Menu,
  X,
  CreditCard,
  ShieldCheck,
  LogOut,
  LogIn,
  UserPlus,
  Bookmark,
  History,
  Star,
  Loader2,
  Home,
  LayoutGrid,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { AuthUser } from './AuthModal.js';
import { LanguageSwitcher } from './LanguageSwitcher.js';
import { useLocale } from '../i18n/I18nContext.js';
import { Movie, getLocalizedMovieText } from '../data/movies.js';
import { getMovieTitleSuggestions } from '../utils/movieFilter.js';
import { MoviePoster } from './MoviePoster.js';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: any) => void;
  activeSubscription?: {
    active: boolean;
    planName?: string;
    daysRemaining?: number;
  };
  subscription?: any;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  currentUser: { id: string; name: string; email: string; role?: 'user' | 'admin' } | AuthUser | null;
  onOpenAuth: (mode?: any) => void;
  onLogout?: () => void;
  onSignOut?: () => void;
  onOpenDocs?: () => void;
  myListCount?: number;
  watchHistoryCount?: number;
  movies?: Movie[];
  onSelectMovie?: (movie: Movie) => void;
  selectedCategory?: string;
  onSelectCategory?: (categoryMn: string) => void;
  navFilter?: 'all' | 'originals' | 'hot';
  onSelectNavFilter?: (filter: 'all' | 'originals' | 'hot') => void;
  hasAdultContent?: boolean;
}

const MEGA_MENU_CATEGORIES = [
  { mn: 'Драм', en: 'Drama', query: 'Драм' },
  { mn: 'Хайр дурлал', en: 'Romance', query: 'Хайр дурлал' },
  { mn: 'Триллер', en: 'Thriller', query: 'Триллер' },
  { mn: 'Нууцлаг', en: 'Mystery', query: 'Мистик' },
  { mn: 'Гэмт хэрэг', en: 'Crime', query: 'Нео-Нуар' },
  { mn: 'Инээдэм', en: 'Comedy', query: 'Инээдэм' },
  { mn: 'Адал явдал', en: 'Adventure', query: 'Адал явдалт' },
  { mn: 'Уран зөгнөлт', en: 'Sci-Fi', query: 'AI Sci-Fi' },
  { mn: 'Түүхэн', en: 'Historical', query: 'Түүхэн' },
  { mn: 'Тулаант', en: 'Action', query: 'Action' }
];

const EMPTY_MOVIES: Movie[] = [];

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  activeSubscription,
  subscription,
  searchQuery,
  setSearchQuery,
  currentUser,
  onOpenAuth,
  onLogout,
  onSignOut,
  myListCount = 0,
  watchHistoryCount = 0,
  movies = EMPTY_MOVIES,
  onSelectMovie,
  onSelectCategory
}) => {
  const { locale } = useLocale();
  const resolvedActiveSub = activeSubscription || {
    active: Boolean(subscription && subscription.status === 'ACTIVE'),
    planName: subscription?.planName,
    daysRemaining: subscription?.daysRemaining
  };
  const handleSignOutClick = () => {
    if (onSignOut) onSignOut();
    else if (onLogout) onLogout();
  };
  const t = (key: string) => {
    const dict: Record<string, { mn: string; en: string }> = {
      'nav.admin': { mn: 'Админ', en: 'Admin' },
      'nav.roleAdmin': { mn: 'Админ', en: 'Admin' },
      'nav.roleMember': { mn: 'Гишүүн', en: 'Member' },
      'nav.profileSettings': { mn: 'Профайл тохиргоо', en: 'Profile Settings' },
      'nav.myList': { mn: 'Миний жагсаалт', en: 'My List' },
      'nav.activePlan': { mn: 'Идэвхтэй багц', en: 'Active Plan' },
      'nav.paymentHistory': { mn: 'Төлбөрийн түүх', en: 'Payment History' },
      'nav.adminDashboard': { mn: 'Админ удирдлага', en: 'Admin Dashboard' },
      'nav.logout': { mn: 'Системээс гарах', en: 'Sign Out' },
      'nav.login': { mn: 'Нэвтрэх', en: 'Sign In' },
      'nav.register': { mn: 'Бүртгүүлэх', en: 'Sign Up' }
    };
    return dict[key]?.[locale] || key;
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setCategoryMenuOpen(false);
        setSearchFocused(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSuggestions((prev) => (prev.length === 0 ? prev : []));
      setIsSearchingSuggestions((prev) => (prev ? false : prev));
      return;
    }

    const controller = new AbortController();
    setIsSearchingSuggestions(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/movies/suggestions?q=${encodeURIComponent(trimmed)}&limit=5`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.suggestions)) {
            setSuggestions(data.suggestions);
            setIsSearchingSuggestions(false);
            return;
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
      setSuggestions(getMovieTitleSuggestions(movies, trimmed, 5));
      setIsSearchingSuggestions(false);
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, movies]);

  const handleCategoryPick = (catQuery: string) => {
    setCategoryMenuOpen(false);
    if (onSelectCategory) {
      onSelectCategory(catQuery);
    } else {
      setSearchQuery(catQuery);
      setCurrentTab('movies');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#080A10]/95 backdrop-blur-xl border-b border-[#252D3A]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Left Side: SODON AI MOVIE Logo + Primary Navigation */}
          <div className="flex items-center gap-4 lg:gap-7">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCurrentTab('home');
                setCategoryMenuOpen(false);
              }}
              className="flex items-baseline gap-1.5 cursor-pointer group shrink-0"
            >
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
                SODON
              </span>
              <span className="text-[11px] sm:text-xs font-extrabold tracking-[0.18em] text-[#F5B936] uppercase">
                AI MOVIE
              </span>
            </button>

            <div className="hidden md:block h-5 w-px bg-[#252D3A]" />

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-5 lg:gap-6">
              {/* Нүүр */}
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentTab('home');
                  setCategoryMenuOpen(false);
                }}
                className={`relative flex items-center gap-1.5 h-16 text-sm font-semibold transition-colors cursor-pointer ${
                  currentTab === 'home' ? 'text-white' : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>{locale === 'en' ? 'Home' : 'Нүүр'}</span>
                {currentTab === 'home' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1769FF] rounded-full" />
                )}
              </button>

              {/* Originals */}
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentTab('originals');
                  setCategoryMenuOpen(false);
                }}
                data-testid="nav-originals-btn"
                className={`relative flex items-center gap-1.5 h-16 text-sm font-semibold transition-colors cursor-pointer ${
                  currentTab === 'originals' ? 'text-white' : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#1769FF]" />
                <span>Originals</span>
                {currentTab === 'originals' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1769FF] rounded-full" />
                )}
              </button>

              {/* Hot+ 18+ */}
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentTab('hot');
                  setCategoryMenuOpen(false);
                }}
                data-testid="nav-hot-btn"
                className={`relative flex items-center gap-1.5 h-16 text-sm font-semibold transition-colors cursor-pointer ${
                  currentTab === 'hot' ? 'text-white' : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#E50914]" />
                <span>Hot+</span>
                <span className="px-1.5 py-0.5 rounded bg-[#E50914]/20 border border-[#E50914]/40 text-[#FF5A64] text-[10px] font-extrabold leading-none">
                  18+
                </span>
                {currentTab === 'hot' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E50914] rounded-full" />
                )}
              </button>

              {/* Ангилал Mega-Dropdown */}
              <div className="relative" ref={categoryRef}>
                <button
                  type="button"
                  onClick={() => setCategoryMenuOpen((prev) => !prev)}
                  data-testid="nav-categories-btn"
                  className={`relative flex items-center gap-1.5 h-16 text-sm font-semibold transition-colors cursor-pointer ${
                    categoryMenuOpen || currentTab === 'movies'
                      ? 'text-white'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>{locale === 'en' ? 'Categories' : 'Ангилал'}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      categoryMenuOpen ? 'rotate-180 text-[#1769FF]' : ''
                    }`}
                  />
                  {(categoryMenuOpen || currentTab === 'movies') && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1769FF] rounded-full" />
                  )}
                </button>
              </div>

              {/* VIP Багц */}
              <button
                type="button"
                onClick={() => {
                  setCurrentTab('pricing');
                  setCategoryMenuOpen(false);
                }}
                data-testid="nav-vip-btn"
                className={`relative flex items-center gap-1.5 h-16 text-sm font-semibold transition-colors cursor-pointer ${
                  currentTab === 'pricing'
                    ? 'text-[#F5B936]'
                    : 'text-[#94A3B8] hover:text-[#F5B936]'
                }`}
              >
                <Crown className="w-4 h-4 text-[#F5B936]" />
                <span>{locale === 'en' ? 'VIP Plans' : 'VIP Багц'}</span>
                {currentTab === 'pricing' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F5B936] rounded-full" />
                )}
              </button>

              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setCurrentTab('admin')}
                  className={`relative flex items-center gap-1.5 h-16 text-sm font-semibold transition-colors cursor-pointer ${
                    currentTab === 'admin' ? 'text-white' : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-[#1769FF]" />
                  <span>{t('nav.admin')}</span>
                  {currentTab === 'admin' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1769FF] rounded-full" />
                  )}
                </button>
              )}
            </nav>
          </div>

          {/* Right Side: Pill Search Input + Language Selector + Profile / Login */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Pill Search Input matching image_b107e829.png */}
            <div className="relative hidden sm:block" ref={searchRef}>
              <Search
                className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                  searchFocused ? 'text-[#1769FF]' : 'text-[#94A3B8]'
                }`}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchFocused(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    setSearchFocused(false);
                    if (currentTab !== 'movies') setCurrentTab('movies');
                  } else if (e.key === 'Escape') {
                    setSearchFocused(false);
                  }
                }}
                placeholder={locale === 'en' ? 'Search movies, series...' : 'Кино, цуврал хайх...'}
                className={`bg-[#111827] border text-sm text-white placeholder-[#94A3B8] pl-10 pr-10 py-2 rounded-full w-48 lg:w-64 focus:w-72 transition-all duration-300 focus:outline-none ${
                  searchFocused
                    ? 'border-[#1769FF] shadow-[0_0_20px_rgba(23,105,255,0.25)]'
                    : 'border-[#252D3A] hover:border-[#364154]'
                }`}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSuggestions([]);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-[#1A2130] border border-[#252D3A] text-[10px] font-mono text-[#94A3B8]">
                  /
                </span>
              )}

              {/* Search Suggestions Dropdown */}
              {searchFocused && searchQuery.trim().length > 0 && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0D111B] border border-[#252D3A] shadow-2xl overflow-hidden z-50 animate-searchDropdown">
                  <div className="px-3.5 py-2 border-b border-[#252D3A] flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                      {locale === 'en' ? 'Search Results' : 'Хайлтын илэрц'}
                    </span>
                    {isSearchingSuggestions && (
                      <Loader2 className="w-3.5 h-3.5 text-[#1769FF] animate-spin" />
                    )}
                  </div>

                  {suggestions.length > 0 ? (
                    <div className="divide-y divide-[#252D3A]/60 max-h-80 overflow-y-auto">
                      {suggestions.map((movie) => {
                        const title = getLocalizedMovieText(
                          movie.title,
                          locale,
                          locale === 'en' ? movie.titleEn : movie.titleMn
                        );
                        return (
                          <button
                            key={movie.id}
                            type="button"
                            onClick={() => {
                              setSearchFocused(false);
                              if (onSelectMovie) {
                                onSelectMovie(movie);
                              } else {
                                setSearchQuery(title);
                                setCurrentTab('movies');
                              }
                            }}
                            className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-left cursor-pointer group"
                          >
                            <div className="w-9 h-12 rounded-lg overflow-hidden bg-[#111827] shrink-0 border border-[#252D3A]">
                              <MoviePoster
                                src={movie.posterUrl}
                                alt={title}
                                seedKey={movie.id}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white group-hover:text-[#599CFF] truncate transition-colors">
                                {title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#94A3B8]">
                                <span className="text-[#599CFF] font-medium">
                                  {movie.type === 'series'
                                    ? locale === 'en'
                                      ? 'Series'
                                      : 'Цуврал'
                                    : locale === 'en'
                                    ? 'Movie'
                                    : 'Кино'}
                                </span>
                                <span>•</span>
                                <span>{movie.year}</span>
                                <span>•</span>
                                <span className="inline-flex items-center gap-0.5 text-[#F5B936] font-semibold">
                                  <Star className="w-2.5 h-2.5 fill-[#F5B936] text-[#F5B936]" />
                                  {movie.rating}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          setSearchFocused(false);
                          setCurrentTab('movies');
                        }}
                        className="w-full py-2.5 text-center text-xs font-bold text-[#599CFF] hover:bg-[#1769FF]/10 transition-colors cursor-pointer"
                      >
                        {locale === 'en' ? 'View all results →' : 'Бүх илэрцийг харах →'}
                      </button>
                    </div>
                  ) : (
                    !isSearchingSuggestions && (
                      <div className="px-4 py-5 text-center text-xs text-[#94A3B8]">
                        {locale === 'en' ? 'No matching titles found' : 'Илэрц олдсонгүй'}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Language Switcher MN / EN */}
            <LanguageSwitcher />

            {/* User Profile Dropdown or Нэвтрэх Button */}
            {currentUser ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-[#111827] hover:bg-[#192234] border border-[#252D3A] transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#1769FF] to-[#347DFF] flex items-center justify-center text-xs font-black text-white">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-xs font-bold text-white leading-none truncate max-w-[100px]">
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-[#94A3B8] leading-none mt-0.5">
                      {currentUser.role === 'admin'
                        ? t('nav.roleAdmin')
                        : resolvedActiveSub.active
                        ? 'VIP'
                        : t('nav.roleMember')}
                    </p>
                  </div>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#0D111B] border border-[#252D3A] shadow-2xl py-2 z-50">
                    <div className="px-4 py-2.5 border-b border-[#252D3A]">
                      <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                      <p className="text-xs text-[#94A3B8] truncate">{currentUser.email}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('account');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 cursor-pointer"
                    >
                      <User className="w-4 h-4 text-[#1769FF]" />
                      {t('nav.profileSettings')}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('mylist');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Bookmark className="w-4 h-4 text-[#F5B936]" />
                        {t('nav.myList')}
                      </span>
                      {myListCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1769FF]/20 text-[#599CFF]">
                          {myListCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('watch-history');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <History className="w-4 h-4 text-emerald-400" />
                        {locale === 'en' ? 'Watch History' : 'Үзсэн түүх'}
                      </span>
                      {watchHistoryCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                          {watchHistoryCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('subscription');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Crown className="w-4 h-4 text-[#F5B936]" />
                      {t('nav.activePlan')}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('payments');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4 text-[#1769FF]" />
                      {t('nav.paymentHistory')}
                    </button>

                    {currentUser.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentTab('admin');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-medium text-[#599CFF] hover:bg-[#1769FF]/10 flex items-center gap-2.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        {t('nav.adminDashboard')}
                      </button>
                    )}

                    <div className="border-t border-[#252D3A] mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleSignOutClick();
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-semibold text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('nav.logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                data-testid="nav-login-btn"
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-[#111827] hover:bg-[#192234] text-white border border-[#252D3A] hover:border-[#1769FF]/50 transition-all cursor-pointer"
              >
                <User className="w-4 h-4 text-gray-300" />
                <span>{t('nav.login')}</span>
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Full-width Category Mega-Dropdown */}
      {categoryMenuOpen && (
        <div className="hidden md:block w-full bg-[#0D111B]/98 backdrop-blur-2xl border-b border-[#252D3A] shadow-[0_24px_48px_rgba(0,0,0,0.75)] animate-fadeIn">
          <div className="max-w-[1440px] mx-auto px-10 py-8 grid grid-cols-12 gap-8 items-start">
            <div className="col-span-4 pr-6 border-r border-[#252D3A]">
              <p className="text-xs font-semibold text-[#94A3B8] mb-1">
                {locale === 'en' ? 'Categories' : 'Ангилал'}
              </p>
              <h3 className="text-2xl font-black text-white mb-2">
                {locale === 'en' ? 'What to watch?' : 'Юу үзэх вэ?'}
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed mb-5">
                {locale === 'en'
                  ? 'Pick your favorite genre and start streaming immediately.'
                  : 'Таалагдсан төрлөө сонгоод шууд үзээрэй.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setCategoryMenuOpen(false);
                  setSearchQuery('');
                  setCurrentTab('movies');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1769FF] hover:text-[#347DFF] transition-colors cursor-pointer"
              >
                <span>{locale === 'en' ? 'All Categories' : 'Бүх ангилал'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="col-span-8 grid grid-cols-4 gap-y-4 gap-x-6 pt-1">
              {MEGA_MENU_CATEGORIES.map((cat) => (
                <button
                  key={cat.mn}
                  type="button"
                  onClick={() => handleCategoryPick(cat.query)}
                  className="flex items-center gap-2.5 text-left text-sm font-medium text-gray-300 hover:text-white group transition-colors cursor-pointer py-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1769FF] group-hover:scale-125 transition-transform" />
                  <span>{locale === 'en' ? cat.en : cat.mn}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0D111B] border-b border-[#252D3A] px-4 pt-3 pb-5 space-y-2">
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (currentTab !== 'movies') setCurrentTab('movies');
              }}
              placeholder={locale === 'en' ? 'Search movies, series...' : 'Кино, цуврал хайх...'}
              className="bg-[#111827] border border-[#252D3A] text-sm text-white placeholder-[#94A3B8] pl-9 pr-4 py-2 rounded-full w-full focus:outline-none focus:border-[#1769FF]"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setCurrentTab('home');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-white/5"
          >
            {locale === 'en' ? 'Home' : 'Нүүр'}
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentTab('originals');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-white/5 flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-[#1769FF]" />
            <span>Originals</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentTab('hot');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-white/5 flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-[#E50914]" />
            <span>Hot+</span>
            <span className="px-1.5 py-0.5 rounded bg-[#E50914]/20 text-[#FF5A64] text-[10px] font-bold">
              18+
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentTab('movies');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-white/5"
          >
            {locale === 'en' ? 'All Movies & Categories' : 'Бүх Кино & Ангилал'}
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentTab('pricing');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-[#F5B936] hover:bg-[#F5B936]/10 flex items-center gap-2"
          >
            <Crown className="w-4 h-4" />
            <span>{locale === 'en' ? 'VIP Plans (19,900₮)' : 'VIP Багц (19,900₮)'}</span>
          </button>

          {!currentUser && (
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('login');
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                {t('nav.login')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('register');
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#1769FF] text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {t('nav.register')}
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
