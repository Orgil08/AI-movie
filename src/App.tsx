import React, { useEffect, useRef, useState } from 'react';
import { I18nProvider, useLocale, useTranslations } from './i18n/I18nContext.js';
import { stripLocaleFromPath, getLocaleFromPath, buildLocalizedPath } from './i18n/routing.js';
import { Navbar } from './components/Navbar.js';
import { HeroBanner } from './components/HeroBanner.js';
import { MovieRow } from './components/MovieRow.js';
import { MoviePlayerModal } from './components/MoviePlayerModal.js';
import { MovieDetailModal } from './components/MovieDetailModal.js';
import { MovieCatalogueView } from './components/MovieCatalogueView.js';
import { PricingView } from './components/PricingView.js';
import { CheckoutView } from './components/CheckoutView.js';
import { PaymentSuccessView } from './components/PaymentSuccessView.js';
import { PaymentCancelView } from './components/PaymentCancelView.js';
import { SubscriptionView } from './components/SubscriptionView.js';
import { PaymentHistoryView } from './components/PaymentHistoryView.js';
import { StreamlineShowcase } from './components/StreamlineShowcase.js';
import { WireDocsGuideModal } from './components/WireDocsGuideModal.js';
import { AuthModal } from './components/AuthModal.js';
import { Footer } from './components/Footer.js';
import { SEOHead } from './components/SEOHead.js';
import { ContinueWatchingRow } from './components/ContinueWatchingRow.js';
import { LoginPage } from './components/LoginPage.js';
import { RegisterPage } from './components/RegisterPage.js';
import { ResetPasswordPage } from './components/ResetPasswordPage.js';
import { ProfilePage } from './components/ProfilePage.js';
import { AdminPanel } from './components/AdminPanel.js';
import { WatchHistoryView } from './components/WatchHistoryView.js';
import { ToastContainer } from './components/ToastContainer.js';
import { OriginalsView } from './components/OriginalsView.js';
import { HotPlusView } from './components/HotPlusView.js';
import { AgeVerificationModal } from './components/AgeVerificationModal.js';
import { isAdultRestrictedMovie } from './utils/ageGateAndPosters.js';
import {
  WatchProgress,
  WatchHistoryItem,
  getWatchProgressList,
  removeWatchProgress,
  getWatchProgressForMovie,
  getWatchHistoryList,
  removeWatchHistoryItem,
  clearWatchHistory
} from './utils/watchProgress.js';
import {
  MyListToastNotification,
  getMyListIds,
  toggleMovieInMyList
} from './utils/myList.js';
import { authFetch, clearStoredUserId, setStoredUserId } from './utils/api.js';
import { Movie } from './data/movies.js';

const ACTIVE_ORDER_STORAGE_KEY = 'ai_movie_active_order';
const ACTIVE_TAB_STORAGE_KEY = 'ai_movie_active_tab';

