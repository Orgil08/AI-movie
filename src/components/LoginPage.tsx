import React, { useState } from 'react';
import { Film, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2, Shield } from 'lucide-react';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';
import { getCsrfToken, readApiJson, setStoredUserId } from '../utils/api.js';

interface LoginPageProps {
  onSuccess: (user: { id: string; name: string; email: string; role: 'user' | 'admin' }) => void;
  onNavigateToRegister: () => void;
  onNavigateToHome: () => void;
  initialMessage?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onNavigateToRegister,
  onNavigateToHome,
  initialMessage = null
}) => {
  const { locale } = useLocale();
  const tAuth = useTranslations('Auth');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(initialMessage);
  const [loading, setLoading] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotStatus(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setForgotStatus({
          type: 'error',
          message: locale === 'en' ? (data.messageEn || data.message || 'Failed to send reset link') : (data.message || 'Алдаа гарлаа')
        });
      } else {
        setForgotStatus({
          type: 'success',
          message: locale === 'en' ? (data.messageEn || data.message) : data.message
        });
      }
    } catch (err: any) {
      setForgotStatus({
        type: 'error',
        message: err.message || tAuth('networkError')
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setError(tAuth('allFieldsRequired'));
      return;
    }

    setLoading(true);

    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, remember: rememberMe, csrfToken })
      });

      const data = await readApiJson<{ error?: string; message?: string; user?: { id: string; name: string; email: string; role: 'user' | 'admin' } }>(res);

      if (!res.ok) {
        if (data.error === 'ACCOUNT_NOT_FOUND') {
          setError(tAuth('accountNotFound'));
        } else if (data.error === 'INCORRECT_PASSWORD') {
          setError(tAuth('incorrectPassword'));
        } else if (data.error === 'ACCOUNT_SUSPENDED') {
          setError(tAuth('accountSuspended'));
        } else {
          setError(data.message || tAuth('authFailed'));
        }
        return;
      }

      if (!data.user?.id) {
        setError(tAuth('authFailed'));
        return;
      }
      setStoredUserId(data.user.id);
      onSuccess(data.user);
    } catch (err: any) {
      setError(err.message || tAuth('networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Cinematic Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#e50914]/15 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#e5a93c]/15 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/80 p-7 sm:p-9 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <button
            onClick={onNavigateToHome}
            className="inline-flex items-center gap-2 group cursor-pointer focus:outline-none mb-1"
          >
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-white group-hover:text-[#e50914] transition">
              SODON
            </span>
            <span className="text-xs font-bold tracking-widest text-[#e5a93c] uppercase">
              AI MOVIE
            </span>
          </button>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {tAuth('loginTitle')}
          </h2>
          <p className="text-xs text-slate-400">
            {tAuth('loginSubtitle')}
          </p>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-2.5 text-rose-300 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="space-y-1">
              <span className="font-semibold block">{error}</span>
              {error === tAuth('accountNotFound') && (
                <button
                  type="button"
                  onClick={onNavigateToRegister}
                  className="text-white underline font-bold cursor-pointer text-[11px]"
                >
                  {tAuth('dontHaveAccount')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {tAuth('emailLabel')}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tAuth('emailPlaceholder')}
                required
                className="w-full bg-[#111827] border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                {tAuth('passwordLabel')}
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotStatus(null);
                  setForgotModalOpen(true);
                }}
                className="text-[11px] text-[#e5a93c] hover:underline cursor-pointer"
              >
                {tAuth('forgotPassword')}
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tAuth('passwordPlaceholder')}
                required
                className="w-full bg-[#111827] border border-white/15 rounded-xl pl-9 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
                title={showPassword ? tAuth('hidePassword') : tAuth('showPassword')}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Option */}
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded bg-[#111827] border-white/20 text-[#e50914] focus:ring-[#e50914] cursor-pointer"
            />
            <label htmlFor="remember-me" className="ml-2 text-xs text-slate-400 cursor-pointer select-none">
              {tAuth('rememberMe')}
            </label>
          </div>

          {/* Submit Button (Netflix Cinematic Red Gradient) */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#e50914] to-[#b81d24] hover:from-[#f40612] hover:to-[#e50914] text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 cursor-pointer transition disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">{tAuth('processing')}</span>
            ) : (
              <>
                <span>{tAuth('signInButton')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Link to Sign Up */}
        <div className="pt-2 text-center text-xs text-slate-400 border-t border-white/10">
          <span>{locale === 'en' ? "Don't have an account? " : 'Бүртгэлгүй юу? '}</span>
          <button
            onClick={onNavigateToRegister}
            className="text-[#e50914] hover:underline font-bold cursor-pointer ml-1"
          >
            {tAuth('signUpButton')}
          </button>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0f172a] border border-white/15 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-[#e5a93c]/15 text-[#e5a93c] flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-white">{tAuth('forgotPasswordModalTitle')}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {locale === 'en'
                  ? 'Enter your registered email address to receive a one-time password reset link.'
                  : 'Бүртгэлтэй имэйл хаягаа оруулж нууц үг сэргээх нэг удаагийн холбоос авна уу.'}
              </p>
            </div>

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
              <div>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder={tAuth('emailPlaceholder')}
                  className="w-full bg-[#111827] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#e5a93c]"
                />
              </div>

              {forgotStatus && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    forgotStatus.type === 'success'
                      ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/50 border border-rose-500/40 text-rose-300'
                  }`}
                >
                  {forgotStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span>{forgotStatus.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#e5a93c] to-amber-400 text-black font-extrabold text-xs cursor-pointer hover:brightness-110 transition disabled:opacity-50"
              >
                {forgotLoading
                  ? locale === 'en'
                    ? 'Sending...'
                    : 'Илгээж байна...'
                  : locale === 'en'
                  ? 'Send Reset Link'
                  : 'Сэргээх холбоос илгээх'}
              </button>
            </form>

            <button
              onClick={() => setForgotModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
            >
              {locale === 'en' ? 'Close' : 'Хаах'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
