import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { useLocale } from '../i18n/I18nContext.js';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status?: 'active' | 'suspended';
  createdAt?: string;
}

interface AuthModalProps {
  isOpen?: boolean;
  initialMode?: 'signin' | 'signup' | 'login' | 'register';
  mode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
  onSwitchMode?: (mode: 'login' | 'register') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen = true,
  initialMode,
  mode,
  onClose,
  onSuccess,
  onSwitchMode
}) => {
  const { locale } = useLocale();
  const resolvedInitMode =
    mode === 'register' || initialMode === 'signup' || initialMode === 'register'
      ? 'register'
      : 'login';
  const [viewMode, setViewMode] = useState<'login' | 'register' | 'forgot'>(resolvedInitMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [csrfToken, setCsrfToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetTokenInput, setResetTokenInput] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [resetCompleted, setResetCompleted] = useState(false);

  useEffect(() => {
    const next =
      mode === 'register' || initialMode === 'signup' || initialMode === 'register'
        ? 'register'
        : 'login';
    setViewMode(next);
    setError(null);
  }, [mode, initialMode, isOpen]);

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

    if (viewMode === 'register') {
      if (name.trim().length < 2) {
        setError('Таны нэр хамгийн багадаа 2 тэмдэгт байх ёстой.');
        return;
      }
      if (password.length < 8) {
        setError('Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Баталгаажуулах нууц үг таарахгүй байна.');
        return;
      }
      if (!agreeTerms) {
        setError('Үйлчилгээний нөхцөл болон нууцлалын бодлогыг зөвшөөрнө үү.');
        return;
      }
    }

    setLoading(true);
    try {
      const activeCsrf = csrfToken || (await fetchCsrf());
      const endpoint = viewMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        viewMode === 'login'
          ? { email: email.trim().toLowerCase(), password, rememberMe, csrfToken: activeCsrf }
          : { name: name.trim(), email: email.trim().toLowerCase(), password, csrfToken: activeCsrf };

      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': activeCsrf
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.user) {
        throw new Error(data.message || 'Баталгаажуулалт амжилтгүй боллоо.');
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
      setError(err.message || 'Сүлжээний алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Алдаа гарлаа.');
      setResetEmailSent(true);
      setResetMessage(data.message || 'Сэргээх заавар илгээгдлээ.');
      if (data.devResetToken) setResetTokenInput(data.devResetToken);
    } catch (err: any) {
      setError(err.message || 'Алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
      if (!res.ok) throw new Error(data.message || 'Алдаа гарлаа.');
      setResetCompleted(true);
      setResetMessage(data.message || 'Нууц үг амжилттай шинэчлэгдлээ.');
    } catch (err: any) {
      setError(err.message || 'Алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080A10]/85 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-[450px] rounded-[22px] bg-[#0D111B] border border-[#252D3A] p-7 sm:p-9 shadow-[0_25px_70px_rgba(0,0,0,0.85)] my-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header matching image_984553da.png & image_19d700f3.png */}
        <div className="text-center mb-6">
          <div className="inline-flex items-baseline justify-center gap-2 mb-2.5">
            <span className="text-3xl font-black tracking-tight text-white">SODON</span>
            <span className="text-sm font-extrabold tracking-[0.2em] text-[#F5B936] uppercase">
              AI MOVIE
            </span>
          </div>

          {viewMode === 'login' ? (
            <>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {locale === 'en' ? 'Sign In to AI MOVIE' : 'AI MOVIE-д Нэвтрэх'}
              </h2>
              <p className="text-xs text-[#94A3B8] mt-1.5">
                {locale === 'en'
                  ? 'Sign in with your profile to continue watching'
                  : 'Өөрийн профайлаар нэвтэрч үргэлжлүүлэн үзнэ үү'}
              </p>
            </>
          ) : viewMode === 'register' ? (
            <>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {locale === 'en' ? 'Create New Account' : 'Шинэ бүртгэл үүсгэх'}
              </h2>
              <p className="text-xs text-[#94A3B8] mt-1.5">
                {locale === 'en'
                  ? 'Sign up today and stream 4K Ultra HD AI cinema'
                  : 'Өнөөдөр бүртгүүлж, 4K Ultra HD хиймэл оюунт кинонуудыг үзээрэй'}
              </p>
              <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Bcrypt нууцлалтай найдвартай бүртгэл</span>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-black text-white tracking-tight">Нууц үг сэргээх</h2>
              <p className="text-xs text-[#94A3B8] mt-1.5">
                Бүртгэлтэй имэйл хаягаа оруулна уу
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

        {viewMode === 'forgot' ? (
          resetCompleted ? (
            <div className="space-y-4 text-center py-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-sm font-bold text-emerald-300">{resetMessage}</p>
              <button
                type="button"
                onClick={() => {
                  setViewMode('login');
                  setResetCompleted(false);
                  setResetEmailSent(false);
                }}
                className="w-full py-3 rounded-xl bg-[#E50914] text-white font-bold text-sm cursor-pointer"
              >
                Нэвтрэх хэсэг рүү буцах
              </button>
            </div>
          ) : !resetEmailSent ? (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">Имэйл хаяг</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.mn"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#111827] border border-[#252D3A] text-sm text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#E50914] text-white font-bold text-sm cursor-pointer"
              >
                Сэргээх код авах
              </button>
              <button
                type="button"
                onClick={() => setViewMode('login')}
                className="w-full py-2 text-xs text-[#94A3B8] hover:text-white cursor-pointer"
              >
                ← Буцах
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetConfirm} className="space-y-4">
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
                Хадгалах
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {viewMode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">Таны нэр</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Жнь: Батбаяр"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#111827] border border-[#252D3A] text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#E50914]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-white mb-1.5">Имэйл хаяг</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.mn"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#111827] border border-[#252D3A] text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#E50914]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-white">
                  Нууц үг{' '}
                  {viewMode === 'register' && (
                    <span className="text-[#64748B] font-normal">(хамгийн багадаа 8 тэмдэгт)</span>
                  )}
                </label>
                {viewMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setViewMode('forgot')}
                    className="text-xs text-[#F5B936] hover:underline font-semibold cursor-pointer"
                  >
                    Нууц үг мартсан уу?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 rounded-xl bg-[#111827] border border-[#252D3A] text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#E50914]"
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

            {viewMode === 'register' ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-white mb-1.5">
                    Нууц үг баталгаажуулах
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-11 py-3 rounded-xl bg-[#111827] border border-[#252D3A] text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#E50914]"
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

                <div className="flex items-start gap-2.5 pt-0.5">
                  <input
                    id="modal-terms"
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-[#252D3A] bg-[#111827] accent-[#E50914] cursor-pointer"
                  />
                  <label htmlFor="modal-terms" className="text-xs text-[#94A3B8] cursor-pointer">
                    Үйлчилгээний нөхцөл болон нууцлалын бодлогыг зөвшөөрч байна
                  </label>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2.5">
                <input
                  id="modal-remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#252D3A] bg-[#111827] accent-[#38BDF8] cursor-pointer"
                />
                <label htmlFor="modal-remember" className="text-xs text-[#94A3B8] cursor-pointer">
                  Намайг санах
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#E50914] to-[#C80812] hover:from-[#F5121E] hover:to-[#D60A15] text-white font-black text-sm shadow-[0_10px_28px_rgba(229,9,20,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{viewMode === 'login' ? 'Нэвтрэх' : 'Бүртгүүлэх'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-[#252D3A] text-center">
          <p className="text-xs text-[#94A3B8]">
            {viewMode === 'login' ? 'Бүртгэлгүй юу?' : 'Бүртгэлтэй юу?'}{' '}
            <button
              type="button"
              onClick={() => {
                const next = viewMode === 'login' ? 'register' : 'login';
                setViewMode(next);
                if (onSwitchMode) onSwitchMode(next);
              }}
              className="text-[#E50914] hover:text-[#FF3B45] font-bold ml-1 cursor-pointer"
            >
              {viewMode === 'login' ? 'Бүртгүүлэх' : 'Нэвтрэх'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
