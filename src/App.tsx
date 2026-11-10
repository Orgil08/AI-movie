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
import { ProfilePage } from './components/ProfilePage.js';
import { AdminPanel } from './components/AdminPanel.js';
import { WatchProgress, getWatchProgressList, removeWatchProgress, getWatchProgressForMovie } from './utils/watchProgress.js';
import { MOVIES, Movie } from './data/movies.js';

function AppContent() {
  const { locale, setLocale } = useLocale();
  const tHome = useTranslations('HomePage');

  const [currentTab, setCurrentTab] = useState<string>('home');
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role?: 'user' | 'admin' } | null>(null);
  const [loginBannerMessage, setLoginBannerMessage] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [activeMovieForPlayer, setActiveMovieForPlayer] = useState<Movie | null>(null);
  const [playerInitialTime, setPlayerInitialTime] = useState<number>(0);
  const [selectedMovieForDetail, setSelectedMovieForDetail] = useState<Movie | null>(null);
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

  // Initial URL parsing
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
      const match = MOVIES.find((m) => m.id === slug);
      if (match) {
        setSelectedMovieForDetail(match);
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
  }, []);

  // Update browser URL state whenever currentTab or locale changes
  const updateTabAndUrl = (newTab: string) => {
    setCurrentTab(newTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    let cleanPath = '/';
    if (newTab === 'movies') cleanPath = '/movies';
    else if (newTab === 'pricing') cleanPath = '/pricing';
    else if (newTab === 'subscription') cleanPath = '/account/subscription';
    else if (newTab === 'payments') cleanPath = '/account/payments';
    else if (newTab === 'account') cleanPath = '/account';
    else if (newTab === 'login') cleanPath = '/login';
    else if (newTab === 'register') cleanPath = '/register';
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
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, paymentMethod: paymentMethod || 'wire_qpay' })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || (locale === 'en' ? 'Failed to create payment order' : 'Захиалга үүсгэхэд алдаа гарлаа'));
        return;
      }

      setSelectedOrderNumber(data.orderNumber);
      updateTabAndUrl('checkout');
    } catch (err: any) {
      alert(err.message || 'Network error');
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

  // Featured movie and categories
  const featuredMovie = MOVIES[0];
  const trendingMovies = MOVIES.filter((m) => m.trending);
  const top10Movies = MOVIES.slice(0, 4);
  const sciFiMovies = MOVIES.filter(
    (m) => m.genreMn.includes('Уран Зөгнөлт') || m.genreMn.includes('Sci-Fi')
  );

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

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <div>
            {/* Streamline Cinematic Hero Banner */}
            <HeroBanner
              movie={featuredMovie}
              onPlay={(m) => handlePlayMovie(m)}
              onSelect={(m) => setSelectedMovieForDetail(m)}
              hasActiveSubscription={hasActiveSub}
            />

            {/* Movie Category Grids */}
            <div className="-mt-10 relative z-20 space-y-4 pb-12">
              {/* Continue Watching Row (Partially watched movies) */}
              <ContinueWatchingRow
                progressList={watchProgressList}
                hasActiveSubscription={hasActiveSub}
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
                movies={trendingMovies}
                hasActiveSubscription={hasActiveSub}
                onPlay={(m) => handlePlayMovie(m)}
                onSelect={(m) => setSelectedMovieForDetail(m)}
                onOpenPricing={() => updateTabAndUrl('pricing')}
              />

              <MovieRow
                title={tHome('top10')}
                subtitle={tHome('top10Sub')}
                movies={top10Movies}
                hasActiveSubscription={hasActiveSub}
                onPlay={(m) => handlePlayMovie(m)}
                onSelect={(m) => setSelectedMovieForDetail(m)}
                onOpenPricing={() => updateTabAndUrl('pricing')}
              />

              <MovieRow
                title={tHome('sciFiCategory')}
                subtitle={locale === 'en' ? 'Futuristic realities, quantum consciousness, and neural synthetics' : 'Ирээдүйн ертөнц, квант технологи, хиймэл оюун'}
                movies={sciFiMovies}
                hasActiveSubscription={hasActiveSub}
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
            onPlay={(m) => handlePlayMovie(m)}
            onSelect={(m) => setSelectedMovieForDetail(m)}
            hasActiveSubscription={hasActiveSub}
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
