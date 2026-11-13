import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import { AuthUser } from './AuthModal.js';
import { LanguageSwitcher } from './LanguageSwitcher.js';
import { useLocale } from '../i18n/I18nContext.js';

interface RegisterPageProps {
  onSuccess: (user: AuthUser) => void;
  onGoLogin?: () => void;
  onNavigateToLogin?: () => void;
  onGoHome?: () => void;
  onNavigateToHome?: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onSuccess,
  onGoLogin,
  onNavigateToLogin,
  onGoHome,
  onNavigateToHome
}) => {
  const { locale } = useLocale();
  const handleGoLogin = () => {
    if (onNavigateToLogin) onNavigateToLogin();
    else if (onGoLogin) onGoLogin();
  };
  const handleGoHome = () => {
    if (onNavigateToHome) onNavigateToHome();
    else if (onGoHome) onGoHome();
  };
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError(
        locale === 'en'
          ? 'Name must be at least 2 characters.'
          : 'Таны нэр хамгийн багадаа 2 тэмдэгт байх ёстой.'
      );
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError(
        locale === 'en' ? 'Please enter a valid email address.' : 'Имэйл хаягаа зөв оруулна уу.'
      );
      return;
    }
    if (password.length < 8) {
      setError(
        locale === 'en'
          ? 'Password must be at least 8 characters.'
          : 'Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.'
      );
      return;
    }
    if (password !== confirmPassword) {
      setError(
        locale === 'en'
          ? 'Password confirmation does not match.'
          : 'Баталгаажуулах нууц үг таарахгүй байна.'
      );
      return;
    }
    if (!agreeTerms) {
      setError(
        locale === 'en'
          ? 'Please accept the Terms of Service and Privacy Policy.'
          : 'Үйлчилгээний нөхцөл болон нууцлалын бодлогыг зөвшөөрнө үү.'
      );
      return;
    }

    setLoading(true);
    try {
      const activeCsrf = csrfToken || (await fetchCsrf());
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': activeCsrf
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          csrfToken: activeCsrf
        })
      });

      const data = await res.json();
      if (!res.ok || !data.user) {
        throw new Error(
          data.message ||
            (locale === 'en' ? 'Registration failed.' : 'Бүртгүүлэхэд алдаа гарлаа.')
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
          (locale === 'en' ? 'Registration failed.' : 'Бүртгүүлэхэд алдаа гарлаа.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080A10] text-white flex flex-col justify-between relative overflow-hidden">
      {/* Top Bar */}
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

      {/* Main Centered Registration Card matching image_19d700f3.png */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-[450px] rounded-[22px] bg-[#0D111B] border border-[#252D3A] p-7 sm:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.85)]">
          <div className="text-center mb-6">
            <div className="inline-flex items-baseline justify-center gap-2 mb-3">
              <span className="text-3xl font-black tracking-tight text-white">SODON</span>
              <span className="text-sm font-extrabold tracking-[0.2em] text-[#F5B936] uppercase">
                AI MOVIE
              </span>
            </div>

            <h1 className="text-2xl sm:text-[26px] font-black text-white tracking-tight">
              {locale === 'en' ? 'Create New Account' : 'Шинэ бүртгэл үүсгэх'}
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-2 leading-relaxed">
              {locale === 'en'
                ? 'Sign up today and stream 4K Ultra HD AI cinema'
                : 'Өнөөдөр бүртгүүлж, 4K Ultra HD хиймэл оюунт кинонуудыг үзээрэй'}
            </p>

            {/* Green Security Badge matching image_19d700f3.png */}
            <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>
                {locale === 'en'
                  ? 'Bcrypt encrypted secure account'
                  : 'Bcrypt нууцлалтай найдвартай бүртгэл'}
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                {locale === 'en' ? 'Your Name' : 'Таны нэр'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={locale === 'en' ? 'e.g. Batbayar' : 'Жнь: Батбаяр'}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#111827] border border-[#252D3A] text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#E50914] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                {locale === 'en' ? 'Email Address' : 'Имэйл хаяг'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.mn"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#111827] border border-[#252D3A] text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#E50914] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                {locale === 'en' ? 'Password ' : 'Нууц үг '}
                <span className="text-[#64748B] font-normal">
                  {locale === 'en' ? '(minimum 8 characters)' : '(хамгийн багадаа 8 тэмдэгт)'}
                </span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-[#111827] border border-[#252D3A] text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#E50914] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-gray-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                {locale === 'en' ? 'Confirm Password' : 'Нууц үг баталгаажуулах'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-[#111827] border border-[#252D3A] text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#E50914] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-gray-300 cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="register-terms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-[#252D3A] bg-[#111827] accent-[#E50914] cursor-pointer"
              />
              <label
                htmlFor="register-terms"
                className="text-xs text-[#94A3B8] leading-relaxed select-none cursor-pointer"
              >
                {locale === 'en'
                  ? 'I agree to the Terms of Service and Privacy Policy'
                  : 'Үйлчилгээний нөхцөл болон нууцлалын бодлогыг зөвшөөрч байна'}
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
                  <span>{locale === 'en' ? 'Creating account...' : 'Бүртгэж байна...'}</span>
                </>
              ) : (
                <>
                  <span>{locale === 'en' ? 'Sign Up' : 'Бүртгүүлэх'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-7 pt-5 border-t border-[#252D3A] text-center">
            <p className="text-xs text-[#94A3B8]">
              {locale === 'en' ? 'Already have an account?' : 'Бүртгэлтэй юу?'}{' '}
              <button
                type="button"
                onClick={handleGoLogin}
                className="text-[#E50914] hover:text-[#FF3B45] font-bold ml-1 cursor-pointer"
              >
                {locale === 'en' ? 'Sign In' : 'Нэвтрэх'}
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
