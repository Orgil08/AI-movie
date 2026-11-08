import React, { useEffect, useState, useRef } from 'react';
import { X, Lock, CheckCircle2, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { Movie, getLocalizedMovieText } from '../data/movies.js';
import { useLocale, useTranslations } from '../i18n/I18nContext.js';

interface MoviePlayerModalProps {
  movie: Movie | null;
  onClose: () => void;
  onGoToPricing: () => void;
  hasActiveSubscription: boolean;
}

interface StreamResponse {
  authorized: boolean;
  movieId: string;
  titleMn: string;
  quality: string;
  streamUrl: string;
  token: string;
  expiresAt: number;
}

export const MoviePlayerModal: React.FC<MoviePlayerModalProps> = ({
  movie,
  onClose,
  onGoToPricing,
  hasActiveSubscription
}) => {
  const { locale } = useLocale();
  const tPlayer = useTranslations('Player');

  const [loading, setLoading] = useState(false);
  const [streamData, setStreamData] = useState<StreamResponse | null>(null);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!movie) {
      setStreamData(null);
      setAccessDenied(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setAccessDenied(null);

    // Call server-side verification endpoint
    fetch(`/api/movies/${movie.id}/stream`)
      .then(async (res) => {
        if (res.status === 403) {
          const errData = await res.json();
          if (isMounted) {
            setAccessDenied(
              errData.message || (locale === 'en' ? 'Active subscription required for 4K streaming.' : 'Энэ киног үзэхийн тулд идэвхтэй гишүүнчлэл шаардлагатай.')
            );
            setLoading(false);
          }
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to retrieve streaming token');
        }

        const data: StreamResponse = await res.json();
        if (isMounted) {
          setStreamData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setAccessDenied(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [movie]);

  if (!movie) return null;

  const title = getLocalizedMovieText(movie.title, locale, movie.titleMn);
  const altTitle = locale === 'mn' ? movie.titleEn : movie.titleMn;
  const synopsis = getLocalizedMovieText(movie.synopsis, locale, movie.descriptionMn);
  const director = getLocalizedMovieText(movie.director, locale, movie.directorMn);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="movie-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none"
    >
      <div className="relative w-full max-w-4xl bg-[#0b0f19] rounded-2xl overflow-hidden border border-white/15 shadow-2xl shadow-black flex flex-col max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-slate-300 hover:text-white flex items-center justify-center transition border border-white/10 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Video Player or Denied Screen */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <div className="w-10 h-10 border-2 border-[#e5a93c] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">{tPlayer('loading')}</span>
            </div>
          ) : accessDenied ? (
            /* Access Denied Overlay */
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#070a12]/95 to-black/85 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[#e5a93c]/20 border border-[#e5a93c]/50 flex items-center justify-center text-[#e5a93c] mb-4 shadow-xl">
                <Lock className="w-8 h-8" />
              </div>

              <span className="px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-[#e5a93c]/20 text-[#e5a93c] border border-[#e5a93c]/30 mb-2">
                {tPlayer('serverLocked')}
              </span>

              <h2 className="text-xl sm:text-2xl font-black text-white max-w-md">
                {title}
              </h2>

              <p className="text-sm text-slate-300 max-w-md mt-2 leading-relaxed">
                {tPlayer('lockSubtitle')}
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
                <button
                  onClick={() => {
                    onClose();
                    onGoToPricing();
                  }}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#e5a93c] via-amber-400 to-[#e5a93c] text-black font-extrabold text-sm flex items-center gap-2 shadow-xl shadow-amber-950/40 hover:brightness-110 transition active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 fill-black" />
                  <span>{tPlayer('upgradePlan')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-sm font-semibold transition cursor-pointer"
                >
                  {tPlayer('backToBrowse')}
                </button>
              </div>

              <div className="mt-4 text-[11px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#e5a93c]" />
                <span>
                  {locale === 'en'
                    ? 'Verified by Wire.mn (QPay) and Khan Bank settlement'
                    : 'Wire.mn албан ёсны гарцаар QPay ашиглан 10 секундэд баталгаажина'}
                </span>
              </div>
            </div>
          ) : streamData ? (
            /* Authorized Video Player */
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                src={streamData.streamUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                {locale === 'en' ? 'Your browser does not support HTML5 video.' : 'Таны хөтөч видео тоглуулахыг дэмжихгүй байна.'}
              </video>

              {/* Verified Quality Tag */}
              <div className="absolute top-3 left-3 pointer-events-none bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-bold text-[#e5a93c] border border-[#e5a93c]/30 flex items-center gap-1.5 shadow-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{tPlayer('authorizedStream')} ({streamData.quality})</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Movie Info Section */}
        <div className="p-6 overflow-y-auto space-y-4 bg-[#0b0f19]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <h2 id="movie-modal-title" className="text-xl sm:text-2xl font-black text-white">
                {title}
              </h2>
              <div className="text-xs text-slate-400 mt-0.5">
                {altTitle} • {movie.year} • {movie.duration} •{' '}
                {locale === 'en' ? `Directed by ${director}` : `Найруулагч: ${director}`}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-black/60 text-[#e5a93c] font-bold text-xs border border-[#e5a93c]/30">
                ★ {movie.rating}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-white/5 text-slate-200 text-xs border border-white/10">
                {movie.quality}
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">{synopsis}</p>

          <div className="flex flex-wrap gap-2 pt-1">
            {movie.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-white/5 text-slate-400 border border-white/10"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
