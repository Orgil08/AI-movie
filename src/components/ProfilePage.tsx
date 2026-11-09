import React, { useState } from 'react';
import { User, Shield, Key, History, CreditCard, LogOut, Check, AlertCircle, Save, ExternalLink } from 'lucide-react';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';
import { formatCurrency, formatDate } from '../i18n/types.js';
import { authFetch } from '../utils/api.js';

interface ProfilePageProps {
  user: { id: string; name: string; email: string; role?: 'user' | 'admin' };
  subscription: any;
  onSignOut: () => void;
  onNavigateToPricing: () => void;
  onNavigateToAdmin: () => void;
  onUserUpdated: (user: { id: string; name: string; email: string; role?: 'user' | 'admin' }) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  subscription,
  onSignOut,
  onNavigateToPricing,
  onNavigateToAdmin,
  onUserUpdated
}) => {
  const { locale } = useLocale();
  const tAuth = useTranslations('Auth');
  const tSub = useTranslations('Subscription');

  // Update name state
  const [name, setName] = useState(user.name);
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setNameSuccess(false);

    if (!name.trim()) {
      setNameError(tAuth('nameRequired'));
      return;
    }

    setNameLoading(true);
    try {
      const res = await authFetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setNameError(data.message || 'Алдаа гарлаа.');
        return;
      }
      setNameSuccess(true);
      onUserUpdated(data.user);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err: any) {
      setNameError(err.message || 'Сүлжээний алдаа.');
    } finally {
      setNameLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError(locale === 'en' ? 'Please enter your current password.' : 'Одоогийн нууц үгээ оруулна уу.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(locale === 'en' ? 'New password must be at least 8 characters.' : 'Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError(tAuth('passwordsDoNotMatch'));
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.message || 'Нууц үг солиход алдаа гарлаа.');
        return;
      }
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Сүлжээний алдаа.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const isAdmin = user.role === 'admin';
  const hasSub = Boolean(subscription && subscription.status === 'ACTIVE');

  return (
    <div className="py-12 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 w-full max-w-5xl mx-auto space-y-8 select-none">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#111827] via-[#0f172a] to-[#111827] border border-white/10 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#e50914] via-amber-600 to-[#e5a93c] flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-rose-950/40">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">{user.name}</h1>
              {isAdmin ? (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[10px] font-black uppercase tracking-wider">
                  ADMINISTRATOR
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-[#e5a93c]/20 border border-[#e5a93c]/40 text-[#e5a93c] text-[10px] font-bold uppercase tracking-wider">
                  MEMBER
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-rose-950/40 cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              <span>{locale === 'en' ? 'Open Admin Panel' : 'Админ самбар нээх'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onSignOut}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-rose-950/40 border border-white/10 text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{locale === 'en' ? 'Sign Out' : 'Гарах'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Personal Info & Subscription */}
        <div className="space-y-6">
          {/* Update Name Form */}
          <div className="p-6 rounded-2xl bg-[#0f172a] border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-white/10 pb-3">
              <User className="w-4 h-4 text-[#e5a93c]" />
              <span>{locale === 'en' ? 'Personal Information' : 'Хувийн мэдээлэл'}</span>
            </div>

            {nameSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{tAuth('profileUpdated')}</span>
              </div>
            )}

            {nameError && (
              <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{nameError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateName} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">{tAuth('fullName')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#111827] border border-white/15 text-white text-xs sm:text-sm focus:outline-none focus:border-[#e5a93c]"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{tAuth('emailLabel')}</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-slate-500 text-xs sm:text-sm cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {locale === 'en' ? 'Email cannot be changed.' : 'Имэйл хаягийг өөрчлөх боломжгүй.'}
                </span>
              </div>

              <button
                type="submit"
                disabled={nameLoading}
                className="w-full py-2.5 rounded-xl bg-[#e5a93c] hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{tAuth('updateName')}</span>
              </button>
            </form>
          </div>

          {/* Membership Status Card */}
          <div className="p-6 rounded-2xl bg-[#0f172a] border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>{tSub('title')}</span>
              </div>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  hasSub
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-[#e5a93c] border border-[#e5a93c]/30'
                }`}
              >
                {hasSub ? tSub('statusActive') : tSub('statusNone')}
              </span>
            </div>

            {hasSub ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">{tSub('plan')}:</span>
                  <span className="font-bold text-white uppercase">{subscription.planId} VIP</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">{tSub('daysRemaining')}:</span>
                  <span className="font-bold text-emerald-400">{subscription.daysRemaining} {tSub('days')}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">{tSub('expiresOn')}:</span>
                  <span className="font-semibold text-slate-300">
                    {formatDate(new Date(subscription.endDate), locale)}
                  </span>
                </div>

                <button
                  onClick={onNavigateToPricing}
                  className="w-full mt-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs cursor-pointer"
                >
                  {tSub('renewPlan')}
                </button>
              </div>
            ) : (
              <div className="text-center py-3 space-y-3">
                <p className="text-xs text-slate-400">{tSub('noActiveSubscription')}</p>
                <button
                  onClick={onNavigateToPricing}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#e5a93c] to-amber-500 text-black font-extrabold text-xs cursor-pointer shadow-lg shadow-amber-950/40"
                >
                  {tSub('upgradeNow')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Change Password */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0f172a] border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-white/10 pb-3">
              <Key className="w-4 h-4 text-rose-400" />
              <span>{tAuth('changePassword')}</span>
            </div>

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{tAuth('passwordChanged')}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">{tAuth('currentPassword')}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#111827] border border-white/15 text-white text-xs sm:text-sm focus:outline-none focus:border-[#e50914]"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {tAuth('newPassword')} <span className="text-[10px] text-slate-500">({locale === 'en' ? 'min 8 chars' : 'хамгийн багадаа 8 тэмдэгт'})</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#111827] border border-white/15 text-white text-xs sm:text-sm focus:outline-none focus:border-[#e50914]"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{tAuth('confirmNewPassword')}</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#111827] border border-white/15 text-white text-xs sm:text-sm focus:outline-none focus:border-[#e50914]"
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#e50914] to-rose-700 hover:brightness-110 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-lg shadow-rose-950/40"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{passwordLoading ? tAuth('processing') : tAuth('changePassword')}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
