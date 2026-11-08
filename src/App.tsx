import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar.js';
import { HeroBanner } from './components/HeroBanner.js';
import { MovieRow } from './components/MovieRow.js';
import { MoviePlayerModal } from './components/MoviePlayerModal.js';
import { PricingView } from './components/PricingView.js';
import { CheckoutView } from './components/CheckoutView.js';
import { PaymentSuccessView } from './components/PaymentSuccessView.js';
import { PaymentCancelView } from './components/PaymentCancelView.js';
import { SubscriptionView } from './components/SubscriptionView.js';
import { PaymentHistoryView } from './components/PaymentHistoryView.js';
import { WireDocsGuideModal } from './components/WireDocsGuideModal.js';
import { MOVIES, Movie } from './data/movies.js';
import { ShieldCheck, QrCode, Film, Heart } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [currentUser, setCurrentUser] = useState({
    id: 'user_batbayar',
    name: 'Батбаяр',
    email: 'batbayar@aimovie.mn'
  });
  const [subscription, setSubscription] = useState<any>(null);
  const [activeMovieForPlayer, setActiveMovieForPlayer] = useState<Movie | null>(null);
  const [selectedMovieDetail, setSelectedMovieDetail] = useState<Movie | null>(null);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string>('');
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [docsModalOpen, setDocsModalOpen] = useState(false);

  // Check URL params on initial load (e.g. /payment/success?order=AIMOV-...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderParam = params.get('order');
    const path = window.location.pathname;

    if (path.includes('/payment/success') || params.get('status') === 'success') {
      if (orderParam) {
        setSelectedOrderNumber(orderParam);
        setCurrentTab('payment-success');
      }
    } else if (path.includes('/payment/cancel') || params.get('status') === 'cancel') {
      if (orderParam) setSelectedOrderNumber(orderParam);
      setCurrentTab('payment-cancel');
    } else if (path.includes('/pricing')) {
      setCurrentTab('pricing');
    } else if (orderParam) {
      setSelectedOrderNumber(orderParam);
      setCurrentTab('checkout');
    }

    fetchUserAndSubscription();
  }, []);

  const fetchUserAndSubscription = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) setCurrentUser(data.user);
        setSubscription(data.subscription);
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

  const handleSelectPlan = async (planId: string) => {
    setLoadingPlanId(planId);
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Захиалга үүсгэхэд алдаа гарлаа');
        return;
      }

      setSelectedOrderNumber(data.orderNumber);
      setCurrentTab('checkout');
    } catch (err: any) {
      alert(err.message || 'Сүлжээний алдаа гарлаа');
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handlePaymentConfirmed = (orderNumber: string) => {
    setSelectedOrderNumber(orderNumber);
    fetchUserAndSubscription();
    setCurrentTab('payment-success');
  };

  const hasActiveSub = Boolean(subscription && subscription.status === 'ACTIVE');

  // Featured movie for hero banner
  const featuredMovie = MOVIES[0];
  const sciFiMovies = MOVIES.filter((m) => m.genreMn.includes('Уран Зөгнөлт') || m.genreMn.includes('Sci-Fi'));
  const allMovies = MOVIES;

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        currentUser={currentUser}
        subscription={subscription}
        onSwitchUser={handleSwitchUser}
        onOpenDocs={() => setDocsModalOpen(true)}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <div>
            {/* Cinematic Hero */}
            <HeroBanner
              movie={featuredMovie}
              onPlay={(m) => setActiveMovieForPlayer(m)}
              onSelect={(m) => setActiveMovieForPlayer(m)}
              hasActiveSubscription={hasActiveSub}
            />

            {/* Movie Sections */}
            <div className="-mt-8 relative z-20 space-y-6 pb-16">
              <MovieRow
                title="Шилдэг AI Кинонууд (QPay Төлбөртэй)"
                subtitle="Хиймэл оюун ухаанаар бүтээгдсэн хамгийн өндөр үзэлттэй шилдэг кинонууд"
                movies={allMovies}
                hasActiveSubscription={hasActiveSub}
                onPlay={(m) => setActiveMovieForPlayer(m)}
                onSelect={(m) => setActiveMovieForPlayer(m)}
              />

              <MovieRow
                title="Шинжлэх Ухааны Уран Зөгнөлт & Киберпанк"
                subtitle="Ирээдүйн ертөнц, квант технологи, роботууд"
                movies={sciFiMovies}
                hasActiveSubscription={hasActiveSub}
                onPlay={(m) => setActiveMovieForPlayer(m)}
                onSelect={(m) => setActiveMovieForPlayer(m)}
              />
            </div>
          </div>
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
            onBack={() => setCurrentTab('pricing')}
            onPaymentConfirmed={handlePaymentConfirmed}
          />
        )}

        {currentTab === 'payment-success' && (
          <PaymentSuccessView
            orderNumber={selectedOrderNumber}
            onGoToHome={() => setCurrentTab('home')}
            onGoToSubscription={() => setCurrentTab('subscription')}
          />
        )}

        {currentTab === 'payment-cancel' && (
          <PaymentCancelView
            orderNumber={selectedOrderNumber}
            onRetry={() => setCurrentTab('pricing')}
            onGoHome={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'subscription' && (
          <SubscriptionView
            subscription={subscription}
            user={currentUser}
            onUpgradeOrRenew={() => setCurrentTab('pricing')}
            onGoToHistory={() => setCurrentTab('payments')}
          />
        )}

        {currentTab === 'payments' && (
          <PaymentHistoryView onRenewPlan={() => setCurrentTab('pricing')} />
        )}
      </main>

      {/* Movie Player & Access Control Modal */}
      <MoviePlayerModal
        movie={activeMovieForPlayer}
        onClose={() => setActiveMovieForPlayer(null)}
        onGoToPricing={() => {
          setActiveMovieForPlayer(null);
          setCurrentTab('pricing');
        }}
        hasActiveSubscription={hasActiveSub}
      />

      {/* Wire & QPay Documentation Guide Modal */}
      <WireDocsGuideModal isOpen={docsModalOpen} onClose={() => setDocsModalOpen(false)} />

      {/* Footer */}
      <footer className="bg-neutral-950 border-t border-neutral-800/80 py-10 px-4 sm:px-6 lg:px-8 text-neutral-400 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-red-600 flex items-center justify-center font-black text-white text-sm">
              AI
            </div>
            <div>
              <div className="font-bold text-white text-sm">AI MOVIE Mongolia</div>
              <div className="text-[11px] text-neutral-500">
                Wire.mn албан ёсны гарц & QPay шуурхай төлбөрийн систем
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs">
            <button onClick={() => setCurrentTab('home')} className="hover:text-white transition">
              Нүүр
            </button>
            <button onClick={() => setCurrentTab('pricing')} className="hover:text-white transition">
              Үнийн санал
            </button>
            <button onClick={() => setCurrentTab('subscription')} className="hover:text-white transition">
              Гишүүнчлэл
            </button>
            <button onClick={() => setCurrentTab('payments')} className="hover:text-white transition">
              Төлбөрийн түүх
            </button>
            <button onClick={() => setDocsModalOpen(true)} className="hover:text-white text-red-400 transition">
              API Баримт бичиг
            </button>
          </div>

          <div className="text-[11px] text-neutral-500 text-center md:text-right">
            © 2026 AI MOVIE. Бүх эрх хуулиар хамгаалагдсан.
          </div>
        </div>
      </footer>
    </div>
  );
}
