import React, { useState } from 'react';
import { Film, Mail, Lock, User as UserIcon, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';
import { setStoredUserId } from '../utils/api.js';

interface RegisterPageProps {
  onSuccess: (user: { id: string; name: string; email: string; role?: 'user' | 'admin' }) => void;
  onNavigateToLogin: () => void;
  onNavigateToHome: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onSuccess,
  onNavigateToLogin,
  onNavigateToHome
}) => {
  const { locale } = useLocale();
  const tAuth = useTranslations('Auth');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side quick checks
    if (!name.trim()) {
      setError(tAuth('nameRequired'));
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError(locale === 'en' ? 'Please enter a valid email address.' : 'Имэйл хаягаа зөв оруулна уу.');
      return;
    }
    if (password.length < 8) {
      setError(locale === 'en' ? 'Password must be at least 8 characters.' : 'Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.');
      return;
    }
    if (password !== confirmPassword) {
      setError(tAuth('passwordsDoNotMatch'));
      return;
    }
    if (!terms) {
      setError(locale === 'en' ? 'Please agree to the Terms and Conditions.' : 'Үйлчилгээний нөхцөлийг зөвшөөрнө үү.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          confirmPassword,
          terms
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'EMAIL_ALREADY_EXISTS') {
          setError(locale === 'en' ? 'This email is already registered. Please sign in.' : 'Энэ имэйл хаяг бүртгэгдсэн байна. Нэвтэрч орно уу.');
        } else {
          setError(data.message || tAuth('authFailed'));
        }
        return;
      }

      // Success: automatically log the user in and enter the app!
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
      {/* Cinematic Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#e50914]/15 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#e5a93c]/15 rounded-full blur-[120px]" />
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
            {tAuth('createYourAccount')}
          </h2>
          <p className="text-xs text-slate-400">
            {tAuth('signupDesc')}
          </p>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold w-fit mx-auto">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{locale === 'en' ? 'Bcrypt Encrypted & Secure Auth' : 'Bcrypt нууцлалтай найдвартай бүртгэл'}</span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-2.5 text-rose-300 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="space-y-1">
              <span className="font-semibold block">{error}</span>
              {error.includes('бүртгэгдсэн') && (
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="text-white underline font-bold cursor-pointer text-[11px]"
                >
                  {tAuth('alreadyHaveAccount')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {tAuth('fullName')}
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tAuth('fullNamePlaceholder')}
                required
                className="w-full bg-[#111827] border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] transition"
              />
            </div>
          </div>

          {/* Email */}
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

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {tAuth('passwordLabel')} <span className="text-[10px] text-slate-500 font-normal">({locale === 'en' ? 'min 8 characters' : 'хамгийн багадаа 8 тэмдэгт'})</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tAuth('passwordPlaceholder')}
                required
                minLength={8}
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

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {tAuth('confirmPassword')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={tAuth('confirmPasswordPlaceholder')}
                required
                minLength={8}
                className="w-full bg-[#111827] border border-white/15 rounded-xl pl-9 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
                title={showConfirmPassword ? tAuth('hidePassword') : tAuth('showPassword')}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Terms & Conditions Checkbox */}
          <div className="flex items-start">
            <input
              id="terms-checkbox"
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              required
              className="mt-0.5 w-4 h-4 rounded bg-[#111827] border-white/20 text-[#e50914] focus:ring-[#e50914] cursor-pointer shrink-0"
            />
            <label htmlFor="terms-checkbox" className="ml-2 text-xs text-slate-400 cursor-pointer select-none leading-relaxed">
              {tAuth('termsAgreement')}
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#e50914] to-[#b81d24] hover:from-[#f40612] hover:to-[#e50914] text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 cursor-pointer transition disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">{tAuth('processing')}</span>
            ) : (
              <>
                <span>{tAuth('signUpButton')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Link to Sign In */}
        <div className="pt-2 text-center text-xs text-slate-400 border-t border-white/10">
          <span>{locale === 'en' ? 'Already have an account? ' : 'Бүртгэлтэй юу? '}</span>
          <button
            onClick={onNavigateToLogin}
            className="text-[#e50914] hover:underline font-bold cursor-pointer ml-1"
          >
            {tAuth('signInButton')}
          </button>
        </div>
      </div>
    </div>
  );
};
