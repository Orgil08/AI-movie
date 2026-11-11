import React, { useEffect, useState } from 'react';
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
import { WatchProgress, getWatchProgressList, removeWatchProgress, getWatchProgressForMovie } from './utils/watchProgress.js';
import { Movie } from './data/movies.js';

function AppContent() {
  const { locale, setLocale } = useLocale();
  const tHome = useTranslations('HomePage');

  const [currentTab, setCurrentTab] = useState<string>('home');
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role?: 'user' | 'admin' } | null>(null);
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
  const [selectedMovieForDetail, setSelectedMovieForDetail] = useState<Movie | null>(null);
  const [pendingMovieSlugFromUrl, setPendingMovieSlugFromUrl] = useState<string | null>(null);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string>('');
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [myListIds, setMyListIds] = useState<string[]>(['ai-nomad-2099', 'quantum-shaman']);
  const [watchProgressList, setWatchProgressList] = useState<WatchProgress[]>(() => getWatchProgressList());

  const handlePlayMovie = (movie: Movie, initialTime?: number) => {
    let time = initialTime;
    if (time === undefined) {
      const existing = getWatchProgressForMovie(movie.id);
      time = existing ? existing.currentTime : 0;
    }
    setPlayerInitialTime(time);
    setActiveMovieForPlayer(movie);
  };

  // Authentication Modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [pendingPlanAfterAuth, setPendingPlanAfterAuth] = useState<{
    planId: string;
    paymentMethod?: 'wire_qpay' | 'bank_transfer';
  } | null>(null);

  const fetchPublicMovies = async () => {
    setMoviesLoading(true);
    setMoviesError(null);
    try {
      const res = await fetch('/api/movies');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load movies from database');
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

  // Initial URL parsing & data fetch
  useEffect(() => {
    const { pathname, search } = window.location;
    const pathLocale = getLocaleFromPath(pathname);
    if (pathLocale && pathLocale !== locale) {
      setLocale(pathLocale);
    }

    const cleanPath = stripLocaleFromPath(pathname);
    const params = new URLSearchParams(search);
    const orderParam = params.get('order');

    if (cleanPath.startsWith('/payment/success') || params.get('status') === 'success') {
      if (orderParam) setSelectedOrderNumber(orderParam);
      setCurrentTab('payment-success');
    } else if (cleanPath.startsWith('/payment/cancel') || params.get('status') === 'cancel') {
      if (orderParam) setSelectedOrderNumber(orderParam);
      setCurrentTab('payment-cancel');
    } else if (cleanPath.startsWith('/pricing')) {
      setCurrentTab('pricing');
    } else if (cleanPath.startsWith('/movies')) {
      setCurrentTab('movies');
    } else if (cleanPath.startsWith('/login')) {
      setCurrentTab('login');
    } else if (cleanPath.startsWith('/register')) {
      setCurrentTab('register');
    } else if (cleanPath.startsWith('/reset-password')) {
      setCurrentTab('reset-password');
    } else if (cleanPath.startsWith('/admin')) {
      setCurrentTab('admin');
    } else if (cleanPath.startsWith('/account/subscription') || cleanPath.startsWith('/subscription')) {
      setCurrentTab('subscription');
    } else if (cleanPath.startsWith('/account/payments') || cleanPath.startsWith('/payments')) {
      setCurrentTab('payments');
    } else if (cleanPath.startsWith('/account') || cleanPath.startsWith('/profile')) {
      setCurrentTab('account');
    } else if (cleanPath.startsWith('/movie/')) {
      const slug = cleanPath.replace('/movie/', '').split('/')[0];
      if (slug) {
        setPendingMovieSlugFromUrl(slug);
      }
    } else if (cleanPath.startsWith('/checkout') || orderParam) {
      if (orderParam) setSelectedOrderNumber(orderParam);
      else {
        const orderId = cleanPath.replace('/checkout/', '').split('/')[0];
        if (orderId && orderId !== 'checkout') setSelectedOrderNumber(orderId);
      }
      setCurrentTab('checkout');
    }

    fetchUserAndSubscription();
    fetchPublicMovies();
    fetchPublicSettings();
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
  const updateTabAndUrl = (newTab: string) => {
    setCurrentTab(newTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (newTab === 'home' || newTab === 'movies') {
      fetchPublicMovies();
      fetchPublicSettings();
    }

    let cleanPath = '/';
    if (newTab === 'movies') cleanPath = '/movies';
    else if (newTab === 'pricing') cleanPath = '/pricing';
    else if (newTab === 'subscription') cleanPath = '/account/subscription';
    else if (newTab === 'payments') cleanPath = '/account/payments';
    else if (newTab === 'account') cleanPath = '/account';
    else if (newTab === 'login') cleanPath = '/login';
    else if (newTab === 'register') cleanPath = '/register';
    else if (newTab === 'reset-password') cleanPath = '/reset-password';
    else if (newTab === 'admin') cleanPath = '/admin';
    else if (newTab === 'checkout' && selectedOrderNumber) cleanPath = `/checkout/${selectedOrderNumber}`;
    else if (newTab === 'payment-success' && selectedOrderNumber) cleanPath = `/payment/success?order=${selectedOrderNumber}`;

    const newUrl = buildLocalizedPath(cleanPath, locale);
    window.history.pushState({ tab: newTab, locale }, '', newUrl);
  };

  const fetchUserAndSubscription = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user || null);
        setSubscription(data.subscription || null);
      }
    } catch (err) {
      console.warn('Could not fetch user/subscription context', err);
    }
  };

  const handleSignOut = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ai_movie_uid');
      }
      await fetch('/api/auth/logout', { method: 'POST' });
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

  const handleLoginSuccess = async (user: { id: string; name: string; email: string; role?: 'user' | 'admin' }) => {
    if (typeof window !== 'undefined' && user?.id) {
      localStorage.setItem('ai_movie_uid', user.id);
    }
    setCurrentUser(user);
    setLoginBannerMessage(null);
    await fetchUserAndSubscription();

    // Login redirection rule:
    // IF user.role === "admin": Redirect to /admin
    // IF user.role === "user": Redirect to homepage or requested protected page
    if (user.role === 'admin') {
      updateTabAndUrl('admin');
    } else if (pendingPlanAfterAuth) {
      const { planId, paymentMethod } = pendingPlanAfterAuth;
      setPendingPlanAfterAuth(null);
      handleSelectPlan(planId, paymentMethod);
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

  const handleSelectPlan = async (planId: string, paymentMethod?: 'wire_qpay' | 'bank_transfer') => {
    // If not signed in, prompt authentication first
    if (!currentUser) {
      setPendingPlanAfterAuth({ planId, paymentMethod });
      setAuthModalMode('signin');
      setAuthModalOpen(true);
      return;
    }

    setLoadingPlanId(planId);
    setAppErrorBanner(null);
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, paymentMethod: paymentMethod || 'wire_qpay' })
      });

      const data = await res.json();
      if (!res.ok) {
        setAppErrorBanner(data.message || (locale === 'en' ? 'Failed to create payment order' : 'Захиалга үүсгэхэд алдаа гарлаа'));
        return;
      }

      setSelectedOrderNumber(data.orderNumber);
      updateTabAndUrl('checkout');
    } catch (err: any) {
      setAppErrorBanner(err.message || 'Network error');
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handlePaymentConfirmed = (orderNumber: string) => {
    setSelectedOrderNumber(orderNumber);
    fetchUserAndSubscription();
    updateTabAndUrl('payment-success');
  };

  const toggleMyList = (movie: Movie) => {
    setMyListIds((prev) =>
      prev.includes(movie.id) ? prev.filter((id) => id !== movie.id) : [...prev, movie.id]
    );
  };

  const hasActiveSub = Boolean(subscription && subscription.status === 'ACTIVE');

  // MongoDB-backed homepage movie sections (Phase 2)
  const featuredMovies = movies.filter((m) => m.featured);
  const heroMovie =
    (siteSettings?.featuredMovieId
      ? movies.find((m) => m.id === siteSettings.featuredMovieId || m.slug === siteSettings.featuredMovieId)
      : null) ||
    featuredMovies[0] ||
    movies[0] ||
    null;

  const trendingMovies = movies.filter((m) => m.trending || m.featured);
  const top10Movies = [...movies]
    .sort((a, b) => parseFloat(b.rating || '0') - parseFloat(a.rating || '0'))
    .slice(0, 10);
  const recentlyAddedMovies = [...movies].slice(0, 8);
  const sciFiMovies = movies.filter(
    (m) =>
      (m.genres || []).some(
        (g) => g.toLowerCase().includes('sci-fi') || g.includes('Уран') || g.toLowerCase().includes('scifi')
      ) ||
      (m.genreMn || '').includes('Уран Зөгнөлт') ||
      (m.genreMn || '').includes('Sci-Fi')
  );

  const announcementText =
    locale === 'en'
      ? siteSettings?.announcementEn || siteSettings?.announcementMn
      : siteSettings?.announcementMn || siteSettings?.announcementEn;

  const isUnderMaintenance =
    Boolean(siteSettings?.maintenanceMode) &&
    currentUser?.role !== 'admin' &&
    currentTab !== 'login' &&
    currentTab !== 'admin';

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col font-sans selection:bg-[#e5a93c] selection:text-black">
      {/* Dynamic Localized SEO Head Manager */}
      <SEOHead
        currentTab={currentTab}
        selectedMovie={selectedMovieForDetail}
        orderNumber={selectedOrderNumber}
      />

      {/* Streamline Navigation Bar */}
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
        />
      )}

      {/* Homepage Announcement Banner from WebsiteSettings */}
      {announcementText && currentTab === 'home' && (
        <div className="bg-gradient-to-r from-[#e50914]/90 via-amber-600/90 to-[#e50914]/90 text-white text-xs font-bold py-2 px-4 text-center shadow-md">
          {announcementText}
        </div>
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
                {/* Streamline Cinematic Hero Banner */}
                {heroMovie ? (
                  <HeroBanner
                    movie={heroMovie}
                    onPlay={(m) => handlePlayMovie(m)}
                    onSelect={(m) => setSelectedMovieForDetail(m)}
                    hasActiveSubscription={hasActiveSub}
                    subscription={subscription}
                    userRole={currentUser?.role}
                  />
                ) : moviesLoading ? (
                  <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400">
                    <div className="w-10 h-10 border-2 border-[#e5a93c] border-t-transparent rounded-full animate-spin mb-3" />
                    <span className="text-xs">
                      {locale === 'en' ? 'Loading 4K cinema catalogue...' : 'Кино сан ачаалж байна...'}
                    </span>
                  </div>
                ) : null}

                {/* Movie Category Grids */}
                <div className="-mt-10 relative z-20 space-y-4 pb-12">
                  {/* Continue Watching Row (Partially watched movies) */}
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

                  <MovieRow
                    title={tHome('trending')}
                    subtitle={tHome('trendingSub')}
                    movies={trendingMovies.length > 0 ? trendingMovies : movies}
                    hasActiveSubscription={hasActiveSub}
                    subscription={subscription}
                    userRole={currentUser?.role}
                    onPlay={(m) => handlePlayMovie(m)}
                    onSelect={(m) => setSelectedMovieForDetail(m)}
                    onOpenPricing={() => updateTabAndUrl('pricing')}
                  />

                  <MovieRow
                    title={tHome('top10')}
                    subtitle={tHome('top10Sub')}
                    movies={top10Movies}
                    hasActiveSubscription={hasActiveSub}
                    subscription={subscription}
                    userRole={currentUser?.role}
                    onPlay={(m) => handlePlayMovie(m)}
                    onSelect={(m) => setSelectedMovieForDetail(m)}
                    onOpenPricing={() => updateTabAndUrl('pricing')}
                  />

                  {featuredMovies.length > 0 && (
                    <MovieRow
                      title={locale === 'en' ? 'Featured Movies' : 'Онцлох Кинонууд'}
                      subtitle={
                        locale === 'en'
                          ? 'Hand-picked 4K AI cinema premieres'
                          : 'Редакцийн онцолсон шилдэг 4K бүтээлүүд'
                      }
                      movies={featuredMovies}
                      hasActiveSubscription={hasActiveSub}
                      subscription={subscription}
                      userRole={currentUser?.role}
                      onPlay={(m) => handlePlayMovie(m)}
                      onSelect={(m) => setSelectedMovieForDetail(m)}
                      onOpenPricing={() => updateTabAndUrl('pricing')}
                    />
                  )}

                  {recentlyAddedMovies.length > 0 && (
                    <MovieRow
                      title={locale === 'en' ? 'Recently Added Movies' : 'Шинээр Нэмэгдсэн Кинонууд'}
                      subtitle={
                        locale === 'en'
                          ? 'Latest releases added to our MongoDB catalogue'
                          : 'Кино санд хамгийн сүүлд нэмэгдсэн шинэ бүтээлүүд'
                      }
                      movies={recentlyAddedMovies}
                      hasActiveSubscription={hasActiveSub}
                      subscription={subscription}
                      userRole={currentUser?.role}
                      onPlay={(m) => handlePlayMovie(m)}
                      onSelect={(m) => setSelectedMovieForDetail(m)}
                      onOpenPricing={() => updateTabAndUrl('pricing')}
                    />
                  )}

                  <MovieRow
                    title={tHome('sciFiCategory')}
                    subtitle={
                      locale === 'en'
                        ? 'Futuristic realities, quantum consciousness, and neural synthetics'
                        : 'Ирээдүйн ертөнц, квант технологи, хиймэл оюун'
                    }
                    movies={sciFiMovies}
                    hasActiveSubscription={hasActiveSub}
                    subscription={subscription}
                    userRole={currentUser?.role}
                    onPlay={(m) => handlePlayMovie(m)}
                    onSelect={(m) => setSelectedMovieForDetail(m)}
                    onOpenPricing={() => updateTabAndUrl('pricing')}
                  />
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
                onRefresh={fetchPublicMovies}
                onPlay={(m) => handlePlayMovie(m)}
                onSelect={(m) => setSelectedMovieForDetail(m)}
                hasActiveSubscription={hasActiveSub}
                subscription={subscription}
                userRole={currentUser?.role}
                onOpenPricing={() => updateTabAndUrl('pricing')}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
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

      {/* Streamline Title Detail Modal */}
      {selectedMovieForDetail && (
        <MovieDetailModal
          movie={selectedMovieForDetail}
          onClose={() => setSelectedMovieForDetail(null)}
          onPlay={(m) => {
            setSelectedMovieForDetail(null);
            handlePlayMovie(m);
          }}
          hasActiveSubscription={hasActiveSub}
          subscription={subscription}
          userRole={currentUser?.role}
          onOpenPricing={() => {
            setSelectedMovieForDetail(null);
            updateTabAndUrl('pricing');
          }}
          isInList={myListIds.includes(selectedMovieForDetail.id)}
          onToggleList={toggleMyList}
        />
      )}

      {/* Movie Player & Access Control Modal */}
      <MoviePlayerModal
        movie={activeMovieForPlayer}
        initialTime={playerInitialTime}
        onClose={() => {
          setActiveMovieForPlayer(null);
          setPlayerInitialTime(0);
          setWatchProgressList(getWatchProgressList());
        }}
        onProgressUpdate={() => {
          setWatchProgressList(getWatchProgressList());
        }}
        onGoToPricing={() => {
          setActiveMovieForPlayer(null);
          setPlayerInitialTime(0);
          updateTabAndUrl('pricing');
        }}
        hasActiveSubscription={hasActiveSub}
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
