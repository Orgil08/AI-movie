import React, { useState } from 'react';
import { X, Film, Mail, Lock, User as UserIcon, AlertCircle, ArrowRight } from 'lucide-react';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';
import { getCsrfToken, readApiJson, setStoredUserId } from '../utils/api.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; name: string; email: string }) => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signin'
}) => {
  const { locale } = useLocale();
  const tAuth = useTranslations('Auth');

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup') {
      if (!name.trim()) {
        setError(tAuth('nameRequired'));
        return;
      }
      if (password.length < 8) {
        setError(tAuth('passwordMinLength'));
        return;
      }
      if (password !== confirmPassword) {
        setError(tAuth('passwordsDoNotMatch'));
        return;
      }
      if (!termsAccepted) {
        setError(locale === 'en' ? 'Please agree to the Terms and Conditions.' : 'Үйлчилгээний нөхцөлийг зөвшөөрнө үү.');
        return;
      }
    }

    if (!email.trim() || !password) {
      setError(tAuth('allFieldsRequired'));
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login';
      const payload = mode === 'signup' ? { name, email, password } : { email, password };

      const csrfToken = await getCsrfToken();
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'signup'
          ? { ...payload, confirmPassword, terms: termsAccepted, csrfToken }
          : { ...payload, csrfToken })
      });

      const data = await readApiJson<{ error?: string; message?: string; user?: { id: string; name: string; email: string; role?: 'user' | 'admin' } }>(res);

      if (!res.ok) {
        setError(data.message || tAuth('authFailed'));
        return;
      }

      if (data.user?.id) {
        setStoredUserId(data.user.id);
      } else {
        setError(tAuth('authFailed'));
        return;
      }
      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || tAuth('networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-[#0f172a] border border-white/15 rounded-2xl shadow-2xl shadow-black/90 p-6 sm:p-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#e5a93c]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e5a93c]/10 border border-[#e5a93c]/20 text-[#e5a93c] text-xs font-semibold mb-3">
            <Film className="w-3.5 h-3.5" />
            <span>SODON AI MOVIE</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {mode === 'signin' ? tAuth('welcomeBack') : tAuth('createYourAccount')}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'signin' ? tAuth('signinDesc') : tAuth('signupDesc')}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-white/5 border border-white/10 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              mode === 'signin'
                ? 'bg-[#e5a93c] text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tAuth('signInButton')}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              mode === 'signup'
                ? 'bg-[#e5a93c] text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tAuth('signUpButton')}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-2 text-rose-300 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {tAuth('fullName')}
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={tAuth('fullNamePlaceholder')}
                  className="w-full bg-[#111827] border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#e5a93c] transition"
                  required
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <label className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
                className="mt-0.5 accent-[#e5a93c]"
              />
              <span>{locale === 'en' ? 'I agree to the Terms and Conditions.' : 'Би үйлчилгээний нөхцөлийг зөвшөөрч байна.'}</span>
            </label>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {tAuth('emailLabel')}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tAuth('emailPlaceholder')}
                className="w-full bg-[#111827] border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#e5a93c] transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {tAuth('passwordLabel')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tAuth('passwordPlaceholder')}
                className="w-full bg-[#111827] border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#e5a93c] transition"
                required
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {tAuth('confirmPassword')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={tAuth('confirmPasswordPlaceholder')}
                  className="w-full bg-[#111827] border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#e5a93c] transition"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-[#e5a93c] hover:bg-amber-400 text-black font-extrabold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-950/40 text-xs disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">{tAuth('processing')}</span>
            ) : (
              <>
                <span>{mode === 'signin' ? tAuth('signInButton') : tAuth('signUpButton')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
