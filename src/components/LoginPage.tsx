import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { AuthUser } from './AuthModal.js';
import { LanguageSwitcher } from './LanguageSwitcher.js';
import { useLocale } from '../i18n/I18nContext.js';

interface LoginPageProps {
  onSuccess: (user: AuthUser) => void;
  onGoRegister?: () => void;
  onNavigateToRegister?: () => void;
  onGoHome?: () => void;
  onNavigateToHome?: () => void;
  initialMessage?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onGoRegister,
  onNavigateToRegister,
  onGoHome,
  onNavigateToHome
}) => {
  const { locale } = useLocale();
  const handleGoRegister = () => {
    if (onNavigateToRegister) onNavigateToRegister();
    else if (onGoRegister) onGoRegister();
  };
  const handleGoHome = () => {
    if (onNavigateToHome) onNavigateToHome();
    else if (onGoHome) onGoHome();
  };
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [csrfToken, setCsrfToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [resetTokenInput, setResetTokenInput] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [resetCompleted, setResetCompleted] = useState(false);

  const fetchCsrf = async (): Promise<string> => {
    try {
      const r = await fetch('/api/auth/csrf', { credentials: 'include' });
      const d = await r.json();
      if (d?.csrfToken) {
        setCsrfToken(d.csrfToken);
        return d.csrfToken;
      }
    } catch {
      // ignore
    }
    return '';
  };

  useEffect(() => {
    fetchCsrf();
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('reset_token');
    if (tokenFromUrl) {
      setMode('forgot');
      setResetEmailSent(true);
      setResetTokenInput(tokenFromUrl);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError(
        locale === 'en' ? 'Please enter a valid email address.' : 'Имэйл хаягаа зөв оруулна уу.'
      );
      return;
    }
    if (!password) {
      setError(locale === 'en' ? 'Please enter your password.' : 'Нууц үгээ оруулна уу.');
      return;
    }

    setLoading(true);
    try {
      const activeCsrf = csrfToken || (await fetchCsrf());
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': activeCsrf
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          rememberMe,
          csrfToken: activeCsrf
        })
      });

      const data = await res.json();
      if (!res.ok || !data.user) {
        throw new Error(
          data.message ||
            (locale === 'en' ? 'Invalid email or password.' : 'Имэйл эсвэл нууц үг буруу байна.')
        );
      }

      if (data.sessionToken) {
        try {
          sessionStorage.setItem('ai_movie_session_token', data.sessionToken);
        } catch {
          // ignore
        }
      }

      onSuccess(data.user);
    } catch (err: any) {
      setError(
        err.message ||
          (locale === 'en' ? 'Sign in failed. Please try again.' : 'Нэвтрэхэд алдаа гарлаа.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetMessage(null);
    setDevResetUrl(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Бүртгэлтэй имэйл хаягаа зөв оруулна уу.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Хүсэлт илгээхэд алдаа гарлаа.');
      }
      setResetEmailSent(true);
      setResetMessage(data.message || 'Нууц үг сэргээх заавар илгээгдлээ.');
      if (data.devResetToken) {
        setResetTokenInput(data.devResetToken);
      }
      if (data.devResetUrl) {
        setDevResetUrl(data.devResetUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!resetTokenInput.trim()) {
      setError('Нууц үг сэргээх токен кодыг оруулна уу.');
      return;
    }
    if (newResetPassword.length < 8) {
      setError('Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetTokenInput.trim(),
          password: newResetPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Нууц үг шинэчлэхэд алдаа гарлаа.');
      }
      setResetCompleted(true);
      setResetMessage(data.message || 'Нууц үг амжилттай шинэчлэгдлээ.');
    } catch (err: any) {
      setError(err.message || 'Алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080A10] text-white flex flex-col justify-between relative overflow-hidden">
      {/* Minimal Top Bar */}
      <header className="relative z-10 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-5 flex items-center justify-between">
        <button
          type="button"
          onClick={handleGoHome}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{locale === 'en' ? 'Back to Home' : 'Нүүр хуудас руу буцах'}</span>
        </button>
        <LanguageSwitcher />
      </header>

      {/* Main Centered Login Card matching image_984553da.png */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[450px] rounded-[22px] bg-[#0D111B] border border-[#252D3A] p-7 sm:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.85)]">
          {/* Brand Header */}
          <div className="text-center mb-7">
            <div className="inline-flex items-baseline justify-center gap-2 mb-3">
              <span className="text-3xl font-black tracking-tight text-white">SODON</span>
              <span className="text-sm font-extrabold tracking-[0.2em] text-[#F5B936] uppercase">
                AI MOVIE
              </span>
            </div>

            {mode === 'login' ? (
              <>
                <h1 className="text-2xl sm:text-[26px] font-black text-white tracking-tight">
                  {locale === 'en' ? 'Sign In to AI MOVIE' : 'AI MOVIE-д Нэвтрэх'}
                </h1>
                <p className="text-xs sm:text-sm text-[#94A3B8] mt-2">
                  {locale === 'en'
                    ? 'Sign in with your profile to continue watching'
                    : 'Өөрийн профайлаар нэвтэрч үргэлжлүүлэн үзнэ үү'}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  {locale === 'en' ? 'Reset Password' : 'Нууц үг сэргээх'}
                </h1>
                <p className="text-xs sm:text-sm text-[#94A3B8] mt-2">
                  {locale === 'en'
                    ? 'Enter your registered email to reset your password'
                    : 'Бүртгэлтэй имэйл хаягаа оруулж нууц үгээ шинэчилнэ үү'}
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-white mb-2">
                  {locale === 'en' ? 'Email Address' : 'Имэйл хаяг'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.mn"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#111827] border border-[#252D3A] text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#E50914] transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-white">
                    {locale === 'en' ? 'Password' : 'Нууц үг'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode('forgot');
                    }}
                    className="text-xs text-[#F5B936] hover:underline font-semibold cursor-pointer"
                  >
                    {locale === 'en' ? 'Forgot password?' : 'Нууц үг мартсан уу?'}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-[#111827] border border-[#252D3A] text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#E50914] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-gray-300 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-0.5">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#252D3A] bg-[#111827] accent-[#38BDF8] cursor-pointer"
                />
                <label
                  htmlFor="remember-me"
                  className="text-xs text-[#94A3B8] select-none cursor-pointer"
                >
                  {locale === 'en' ? 'Remember me' : 'Намайг санах'}
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#E50914] to-[#C80812] hover:from-[#F5121E] hover:to-[#D60A15] text-white font-black text-sm shadow-[0_10px_28px_rgba(229,9,20,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{locale === 'en' ? 'Signing in...' : 'Нэвтэрч байна...'}</span>
                  </>
                ) : (
                  <>
                    <span>{locale === 'en' ? 'Sign In' : 'Нэвтрэх'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : resetCompleted ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-emerald-300">{resetMessage}</p>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setResetCompleted(false);
                  setResetEmailSent(false);
                  setPassword('');
                }}
                className="w-full py-3 rounded-xl bg-[#E50914] text-white font-bold text-sm cursor-pointer"
              >
                Нэвтрэх хэсэг рүү буцах
              </button>
            </div>
          ) : !resetEmailSent ? (
            <form onSubmit={handleForgotRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white mb-2">
                  Бүртгэлтэй имэйл хаяг
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.mn"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#111827] border border-[#252D3A] text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#E50914]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#E50914] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Сэргээх код авах
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full py-2.5 text-xs text-[#94A3B8] hover:text-white cursor-pointer"
              >
                ← Нэвтрэх хэсэг рүү буцах
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetConfirm} className="space-y-4">
              {resetMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                  {resetMessage}
                </div>
              )}
              {devResetUrl && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 break-all">
                   Сэргээх токен автоматаар бөглөгдлөө.
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">Сэргээх токен</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={resetTokenInput}
                    onChange={(e) => setResetTokenInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#111827] border border-[#252D3A] text-xs font-mono text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">Шинэ нууц үг</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="Хамгийн багадаа 8 тэмдэгт"
                  className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-[#252D3A] text-sm text-white"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#E50914] text-white font-bold text-sm cursor-pointer"
              >
                Шинэ нууц үг хадгалах
              </button>
            </form>
          )}

          {/* Bottom Register Link */}
          <div className="mt-7 pt-5 border-t border-[#252D3A] text-center">
            <p className="text-xs text-[#94A3B8]">
              {locale === 'en' ? "Don't have an account?" : 'Бүртгэлгүй юу?'}{' '}
              <button
                type="button"
                onClick={handleGoRegister}
                className="text-[#E50914] hover:text-[#FF3B45] font-bold ml-1 cursor-pointer"
              >
                {locale === 'en' ? 'Sign Up' : 'Бүртгүүлэх'}
              </button>
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 text-center py-5 text-xs text-[#64748B]">
        © {new Date().getFullYear()} SODON AI MOVIE. Бүх эрх хуулиар хамгаалагдсан.
      </footer>
    </div>
  );
};
