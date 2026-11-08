import React from 'react';
import { Film, Shield, CreditCard, User, History, CheckCircle2, ChevronDown, ExternalLink } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: { id: string; name: string; email: string };
  subscription: any;
  onSwitchUser: (userId: string) => void;
  onOpenDocs: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  subscription,
  onSwitchUser,
  onOpenDocs
}) => {
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const demoUsers = [
    { id: 'user_batbayar', name: 'Батбаяр', role: 'Шинэ хэрэглэгч (Эрхгүй)' },
    { id: 'user_enkhjin', name: 'Энхжин', role: 'Стандарт гишүүн' },
    { id: 'user_temuulen', name: 'Тэмүүлэн', role: 'Премиум гишүүн' }
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#141414]/90 backdrop-blur-md border-b border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => setCurrentTab('home')}
            className="flex items-center gap-2 group cursor-pointer focus:outline-none"
            aria-label="Нүүр хуудас руу очих"
          >
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-[#E50914] to-red-600 flex items-center justify-center font-black text-white text-lg tracking-wider shadow-lg shadow-red-900/40">
              AI
            </div>
            <div className="text-2xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-red-600 via-white to-neutral-200">
              MOVIE
            </div>
          </button>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <button
              onClick={() => setCurrentTab('home')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                currentTab === 'home' ? 'text-white font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Нүүр
            </button>
            <button
              onClick={() => setCurrentTab('pricing')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                currentTab === 'pricing'
                  ? 'text-white font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Үнийн санал</span>
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-red-600/30 text-red-400 border border-red-500/30">
                QPay
              </span>
            </button>
            <button
              onClick={() => setCurrentTab('subscription')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                currentTab === 'subscription' ? 'text-white font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Миний гишүүнчлэл
            </button>
            <button
              onClick={() => setCurrentTab('payments')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                currentTab === 'payments' ? 'text-white font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Төлбөрийн түүх
            </button>
          </nav>
        </div>

        {/* Right side status & user dropdown */}
        <div className="flex items-center gap-3">
          {/* Wire & QPay Docs Guide button */}
          <button
            onClick={onOpenDocs}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-md border border-white/10 transition"
            title="Wire.mn болон QPay тохиргооны заавар"
          >
            <Shield className="w-3.5 h-3.5 text-red-500" />
            <span>Wire & QPay Заавар</span>
          </button>

          {/* Subscription Status Pill */}
          <button
            onClick={() => setCurrentTab('subscription')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-900 border border-neutral-700 hover:border-neutral-500 transition cursor-pointer"
          >
            {subscription ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-emerald-400">
                  {subscription.plan?.nameMn || 'Идэвхтэй'}
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-amber-400">Гишүүнчлэлгүй</span>
              </>
            )}
          </button>

          {/* User selector dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 transition"
              aria-expanded={userMenuOpen}
              aria-label="Хэрэглэгчийн цэс"
            >
              <div className="w-7 h-7 rounded bg-gradient-to-tr from-red-600 to-rose-700 flex items-center justify-center text-xs font-bold text-white uppercase">
                {currentUser.name.charAt(0)}
              </div>
              <span className="hidden lg:inline text-xs font-medium text-neutral-200">
                {currentUser.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-neutral-800">
                  <div className="text-xs text-neutral-400">Нэвтэрсэн хэрэглэгч:</div>
                  <div className="text-sm font-semibold text-white">{currentUser.name}</div>
                  <div className="text-xs text-neutral-500">{currentUser.email}</div>
                </div>

                <div className="py-2">
                  <div className="px-3 pb-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Туршилтын хэрэглэгч солих
                  </div>
                  {demoUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSwitchUser(u.id);
                        setUserMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                        currentUser.id === u.id
                          ? 'bg-red-950/40 text-red-300 font-semibold border border-red-800/30'
                          : 'text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <div>
                        <div>{u.name}</div>
                        <div className="text-[10px] text-neutral-500">{u.role}</div>
                      </div>
                      {currentUser.id === u.id && <CheckCircle2 className="w-4 h-4 text-red-500" />}
                    </button>
                  ))}
                </div>

                <div className="pt-1 border-t border-neutral-800">
                  <button
                    onClick={() => {
                      setCurrentTab('pricing');
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-950/20 transition flex items-center gap-2"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Гишүүнчлэл авах / Сунгах</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
