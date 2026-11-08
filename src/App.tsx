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
import { MOVIES, Movie } from './data/movies.js';

function AppContent() {
  const { locale, setLocale } = useLocale();
  const tHome = useTranslations('HomePage');

  const [currentTab, setCurrentTab] = useState<string>('home');
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [activeMovieForPlayer, setActiveMovieForPlayer] = useState<Movie | null>(null);
  const [selectedMovieForDetail, setSelectedMovieForDetail] = useState<Movie | null>(null);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string>('');
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [myListIds, setMyListIds] = useState<string[]>(['ai-nomad-2099', 'quantum-shaman']);

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
    } else if (cleanPath.startsWith('/account/subscription') || cleanPath.startsWith('/subscription')) {
      setCurrentTab('subscription');
    } else if (cleanPath.startsWith('/account/payments') || cleanPath.startsWith('/payments')) {
      setCurrentTab('payments');
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
    else if (newTab === 'checkout' && selectedOrderNumber) cleanPath = `/checkout/${selectedOrderNumber}`;
    else if (newTab === 'payment-success' && selectedOrderNumber) cleanPath = `/payment/success?order=${selectedOrderNumber}`;

    const newUrl = buildLocalizedPath(cleanPath, locale);
    window.history.pushState({ tab: newTab, locale }, '', newUrl);
  };

  const fetchUserAndSubscription = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user || null);
        setSubscription(data.subscription || null);
      }
    } catch (err) {
      console.warn('Could not fetch user/subscription context', err);
    }
  };

  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        await fetchUserAndSubscription();
      }
    } catch (err) {
      console.error('Failed to switch user', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      setSubscription(null);
      if (currentTab === 'subscription' || currentTab === 'payments') {
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

  const handleAuthSuccess = async (user: { id: string; name: string; email: string }) => {
    setCurrentUser(user);
    await fetchUserAndSubscription();

    // If there was an attempted subscription before signing in, resume it now
    if (pendingPlanAfterAuth) {
      const { planId, paymentMethod } = pendingPlanAfterAuth;
      setPendingPlanAfterAuth(null);
      handleSelectPlan(planId, paymentMethod);
    }
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
      <Navbar
        currentTab={currentTab}
        setCurrentTab={updateTabAndUrl}
        currentUser={currentUser}
        subscription={subscription}
        onSwitchUser={handleSwitchUser}
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

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <div>
            {/* Streamline Cinematic Hero Banner */}
            <HeroBanner
              movie={featuredMovie}
              onPlay={(m) => setActiveMovieForPlayer(m)}
              onSelect={(m) => setSelectedMovieForDetail(m)}
              hasActiveSubscription={hasActiveSub}
            />

            {/* Movie Category Grids */}
            <div className="-mt-10 relative z-20 space-y-4 pb-12">
              <MovieRow
                title={tHome('trending')}
                subtitle={tHome('trendingSub')}
                movies={trendingMovies}
                hasActiveSubscription={hasActiveSub}
                onPlay={(m) => setActiveMovieForPlayer(m)}
                onSelect={(m) => setSelectedMovieForDetail(m)}
                onOpenPricing={() => updateTabAndUrl('pricing')}
              />

              <MovieRow
                title={tHome('top10')}
                subtitle={tHome('top10Sub')}
                movies={top10Movies}
                hasActiveSubscription={hasActiveSub}
                onPlay={(m) => setActiveMovieForPlayer(m)}
                onSelect={(m) => setSelectedMovieForDetail(m)}
                onOpenPricing={() => updateTabAndUrl('pricing')}
              />

              <MovieRow
                title={tHome('sciFiCategory')}
                subtitle={locale === 'en' ? 'Futuristic realities, quantum consciousness, and neural synthetics' : 'Ирээдүйн ертөнц, квант технологи, хиймэл оюун'}
                movies={sciFiMovies}
                hasActiveSubscription={hasActiveSub}
                onPlay={(m) => setActiveMovieForPlayer(m)}
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
            onPlay={(m) => setActiveMovieForPlayer(m)}
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
      </main>

      {/* Streamline Title Detail Modal */}
      {selectedMovieForDetail && (
        <MovieDetailModal
          movie={selectedMovieForDetail}
          onClose={() => setSelectedMovieForDetail(null)}
          onPlay={(m) => {
            setSelectedMovieForDetail(null);
            setActiveMovieForPlayer(m);
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
        onClose={() => setActiveMovieForPlayer(null)}
        onGoToPricing={() => {
          setActiveMovieForPlayer(null);
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
      <Footer
        onNavClick={updateTabAndUrl}
        onOpenDocs={() => setDocsModalOpen(true)}
      />
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