function AppContent() {
  const { locale, setLocale } = useLocale();
  const tHome = useTranslations('HomePage');

  const [currentTab, setCurrentTab] = useState<string>('home');
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role?: 'user' | 'admin' } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedUser = localStorage.getItem('ai_movie_cached_user');
        if (cachedUser) return JSON.parse(cachedUser);
      } catch {}
    }
    return null;
  });
  const [loginBannerMessage, setLoginBannerMessage] = useState<string | null>(null);
  const [appErrorBanner, setAppErrorBanner] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);

  // MongoDB-backed movies & site settings state (Phase 2 & Phase 7)
  const [movies, setMovies] = useState<Movie[]>([]);
  const [moviesLoading, setMoviesLoading] = useState<boolean>(true);
  const [moviesError, setMoviesError] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState<any>(null);

  const [activeMovieForPlayer, setActiveMovieForPlayer] = useState<Movie | null>(null);
  const [playerInitialTime, setPlayerInitialTime] = useState<number>(0);
  const [playingEpisodeNumber, setPlayingEpisodeNumber] = useState<number>(1);
  const [activePlayerTrailerUrl, setActivePlayerTrailerUrl] = useState<string | null>(null);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState<boolean>(false);
  const [selectedMovieForDetail, setSelectedMovieForDetail] = useState<Movie | null>(null);
  const [pendingMovieSlugFromUrl, setPendingMovieSlugFromUrl] = useState<string | null>(null);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY) || '';
      } catch {}
    }
    return '';
  });
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatalogueGenre, setSelectedCatalogueGenre] = useState<string>('all');
  const [navFilter, setNavFilter] = useState<'all' | 'originals' | 'hot'>('all');
  const [myListIds, setMyListIds] = useState<string[]>(() => getMyListIds());
  const [myListToasts, setMyListToasts] = useState<MyListToastNotification[]>([]);
  const [watchProgressList, setWatchProgressList] = useState<WatchProgress[]>(() => getWatchProgressList());
  const [watchHistoryList, setWatchHistoryList] = useState<WatchHistoryItem[]>(() => getWatchHistoryList());

  const lastContentTabRef = useRef<string>('home');

  // 18+ Age Verification State (Part 12 & 13)
  const [isAgeVerified, setIsAgeVerified] = useState<boolean>(false);
  const [ageVerifiedToken, setAgeVerifiedToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem('ai_movie_age_token');
      } catch {}
    }
    return null;
  });
  const [ageGateOpen, setAgeGateOpen] = useState<boolean>(false);
  const [ageGateSubmitting, setAgeGateSubmitting] = useState<boolean>(false);
  const [pendingAgeAction, setPendingAgeAction] = useState<
    | { type: 'tab'; tab: 'hot' }
    | { type: 'detail'; movie: Movie }
    | { type: 'play'; movie: Movie; initialTime?: number; episodeNumber?: number }
    | null
  >(null);

  const checkAgeVerificationStatus = async (): Promise<boolean> => {
    try {
      const headers: Record<string, string> = {};
      if (ageVerifiedToken) {
        headers['x-age-verified-token'] = ageVerifiedToken;
      }
      const res = await fetch('/api/age-verification/status', {
        credentials: 'include',
        headers
      });
      if (res.ok) {
        const data = await res.json();
        const verified = Boolean(data.verified);
        setIsAgeVerified(verified);
        if (data.token) {
          setAgeVerifiedToken(data.token);
          try {
            sessionStorage.setItem('ai_movie_age_token', data.token);
          } catch {}
        }
        return verified;
      }
    } catch {
      // ignore
    }
    return false;
  };

  const handleConfirmAgeVerification = async () => {
    setAgeGateSubmitting(true);
    try {
      const res = await fetch('/api/age-verification/confirm', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true })
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setIsAgeVerified(true);
        const token = data.token || null;
        if (token) {
          setAgeVerifiedToken(token);
          try {
            sessionStorage.setItem('ai_movie_age_token', token);
          } catch {}
        }
        setAgeGateOpen(false);
        await fetchPublicMovies(token);

        const action = pendingAgeAction;
        setPendingAgeAction(null);
        if (action?.type === 'tab') {
          setCurrentTab('hot');
          const newUrl = buildLocalizedPath('/hot', locale);
          window.history.pushState({ tab: 'hot', locale }, '', newUrl);
        } else if (action?.type === 'detail') {
          setSelectedMovieForDetail(action.movie);
        } else if (action?.type === 'play') {
          handlePlayMovie(action.movie, action.initialTime, action.episodeNumber, true);
        }
      }
    } catch (err) {
      console.error('Age verification confirmation failed', err);
    } finally {
      setAgeGateSubmitting(false);
    }
  };

  const handleDeclineAgeVerification = () => {
    setAgeGateOpen(false);
    setPendingAgeAction(null);
    if (currentTab === 'hot') {
      updateTabAndUrl('home');
    }
  };

  const handleSelectMovieWithAgeCheck = (movie: Movie) => {
    if (isAdultRestrictedMovie(movie) && !isAgeVerified && currentUser?.role !== 'admin') {
      setPendingAgeAction({ type: 'detail', movie });
      setAgeGateOpen(true);
      return;
    }
    setSelectedMovieForDetail(movie);
  };

  const handlePlayMovie = (
    movie: Movie,
    initialTime?: number,
    episodeNumber?: number,
    bypassAgeCheck = false
  ) => {
    if (
      !bypassAgeCheck &&
      isAdultRestrictedMovie(movie) &&
      !isAgeVerified &&
      currentUser?.role !== 'admin'
    ) {
      setPendingAgeAction({ type: 'play', movie, initialTime, episodeNumber });
      setAgeGateOpen(true);
      return;
    }
    let time = initialTime;
    if (time === undefined) {
      const existing = getWatchProgressForMovie(movie.id);
      time = existing ? existing.currentTime : 0;
    }
    setActivePlayerTrailerUrl(null);
    setIsPlayingTrailer(false);
    setPlayerInitialTime(time);
    setPlayingEpisodeNumber(episodeNumber && episodeNumber >= 1 ? episodeNumber : 1);
    setActiveMovieForPlayer(movie);
  };

  const handleWatchTrailer = (movie: Movie, trailerUrl?: string) => {
    const resolvedTrailerUrl = (trailerUrl || movie.trailerUrl || '').trim();
    if (!resolvedTrailerUrl) return;
    setSelectedMovieForDetail(null);
    setPlayerInitialTime(0);
    setActivePlayerTrailerUrl(resolvedTrailerUrl);
    setIsPlayingTrailer(true);
    setActiveMovieForPlayer(movie);
  };

  // Authentication Modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [pendingPlanAfterAuth, setPendingPlanAfterAuth] = useState<{
    planId: string;
    paymentMethod?: 'wire_qpay' | 'bank_transfer';
  } | null>(null);

  const fetchPublicMovies = async (explicitAgeToken?: string | null) => {
    setMoviesLoading(true);
    setMoviesError(null);
    try {
      const tokenToUse = explicitAgeToken !== undefined ? explicitAgeToken : ageVerifiedToken;
      const headers: Record<string, string> = {};
      if (tokenToUse) {
        headers['x-age-verified-token'] = tokenToUse;
      }
      const res = await fetch('/api/movies', {
        credentials: 'include',
        headers
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load movies from database');
      }
      if (typeof data.ageVerified === 'boolean') {
        setIsAgeVerified(data.ageVerified);
      }
      setMovies(Array.isArray(data.movies) ? data.movies : []);
    } catch (err: any) {
      setMoviesError(err.message || 'Could not load movies');
    } finally {
      setMoviesLoading(false);
    }
  };

  const fetchPublicSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSiteSettings(data.settings);
        }
      }
    } catch (err) {
      console.warn('Could not load site settings', err);
    }
  };

  const syncRouteFromLocation = () => {
    const { pathname, search } = window.location;
    const pathLocale = getLocaleFromPath(pathname);
    if (pathLocale && pathLocale !== locale) {
      setLocale(pathLocale);
    }

    const cleanPath = stripLocaleFromPath(pathname);
    const params = new URLSearchParams(search);
    const orderParam = params.get('order');

    if (cleanPath.startsWith('/payment/success') || params.get('status') === 'success') {
      if (orderParam) {
        setSelectedOrderNumber(orderParam);
        try { localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, orderParam); } catch {}
      }
      setCurrentTab('payment-success');
      lastContentTabRef.current = 'payment-success';
    } else if (cleanPath.startsWith('/payment/cancel') || params.get('status') === 'cancel') {
      if (orderParam) {
        setSelectedOrderNumber(orderParam);
        try { localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, orderParam); } catch {}
      }
      setCurrentTab('payment-cancel');
      lastContentTabRef.current = 'payment-cancel';
    } else if (cleanPath.startsWith('/originals')) {
      setCurrentTab('originals');
      lastContentTabRef.current = 'originals';
    } else if (cleanPath.startsWith('/hot')) {
      checkAgeVerificationStatus().then((verified) => {
        if (verified || currentUser?.role === 'admin') {
          setCurrentTab('hot');
          lastContentTabRef.current = 'hot';
          fetchPublicMovies();
        } else {
          setPendingAgeAction({ type: 'tab', tab: 'hot' });
          setAgeGateOpen(true);
          setCurrentTab('home');
        }
      });
    } else if (cleanPath.startsWith('/pricing')) {
      setCurrentTab('pricing');
      lastContentTabRef.current = 'pricing';
    } else if (cleanPath.startsWith('/movies')) {
      setCurrentTab('movies');
      lastContentTabRef.current = 'movies';
    } else if (cleanPath.startsWith('/login')) {
      setCurrentTab('login');
    } else if (cleanPath.startsWith('/register')) {
      setCurrentTab('register');
    } else if (cleanPath.startsWith('/reset-password')) {
      setCurrentTab('reset-password');
    } else if (cleanPath.startsWith('/admin')) {
      setCurrentTab('admin');
    } else if (cleanPath.startsWith('/account/watch-history') || cleanPath.startsWith('/watch-history')) {
      setCurrentTab('watch-history');
      lastContentTabRef.current = 'watch-history';
    } else if (cleanPath.startsWith('/account/subscription') || cleanPath.startsWith('/subscription')) {
      setCurrentTab('subscription');
      lastContentTabRef.current = 'subscription';
    } else if (cleanPath.startsWith('/account/payments') || cleanPath.startsWith('/payments')) {
      setCurrentTab('payments');
      lastContentTabRef.current = 'payments';
    } else if (cleanPath.startsWith('/account') || cleanPath.startsWith('/profile')) {
      setCurrentTab('account');
      lastContentTabRef.current = 'account';
    } else if (cleanPath.startsWith('/movie/')) {
      const rawSlug = cleanPath.replace('/movie/', '').split('/')[0];
      if (rawSlug) {
        try {
          setPendingMovieSlugFromUrl(decodeURIComponent(rawSlug));
        } catch {
          setPendingMovieSlugFromUrl(rawSlug);
        }
      }
      setCurrentTab('home');
      lastContentTabRef.current = 'home';
    } else if (cleanPath.startsWith('/checkout') || orderParam) {
      let resolvedOrder = orderParam || '';
      if (!resolvedOrder) {
        const orderId = cleanPath.replace('/checkout/', '').split('/')[0];
        if (orderId && orderId !== 'checkout' && orderId !== '/checkout') {
          resolvedOrder = orderId;
        }
      }
      if (!resolvedOrder) {
        try {
          resolvedOrder = localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY) || '';
        } catch {}
      }
      if (resolvedOrder) {
        setSelectedOrderNumber(resolvedOrder);
        try { localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, resolvedOrder); } catch {}
      }
      setCurrentTab('checkout');
      lastContentTabRef.current = 'checkout';
    } else {
      // If mobile browser reloads root URL (e.g. inside iframe or webview after switching from Khan Bank app),
      // restore active checkout or pricing tab from sessionStorage so user is never kicked out mid-transfer.
      try {
        const savedTab = sessionStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
        const savedOrder = localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY);
        if (savedTab === 'checkout' && savedOrder) {
          setSelectedOrderNumber(savedOrder);
          setCurrentTab('checkout');
          lastContentTabRef.current = 'checkout';
          return;
        }
        if (savedTab === 'pricing') {
          setCurrentTab('pricing');
          lastContentTabRef.current = 'pricing';
          return;
        }
      } catch {}
      setCurrentTab('home');
      lastContentTabRef.current = 'home';
    }
  };

  // Initial URL parsing & data fetch
  useEffect(() => {
    checkAgeVerificationStatus();
    syncRouteFromLocation();
    fetchUserAndSubscription();
    fetchPublicMovies();
    fetchPublicSettings();

    const handlePopState = () => {
      syncRouteFromLocation();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUserAndSubscription();
      }
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Resolve deep-linked movie slug once movies are loaded
  useEffect(() => {
    if (!pendingMovieSlugFromUrl) return;
    const match = movies.find(
      (m) => m.id === pendingMovieSlugFromUrl || m.slug === pendingMovieSlugFromUrl
    );
    if (match) {
      setSelectedMovieForDetail(match);
      setPendingMovieSlugFromUrl(null);
    } else if (!moviesLoading) {
      fetch(`/api/movies/${encodeURIComponent(pendingMovieSlugFromUrl)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.movie) {
            setSelectedMovieForDetail(data.movie);
          }
        })
        .catch(() => {})
        .finally(() => setPendingMovieSlugFromUrl(null));
    }
  }, [pendingMovieSlugFromUrl, movies, moviesLoading]);

  // Update browser URL state whenever currentTab or locale changes
  const updateTabAndUrl = (newTab: string, explicitOrderNumber?: string) => {
    if (newTab === 'hot' && !isAgeVerified && currentUser?.role !== 'admin') {
      setPendingAgeAction({ type: 'tab', tab: 'hot' });
      setAgeGateOpen(true);
      return;
    }

    if (newTab !== 'login' && newTab !== 'register' && newTab !== 'reset-password') {
      lastContentTabRef.current = newTab;
    }
    setCurrentTab(newTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const effectiveOrderNumber = explicitOrderNumber ?? selectedOrderNumber;
    if (explicitOrderNumber) {
      setSelectedOrderNumber(explicitOrderNumber);
      try {
        localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, explicitOrderNumber);
      } catch {}
    }

    try {
      sessionStorage.setItem(ACTIVE_TAB_STORAGE_KEY, newTab);
    } catch {}

    if (newTab === 'home' || newTab === 'movies' || newTab === 'originals' || newTab === 'hot') {
      fetchPublicMovies();
      fetchPublicSettings();
    }

    let cleanPath = '/';
    if (newTab === 'movies') cleanPath = '/movies';
    else if (newTab === 'originals') cleanPath = '/originals';
    else if (newTab === 'hot') cleanPath = '/hot';
    else if (newTab === 'pricing') cleanPath = '/pricing';
    else if (newTab === 'subscription') cleanPath = '/account/subscription';
    else if (newTab === 'payments') cleanPath = '/account/payments';
    else if (newTab === 'watch-history') cleanPath = '/account/watch-history';
    else if (newTab === 'account') cleanPath = '/account';
    else if (newTab === 'login') cleanPath = '/login';
    else if (newTab === 'register') cleanPath = '/register';
    else if (newTab === 'reset-password') cleanPath = '/reset-password';
    else if (newTab === 'admin') cleanPath = '/admin';
    else if (newTab === 'checkout') {
      cleanPath = effectiveOrderNumber ? `/checkout/${effectiveOrderNumber}` : '/checkout';
    } else if (newTab === 'payment-success' && effectiveOrderNumber) {
      cleanPath = `/payment/success?order=${effectiveOrderNumber}`;
    }

    const newUrl = buildLocalizedPath(cleanPath, locale);
    window.history.pushState({ tab: newTab, locale, orderNumber: effectiveOrderNumber }, '', newUrl);
  };

  const fetchUserAndSubscription = async () => {
    try {
      const res = await authFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          setStoredUserId(data.user.id);
          try {
            localStorage.setItem('ai_movie_cached_user', JSON.stringify(data.user));
          } catch {}
        } else {
          setCurrentUser(null);
          try {
            localStorage.removeItem('ai_movie_cached_user');
          } catch {}
        }
        setSubscription(data.subscription || null);
      }
    } catch (err) {
      // Do not clear currentUser on transient mobile network interruptions (e.g. switching apps)
      console.warn('Could not fetch user/subscription context', err);
    }
  };

  const handleSignOut = async () => {
    try {
      clearStoredUserId();
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('ai_movie_cached_user');
          localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
          sessionStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
        } catch {}
      }
      await authFetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      setSubscription(null);
      if (currentTab === 'subscription' || currentTab === 'payments' || currentTab === 'account' || currentTab === 'admin') {
        updateTabAndUrl('home');
      }
    } catch (err) {
      console.error('Sign out failed', err);
    }
  };

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleSelectPlan = async (
    planId: string,
    paymentMethod?: 'wire_qpay' | 'bank_transfer',
    authenticatedUserOverride?: { id: string; name: string; email: string; role?: 'user' | 'admin' } | null
  ) => {
    const resolvedMethod =
      paymentMethod ||
      (typeof window !== 'undefined' && localStorage.getItem('ai_movie_payment_method') === 'bank_transfer'
        ? 'bank_transfer'
        : 'wire_qpay');

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ai_movie_payment_method', resolvedMethod);
      } catch {}
    }

    const activeUser = authenticatedUserOverride ?? currentUser;
    // If not signed in, prompt authentication first
    if (!activeUser) {
      setPendingPlanAfterAuth({ planId, paymentMethod: resolvedMethod });
      setAuthModalMode('signin');
      setAuthModalOpen(true);
      return;
    }

    setLoadingPlanId(planId);
    setAppErrorBanner(null);
    try {
      const res = await authFetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, paymentMethod: resolvedMethod })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setPendingPlanAfterAuth({ planId, paymentMethod: resolvedMethod });
          setAuthModalMode('signin');
          setAuthModalOpen(true);
          return;
        }
        setAppErrorBanner(data.message || (locale === 'en' ? 'Failed to create payment order' : 'Захиалга үүсгэхэд алдаа гарлаа'));
        return;
      }

      if (typeof window !== 'undefined' && data.orderNumber) {
        try {
          sessionStorage.setItem(`ai_movie_order_${data.orderNumber}`, JSON.stringify({
            orderNumber: data.orderNumber,
            paymentMethod: data.paymentMethod || resolvedMethod,
            amount: data.amount,
            currency: data.currency || 'MNT',
            planId: data.plan?.id || planId,
            planName: data.plan?.nameMn || planId,
            checkoutUrl: data.checkoutUrl,
            status: 'PENDING'
          }));
        } catch {}
      }

      setSelectedOrderNumber(data.orderNumber);
      updateTabAndUrl('checkout', data.orderNumber);
    } catch (err: any) {
      setAppErrorBanner(err.message || 'Network error');
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handleLoginSuccess = async (user: { id: string; name: string; email: string; role?: 'user' | 'admin' }) => {
    if (user?.id) {
      setStoredUserId(user.id);
      try {
        localStorage.setItem('ai_movie_cached_user', JSON.stringify(user));
      } catch {}
    }
    setCurrentUser(user);
    setLoginBannerMessage(null);
    await fetchUserAndSubscription();

    // Login redirection rule:
    // IF user.role === "admin": Redirect to /admin
    // IF user had a pending plan selection: Immediately create that order & go to checkout
    // IF user was on pricing or checkout: Keep them on pricing / checkout (never kick them out!)
    if (user.role === 'admin' && !pendingPlanAfterAuth && currentTab !== 'pricing' && currentTab !== 'checkout') {
      updateTabAndUrl('admin');
    } else if (pendingPlanAfterAuth) {
      const { planId, paymentMethod } = pendingPlanAfterAuth;
      setPendingPlanAfterAuth(null);
      await handleSelectPlan(planId, paymentMethod, user);
    } else if (
      currentTab === 'pricing' ||
      currentTab === 'checkout' ||
      lastContentTabRef.current === 'pricing' ||
      lastContentTabRef.current === 'checkout'
    ) {
      const targetTab =
        currentTab === 'pricing' || currentTab === 'checkout'
          ? currentTab
          : lastContentTabRef.current;
      updateTabAndUrl(targetTab, selectedOrderNumber || undefined);
    } else {
      updateTabAndUrl('home');
    }
  };

  const handleRegisterSuccess = (registeredEmail: string) => {
    setLoginBannerMessage(
      locale === 'en'
        ? `Account registered successfully! Please sign in with ${registeredEmail}.`
        : `Бүртгэл амжилттай үүслээ! ${registeredEmail} хаягаар нэвтэрнэ үү.`
    );
    updateTabAndUrl('login');
  };

  const handleAuthSuccess = async (user: { id: string; name: string; email: string; role?: 'user' | 'admin' }) => {
    await handleLoginSuccess(user);
  };

  const handlePaymentConfirmed = (orderNumber: string) => {
    setSelectedOrderNumber(orderNumber);
    fetchUserAndSubscription();
    updateTabAndUrl('payment-success', orderNumber);
  };

  const dismissToast = (id: string) => {
    setMyListToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleMyList = (movie: Movie) => {
    const { updatedIds, toast } = toggleMovieInMyList(myListIds, movie, locale);
    setMyListIds(updatedIds);
    setMyListToasts((prev) => [
      ...prev.filter((item) => item.movieId !== movie.id).slice(-2),
      toast
    ]);

    window.setTimeout(() => {
      setMyListToasts((prev) => prev.filter((item) => item.id !== toast.id));
    }, 3500);
  };

  const hasActiveSub = Boolean(subscription && subscription.status === 'ACTIVE');

  // MongoDB-backed homepage movie sections (Part 4)
  const featuredMovies = movies.filter((m) => m.featured);
  const heroMovie =
    (siteSettings?.featuredMovieId
      ? movies.find((m) => m.id === siteSettings.featuredMovieId || m.slug === siteSettings.featuredMovieId)
      : null) ||
    featuredMovies[0] ||
    movies[0] ||
    null;

  // Build Hero Carousel slides (prioritize featured series + featured movies)
  const heroSlides = [
    ...(heroMovie ? [heroMovie] : []),
    ...movies.filter((m) => m.id !== heroMovie?.id && (m.type === 'series' || m.featured || m.trending))
  ].slice(0, 5);

  const mongolianSubtitledMovies = movies.filter((m) => m.hasMongolianSubtitles !== false);
  const seriesAndShortDramas = movies.filter(
    (m) => m.type === 'series' || m.isShortDrama || (m.genres || []).some((g) => g.includes('Богино') || g.includes('Драм'))
  );
  const originalMovies = movies.filter((m) => m.isOriginal || m.isExclusive || m.featured);
  const trendingMovies = movies.filter((m) => m.trending || m.featured);
  const top10Movies = [...movies]
    .sort((a, b) => parseFloat(b.rating || '0') - parseFloat(a.rating || '0'))
    .slice(0, 10);
  const recentlyAddedMovies = [...movies].slice(0, 8);
  const freeAndFreeEpisodeMovies = movies.filter(
    (m) => !m.isPremium || (m.type === 'series' && Number(m.freeEpisodes ?? 6) > 0)
  );
  const hasAdultContent = movies.some((m) => m.ageRating === '18+' || m.ageRating === '16+');

  const isUnderMaintenance =
    Boolean(siteSettings?.maintenanceMode) &&
    currentUser?.role !== 'admin' &&
    currentTab !== 'login' &&
    currentTab !== 'admin';

  return (
    <div className="min-h-screen bg-[#080A10] text-white flex flex-col font-sans selection:bg-[#1764F5] selection:text-white">
      {/* Dynamic Localized SEO Head Manager */}
      <SEOHead
        currentTab={currentTab}
        selectedMovie={selectedMovieForDetail}
        orderNumber={selectedOrderNumber}
      />

      {/* Sticky Top Streaming Navigation Bar */}
      {!(currentTab === 'admin' && currentUser?.role === 'admin') && (
        <Navbar
          currentTab={currentTab}
          setCurrentTab={updateTabAndUrl}
          currentUser={currentUser}
          subscription={subscription}
          onOpenDocs={() => setDocsModalOpen(true)}
          onOpenAuth={handleOpenAuth}
          onSignOut={handleSignOut}
          searchQuery={searchQuery}
          setSearchQuery={(q) => {
            setSearchQuery(q);
            if (q.trim() && currentTab !== 'movies') {
              updateTabAndUrl('movies');
            }
          }}
          selectedCategory={selectedCatalogueGenre}
          onSelectCategory={(cat) => {
            setSelectedCatalogueGenre(cat);
            setNavFilter('all');
            if (currentTab !== 'movies') {
              updateTabAndUrl('movies');
            }
          }}
          navFilter={navFilter}
          onSelectNavFilter={(filter) => {
            setNavFilter(filter);
            if (filter === 'all') {
              setSelectedCatalogueGenre('all');
            }
          }}
          hasAdultContent={hasAdultContent}
          movies={movies}
          onSelectMovie={(m) => handleSelectMovieWithAgeCheck(m)}
        />
      )}

      {/* Global Error Banner */}
      {appErrorBanner && (
        <div className="max-w-3xl mx-auto mt-4 px-4 py-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-4">
          <span>{appErrorBanner}</span>
          <button
            onClick={() => setAppErrorBanner(null)}
            className="text-rose-300 hover:text-white font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {isUnderMaintenance ? (
          <div className="max-w-lg mx-auto my-24 p-8 rounded-2xl bg-[#0f172a] border border-amber-500/30 text-center space-y-4">
            <h2 className="text-2xl font-black text-white">
              {locale === 'en' ? 'Scheduled Maintenance' : 'Системийн засвар үйлчилгээ'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {locale === 'en'
                ? 'SODON AI MOVIE is currently undergoing scheduled maintenance. Please check back shortly.'
                : 'SODON AI MOVIE платформ дээр түр хугацааны засвар үйлчилгээ хийгдэж байна. Түр хүлээгээд дахин хандана уу.'}
            </p>
            <button
              onClick={() => updateTabAndUrl('login')}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
            >
              {locale === 'en' ? 'Administrator Sign In' : 'Админ нэвтрэх'}
            </button>
          </div>
        ) : (
          <>
            {currentTab === 'home' && (
              <div>
                {/* Multi-Slide Hero Banner Carousel */}
                {heroMovie ? (
                  <HeroBanner
                    movie={heroMovie}
                    slides={heroSlides}
                    onPlay={(m) => handlePlayMovie(m, 0, 1)}
                    onSelect={(m) => setSelectedMovieForDetail(m)}
                    hasActiveSubscription={hasActiveSub}
                    subscription={subscription}
                    userRole={currentUser?.role}
                    isInList={myListIds.includes(heroMovie.id)}
                    myListIds={myListIds}
                    onToggleList={toggleMyList}
                  />
                ) : moviesLoading ? (
                  <div className="h-[60vh] flex flex-col items-center justify-center text-[#9CA3AF]">
                    <div className="w-10 h-10 border-2 border-[#1764F5] border-t-transparent rounded-full animate-spin mb-3" />
                    <span className="text-xs">
                      {locale === 'en' ? 'Loading streaming catalogue...' : 'Кино сан ачаалж байна...'}
                    </span>
                  </div>
                ) : null}

                {/* Homepage Streaming Sections (Part 4) */}
                <div className="relative z-20 space-y-2 pb-14">
                  {/* 1. Featured Mongolian Subtitled Showcase Box (Screenshot 1) */}
                  <MovieRow
                    variant="featured-box"
                    title={locale === 'en' ? 'Stories That Stay With You' : 'Сэтгэлд үлдэх түүхүүд'}
                    subtitle={
                      locale === 'en'
                        ? 'Best short dramas and full-length movies with Mongolian subtitles'
                        : 'Монгол хадмал орчуулгатай шилдэг богино драм болон бүрэн хэмжээний кинонууд'
                    }
                    movies={mongolianSubtitledMovies.length > 0 ? mongolianSubtitledMovies : movies}
                    hasActiveSubscription={hasActiveSub}
                    subscription={subscription}
                    userRole={currentUser?.role}
                    onPlay={(m) => handlePlayMovie(m, 0, 1)}
                    onSelect={(m) => setSelectedMovieForDetail(m)}
                    onOpenPricing={() => updateTabAndUrl('pricing')}
                    onViewAll={() => updateTabAndUrl('movies')}
                  />

                  {/* 2. Continue Watching Row */}
                  <ContinueWatchingRow
                    progressList={watchProgressList}
                    movies={movies}
                    hasActiveSubscription={hasActiveSub}
                    subscription={subscription}
                    userRole={currentUser?.role}
                    onResume={(m, initialTime) => handlePlayMovie(m, initialTime)}
                    onSelect={(m) => setSelectedMovieForDetail(m)}
                    onRemove={(movieId) => {
                      const updated = removeWatchProgress(movieId);
                      setWatchProgressList(updated);
                    }}
                    onOpenPricing={() => updateTabAndUrl('pricing')}
                  />

                  {/* 3. Олон ангит кино & Богино драм */}
                  {seriesAndShortDramas.length > 0 && (
                    <MovieRow
                      title={locale === 'en' ? 'TV Series & Short Dramas' : 'Олон ангит кино & Богино драм'}
                      subtitle={
                        locale === 'en'
                          ? 'Binge-worthy multi-episode series with free starting episodes'
                          : 'Эхний ангиуд нь үнэгүй, сонирхолтой олон ангит цуврал болон богино драмууд'
                      }
                      badgeText="ЦУВРАЛ"
                      movies={seriesAndShortDramas}
                      hasActiveSubscription={hasActiveSub}
                      subscription={subscription}
                      userRole={currentUser?.role}
                      onPlay={(m) => handlePlayMovie(m, 0, 1)}
                      onSelect={(m) => setSelectedMovieForDetail(m)}
                      onOpenPricing={() => updateTabAndUrl('pricing')}
                    />
                  )}

                  {/* 4. AI MOVIE Originals */}
                  <MovieRow
                    title="AI MOVIE Originals"
                    subtitle={
                      locale === 'en'
                        ? 'Exclusive original productions and featured premieres'
                        : 'Зөвхөн манай платформд зориулагдсан онцгой бүтээлүүд'
                    }
                    badgeText="ORIGINAL"
                    movies={originalMovies.length > 0 ? originalMovies : movies}
                    hasActiveSubscription={hasActiveSub}
                    subscription={subscription}
                    userRole={currentUser?.role}
                    onPlay={(m) => handlePlayMovie(m, 0, 1)}
                    onSelect={(m) => setSelectedMovieForDetail(m)}
                    onOpenPricing={() => updateTabAndUrl('pricing')}
                  />

                  {/* 5. Тренд болж буй кино */}
                  <MovieRow
                    title={locale === 'en' ? 'Trending Now' : 'Тренд болж буй кино'}
                    subtitle={tHome('trendingSub')}
                    movies={trendingMovies.length > 0 ? trendingMovies : movies}
                    hasActiveSubscription={hasActiveSub}
                    subscription={subscription}
                    userRole={currentUser?.role}
                    onPlay={(m) => handlePlayMovie(m, 0, 1)}
                    onSelect={(m) => setSelectedMovieForDetail(m)}
                    onOpenPricing={() => updateTabAndUrl('pricing')}
                  />

                  {/* 6. Шинээр нэмэгдсэн */}
                  {recentlyAddedMovies.length > 0 && (
                    <MovieRow
                      title={locale === 'en' ? 'Newly Added' : 'Шинээр нэмэгдсэн'}
                      subtitle={
                        locale === 'en'
                          ? 'Latest movies and episodes added to our catalogue'
                          : 'Кино санд хамгийн сүүлд нэмэгдсэн шинэ бүтээлүүд'
                      }
                      movies={recentlyAddedMovies}
                      hasActiveSubscription={hasActiveSub}
                      subscription={subscription}
                      userRole={currentUser?.role}
                      onPlay={(m) => handlePlayMovie(m, 0, 1)}
                      onSelect={(m) => setSelectedMovieForDetail(m)}
                      onOpenPricing={() => updateTabAndUrl('pricing')}
                    />
                  )}

                  {/* 7. Хамгийн өндөр үнэлгээтэй */}
                  <MovieRow
                    title={locale === 'en' ? 'Highest Rated' : 'Хамгийн өндөр үнэлгээтэй'}
                    subtitle={tHome('top10Sub')}
                    movies={top10Movies}
                    hasActiveSubscription={hasActiveSub}
                    subscription={subscription}
                    userRole={currentUser?.role}
                    onPlay={(m) => handlePlayMovie(m, 0, 1)}
                    onSelect={(m) => setSelectedMovieForDetail(m)}
                    onOpenPricing={() => updateTabAndUrl('pricing')}
                  />

                  {/* 8. Үнэгүй кино & Эхний анги үнэгүй */}
                  {freeAndFreeEpisodeMovies.length > 0 && (
                    <MovieRow
                      title={locale === 'en' ? 'Free to Watch' : 'Үнэгүй кино'}
                      subtitle={
                        locale === 'en'
                          ? 'Movies and series with free episodes ready to stream immediately'
                          : 'Шууд үнэгүй үзэх боломжтой кино болон эхний анги нь үнэгүй цувралууд'
                      }
                      movies={freeAndFreeEpisodeMovies}
                      hasActiveSubscription={hasActiveSub}
                      subscription={subscription}
                      userRole={currentUser?.role}
                      onPlay={(m) => handlePlayMovie(m, 0, 1)}
                      onSelect={(m) => setSelectedMovieForDetail(m)}
                      onOpenPricing={() => updateTabAndUrl('pricing')}
                    />
                  )}
                </div>

                {/* Streamline Showcase: Device Preview, Stats Bar, and FAQ */}
                <StreamlineShowcase />
              </div>
            )}

            {currentTab === 'movies' && (
              <MovieCatalogueView
                movies={movies}
                loading={moviesLoading}
                error={moviesError}
                onRefresh={() => fetchPublicMovies()}
                onPlay={(m) => handlePlayMovie(m, 0, 1)}
                onSelect={(m) => handleSelectMovieWithAgeCheck(m)}
                hasActiveSubscription={hasActiveSub}
                subscription={subscription}
                userRole={currentUser?.role}
                onOpenPricing={() => updateTabAndUrl('pricing')}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                externalGenre={selectedCatalogueGenre}
                onExternalGenreChange={setSelectedCatalogueGenre}
                navFilter={navFilter}
                onClearNavFilter={() => setNavFilter('all')}
                myListIds={myListIds}
                onToggleMyList={toggleMyList}
              />
            )}

            {currentTab === 'originals' && (
              <OriginalsView
                movies={movies}
                onSelectMovie={(m) => handleSelectMovieWithAgeCheck(m)}
                onPlayMovie={(m) => handlePlayMovie(m, 0, 1)}
              />
            )}

            {currentTab === 'hot' && (
              <HotPlusView
                movies={movies}
                onSelectMovie={(m) => handleSelectMovieWithAgeCheck(m)}
                onPlayMovie={(m) => handlePlayMovie(m, 0, 1)}
              />
            )}

            {currentTab === 'pricing' && (
              <PricingView
                currentSubscription={subscription}
                onSelectPlan={handleSelectPlan}
                loadingPlanId={loadingPlanId}
              />
            )}

            {currentTab === 'checkout' && (
              <CheckoutView
                orderNumber={selectedOrderNumber}
                onBack={() => updateTabAndUrl('pricing')}
                onPaymentConfirmed={handlePaymentConfirmed}
              />
            )}

            {currentTab === 'payment-success' && (
              <PaymentSuccessView
                orderNumber={selectedOrderNumber}
                onGoToHome={() => updateTabAndUrl('home')}
                onGoToSubscription={() => updateTabAndUrl('subscription')}
              />
            )}

            {currentTab === 'payment-cancel' && (
              <PaymentCancelView
                orderNumber={selectedOrderNumber}
                onRetry={() => updateTabAndUrl('pricing')}
                onGoHome={() => updateTabAndUrl('home')}
              />
            )}

            {currentTab === 'subscription' && (
              currentUser ? (
                <SubscriptionView
                  subscription={subscription}
                  user={currentUser}
                  onUpgradeOrRenew={() => updateTabAndUrl('pricing')}
                  onGoToHistory={() => updateTabAndUrl('payments')}
                />
              ) : (
                <div className="max-w-md mx-auto my-20 p-8 rounded-2xl bg-[#0f172a] border border-white/10 text-center space-y-4">
                  <h3 className="text-xl font-bold text-white">
                    {locale === 'en' ? 'Sign in to view subscription' : 'Гишүүнчлэлээ харахын тулд нэвтэрнэ үү'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {locale === 'en'
                      ? 'Access your active membership, expiration date, and benefits.'
                      : 'Өөрийн идэвхтэй эрх, дуусах хугацаа болон давуу талуудаа шалгана уу.'}
                  </p>
                  <button
                    onClick={() => handleOpenAuth('signin')}
                    className="px-6 py-2.5 bg-[#e5a93c] hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    {locale === 'en' ? 'Sign In Now' : 'Одоо нэвтрэх'}
                  </button>
                </div>
              )
            )}

            {currentTab === 'payments' && (
              currentUser ? (
                <PaymentHistoryView onRenewPlan={() => updateTabAndUrl('pricing')} />
              ) : (
                <div className="max-w-md mx-auto my-20 p-8 rounded-2xl bg-[#0f172a] border border-white/10 text-center space-y-4">
                  <h3 className="text-xl font-bold text-white">
                    {locale === 'en' ? 'Sign in to view payment history' : 'Төлбөрийн түүхээ харахын тулд нэвтэрнэ үү'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {locale === 'en'
                      ? 'View all your past Wire.mn QPay and Khan Bank transactions.'
                      : 'Wire.mn QPay болон Хаан банкны өмнөх бүх гүйлгээгээ харна уу.'}
                  </p>
                  <button
                    onClick={() => handleOpenAuth('signin')}
                    className="px-6 py-2.5 bg-[#e5a93c] hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    {locale === 'en' ? 'Sign In Now' : 'Одоо нэвтрэх'}
                  </button>
                </div>
              )
            )}

            {currentTab === 'login' && (
              <LoginPage
                onSuccess={handleLoginSuccess}
                onNavigateToRegister={() => updateTabAndUrl('register')}
                onNavigateToHome={() => updateTabAndUrl('home')}
                initialMessage={loginBannerMessage}
              />
            )}

            {currentTab === 'register' && (
              <RegisterPage
                onSuccess={handleLoginSuccess}
                onNavigateToLogin={() => {
                  setLoginBannerMessage(null);
                  updateTabAndUrl('login');
                }}
                onNavigateToHome={() => updateTabAndUrl('home')}
              />
            )}

            {currentTab === 'reset-password' && (
              <ResetPasswordPage
                onNavigateToLogin={() => updateTabAndUrl('login')}
                onNavigateToHome={() => updateTabAndUrl('home')}
              />
            )}

            {currentTab === 'account' && (
              currentUser ? (
                <ProfilePage
                  user={currentUser}
                  subscription={subscription}
                  onSignOut={handleSignOut}
                  onNavigateToPricing={() => updateTabAndUrl('pricing')}
                  onNavigateToAdmin={() => updateTabAndUrl('admin')}
                  onUserUpdated={(updated) => {
                    setCurrentUser(updated);
                    fetchUserAndSubscription();
                  }}
                />
              ) : (
                <div className="max-w-md mx-auto my-20 p-8 rounded-2xl bg-[#0f172a] border border-white/10 text-center space-y-4">
                  <h3 className="text-xl font-bold text-white">
                    {locale === 'en' ? 'Sign in to view account' : 'Хувийн хуудсаа харахын тулд нэвтэрнэ үү'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {locale === 'en'
                      ? 'Manage your personal profile, update password, and view subscription details.'
                      : 'Хувийн мэдээллээ шинэчлэх, нууц үгээ солих болон гишүүнчлэлээ удирдахын тулд нэвтэрнэ үү.'}
                  </p>
                  <button
                    onClick={() => updateTabAndUrl('login')}
                    className="px-6 py-2.5 bg-[#e5a93c] hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    {locale === 'en' ? 'Sign In Now' : 'Одоо нэвтрэх'}
                  </button>
                </div>
              )
            )}

            {currentTab === 'watch-history' && (
              <WatchHistoryView
                historyList={watchHistoryList}
                movies={movies}
                onPlayMovie={(m) => handlePlayMovie(m, 0)}
                onSelectMovie={(m) => setSelectedMovieForDetail(m)}
                onRemoveItem={(movieId) => {
                  const updated = removeWatchHistoryItem(movieId);
                  setWatchHistoryList(updated);
                }}
                onClearAll={() => {
                  clearWatchHistory();
                  setWatchHistoryList([]);
                }}
                onBrowseMovies={() => updateTabAndUrl('movies')}
              />
            )}

            {currentTab === 'admin' && (
              currentUser && currentUser.role === 'admin' ? (
                <AdminPanel
                  currentUser={currentUser}
                  onBackToHome={() => updateTabAndUrl('home')}
                  onSignOut={handleSignOut}
                />
              ) : (
                <div className="max-w-md mx-auto my-24 p-8 rounded-2xl bg-[#0f172a] border border-rose-500/30 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
                    !
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {locale === 'en' ? 'Administrator Access Required' : 'Администраторын эрх шаардлагатай'}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {locale === 'en'
                      ? 'This area is restricted to administrators only. Please sign in with an authorized admin account.'
                      : 'Энэ хэсэгт зөвхөн админ эрхтэй хэрэглэгч нэвтрэх боломжтой. Админ хаягаар нэвтэрнэ үү.'}
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => updateTabAndUrl('login')}
                      className="px-5 py-2.5 bg-[#e50914] hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-rose-950/50"
                    >
                      {locale === 'en' ? 'Sign In as Admin' : 'Админаар нэвтрэх'}
                    </button>
                    <button
                      onClick={() => updateTabAndUrl('home')}
                      className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-xl transition cursor-pointer"
                    >
                      {locale === 'en' ? 'Back to Home' : 'Нүүр хуудас'}
                    </button>
                  </div>
                </div>
              )
            )}
          </>
        )}
      </main>

      {/* Movie & Series Details Page Modal */}
      {selectedMovieForDetail && (
        <MovieDetailModal
          movie={selectedMovieForDetail}
          onClose={() => setSelectedMovieForDetail(null)}
          onPlay={(m, episodeNumber) => {
            setSelectedMovieForDetail(null);
            handlePlayMovie(m, 0, episodeNumber || 1);
          }}
          onWatchTrailer={(m, trailerUrl) => {
            handleWatchTrailer(m, trailerUrl);
          }}
          hasActiveSubscription={hasActiveSub}
          subscription={subscription}
          userRole={currentUser?.role}
          currentUser={currentUser}
          onOpenAuth={() => handleOpenAuth('signin')}
          onOpenPricing={() => {
            setSelectedMovieForDetail(null);
            updateTabAndUrl('pricing');
          }}
          isInList={myListIds.includes(selectedMovieForDetail.id)}
          onToggleList={toggleMyList}
        />
      )}

      {/* Split-Screen Video Player & Episode Selection Modal */}
      <MoviePlayerModal
        movie={activeMovieForPlayer}
        initialTime={playerInitialTime}
        initialEpisodeNumber={playingEpisodeNumber}
        isTrailer={isPlayingTrailer}
        trailerUrl={activePlayerTrailerUrl}
        onPlayFullMovie={(m) => {
          handlePlayMovie(m, 0, playingEpisodeNumber);
        }}
        onClose={() => {
          setActiveMovieForPlayer(null);
          setActivePlayerTrailerUrl(null);
          setIsPlayingTrailer(false);
          setPlayerInitialTime(0);
          setWatchProgressList(getWatchProgressList());
          setWatchHistoryList(getWatchHistoryList());
        }}
        onProgressUpdate={() => {
          setWatchProgressList(getWatchProgressList());
          setWatchHistoryList(getWatchHistoryList());
        }}
        onGoToPricing={() => {
          setActiveMovieForPlayer(null);
          setActivePlayerTrailerUrl(null);
          setIsPlayingTrailer(false);
          setPlayerInitialTime(0);
          updateTabAndUrl('pricing');
        }}
        hasActiveSubscription={hasActiveSub}
        currentUser={currentUser}
        onOpenAuth={() => handleOpenAuth('signin')}
      />

      {/* Wire & QPay Documentation Guide Modal */}
      <WireDocsGuideModal isOpen={docsModalOpen} onClose={() => setDocsModalOpen(false)} />

      {/* User Authentication Modal (Sign In & Sign Up) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        initialMode={authModalMode}
      />

      {/* Mandatory 18+ Age Verification Modal for Hot+ / 18+ Restricted Content */}
      <AgeVerificationModal
        isOpen={ageGateOpen}
        isSubmitting={ageGateSubmitting}
        onConfirm={handleConfirmAgeVerification}
        onDecline={handleDeclineAgeVerification}
      />

      {/* Non-Intrusive Bottom-Right Toast Notifications for My List */}
      <ToastContainer toasts={myListToasts} onDismiss={dismissToast} />

      {/* Streamline Cinema Footer */}
      {!(currentTab === 'admin' && currentUser?.role === 'admin') && (
        <Footer
          onNavClick={updateTabAndUrl}
          onOpenDocs={() => setDocsModalOpen(true)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
