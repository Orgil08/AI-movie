import React, { useState, useEffect } from 'react';
import { Film, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, KeyRound, Sparkles } from 'lucide-react';
import { useLocale } from '../i18n/I18nContext.js';

interface ResetPasswordPageProps {
  token?: string;
  onNavigateToLogin: () => void;
  onNavigateToHome: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  token: initialToken,
  onNavigateToLogin,
  onNavigateToHome
}) => {
  const { locale } = useLocale();

  const [token, setToken] = useState<string>(initialToken || '');
  const [tokenStatus, setTokenStatus] = useState<'checking' | 'valid' | 'invalid'>('checking');
  const [tokenEmail, setTokenEmail] = useState<string>('');
  const [tokenError, setTokenError] = useState<string>('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Read token from URL query if not provided via props
  useEffect(() => {
    let activeToken = initialToken;
    if (!activeToken && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      activeToken = params.get('token') || '';
    }
    setToken(activeToken || '');

    if (!activeToken) {
      setTokenStatus('invalid');
      setTokenError(
        locale === 'en'
          ? 'Reset token is missing from the URL. Please request a new link.'
          : 'Нууц үг сэргээх холбоосын токен дутуу байна. Дахин шинэ хүсэлт илгээнэ үү.'
      );
      return;
    }

    // Verify token with backend
    const verifyToken = async () => {
      setTokenStatus('checking');
      try {
        const res = await fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(activeToken!)}`);
        const data = await res.json();
        if (res.ok && data.valid) {
          setTokenStatus('valid');
          setTokenEmail(data.email || '');
        } else {
          setTokenStatus('invalid');
          setTokenError(data.message || (locale === 'en' ? 'Invalid or expired reset token.' : 'Хүчингүй эсвэл хугацаа нь дууссан холбоос.'));
        }
      } catch (err: any) {
        setTokenStatus('invalid');
        setTokenError(err.message || (locale === 'en' ? 'Network error verifying token.' : 'Сүлжээний алдаа гарлаа.'));
      }
    };

    verifyToken();
  }, [initialToken, locale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError(locale === 'en' ? 'Password must be at least 8 characters.' : 'Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(locale === 'en' ? 'Passwords do not match.' : 'Шинэ нууц үгүүд хоорондоо таарахгүй байна.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword,
          confirmNewPassword: confirmPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || (locale === 'en' ? 'Failed to reset password.' : 'Нууц үг шинэчлэхэд алдаа гарлаа.'));
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || (locale === 'en' ? 'Network error.' : 'Сүлжээний алдаа гарлаа.'));
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
          <div className="w-12 h-12 rounded-full bg-[#e5a93c]/15 text-[#e5a93c] flex items-center justify-center mx-auto mb-2">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {locale === 'en' ? 'Reset Your Password' : 'Нууц үг шинэчлэх'}
          </h2>
          <p className="text-xs text-slate-400">
            {locale === 'en'
              ? 'Enter a strong new password for your AI MOVIE account.'
              : 'Өөрийн AI MOVIE бүртгэлийн шинэ хүчтэй нууц үгээ оруулна уу.'}
          </p>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold w-fit mx-auto">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{locale === 'en' ? 'Cryptographic Token Verified' : 'Криптограф токеноор баталгаажсан'}</span>
        </div>

        {/* Checking Token Loading */}
        {tokenStatus === 'checking' && (
          <div className="py-8 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#e5a93c] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">
              {locale === 'en' ? 'Verifying reset link...' : 'Нууц үг сэргээх холбоосыг шалгаж байна...'}
            </p>
          </div>
        )}

        {/* Invalid Token State */}
        {tokenStatus === 'invalid' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <strong className="block font-semibold mb-1">
                  {locale === 'en' ? 'Invalid or Expired Link' : 'Холбоос хүчингүй болсон байна'}
                </strong>
                <p>{tokenError}</p>
              </div>
            </div>

            <button
              onClick={onNavigateToLogin}
              className="w-full py-3 bg-[#e50914] hover:bg-[#b81d24] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition shadow-lg shadow-rose-950/40"
            >
              <span>{locale === 'en' ? 'Return to Sign In' : 'Нэвтрэх хуудас руу буцах'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Success State */}
        {success && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="font-black text-sm text-white">
                {locale === 'en' ? 'Password Reset Successful!' : 'Нууц үг амжилттай шинэчлэгдлээ!'}
              </h4>
              <p className="text-slate-300 text-xs">
                {locale === 'en'
                  ? 'Your account password has been updated. You can now sign in with your new password.'
                  : 'Таны нууц үг амжилттай солигдлоо. Та одоо шинэ нууц үгээрээ нэвтэрнэ үү.'}
              </p>
            </div>

            <button
              onClick={onNavigateToLogin}
              className="w-full py-3 bg-gradient-to-r from-[#e50914] to-[#b81d24] text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 cursor-pointer transition hover:from-[#f40612] hover:to-[#e50914]"
            >
              <span>{locale === 'en' ? 'Sign In Now' : 'Одоо нэвтрэх'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Valid Token Form */}
        {tokenStatus === 'valid' && !success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {tokenEmail && (
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center justify-between">
                <span className="text-slate-400">{locale === 'en' ? 'Account:' : 'Бүртгэл:'}</span>
                <span className="font-semibold text-white truncate max-w-[200px]">{tokenEmail}</span>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-2.5 text-rose-300 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {locale === 'en' ? 'New Password' : 'Шинэ нууц үг'}{' '}
                <span className="text-[10px] text-slate-500 font-normal">
                  ({locale === 'en' ? 'min 8 characters' : 'хамгийн багадаа 8 тэмдэгт'})
                </span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={locale === 'en' ? 'Enter new password' : 'Шинэ нууц үгээ оруулна уу'}
                  required
                  minLength={8}
                  className="w-full bg-[#111827] border border-white/15 rounded-xl pl-9 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {locale === 'en' ? 'Confirm New Password' : 'Шинэ нууц үгээ давтах'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={locale === 'en' ? 'Confirm new password' : 'Шинэ нууц үгээ давтан оруулна уу'}
                  required
                  minLength={8}
                  className="w-full bg-[#111827] border border-white/15 rounded-xl pl-9 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#e50914] to-[#b81d24] hover:from-[#f40612] hover:to-[#e50914] text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 cursor-pointer transition disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-pulse">{locale === 'en' ? 'Updating...' : 'Шинэчилж байна...'}</span>
              ) : (
                <>
                  <span>{locale === 'en' ? 'Save New Password' : 'Шинэ нууц үг хадгалах'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Back to Login link */}
        <div className="pt-2 text-center text-xs text-slate-400 border-t border-white/10">
          <button
            onClick={onNavigateToLogin}
            className="text-[#e50914] hover:underline font-bold cursor-pointer"
          >
            ← {locale === 'en' ? 'Back to Sign In' : 'Нэвтрэх хуудас руу буцах'}
          </button>
        </div>
      </div>
    </div>
  );
};
