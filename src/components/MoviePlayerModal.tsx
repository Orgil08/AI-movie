import React, { useEffect, useState, useRef } from 'react';
import { X, Play, Lock, AlertCircle, Sparkles, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { Movie } from '../data/movies.js';

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
            setAccessDenied(errData.message || 'Энэ киног үзэхийн тулд идэвхтэй гишүүнчлэл шаардлагатай.');
            setLoading(false);
          }
          return;
        }

        if (!res.ok) {
          throw new Error('Видео урсгал авахад алдаа гарлаа');
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="movie-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition border border-white/10 cursor-pointer"
          aria-label="Хаах"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Video Player or Denied Screen */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-neutral-400">
              <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Серверээс эрх шалгаж байна...</span>
            </div>
          ) : accessDenied ? (
            /* Access Denied Overlay */
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-900/90 to-black/80 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-800/50 flex items-center justify-center text-red-500 mb-4 shadow-xl">
                <Lock className="w-8 h-8" />
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/30 mb-2">
                Премиум контент түгжигдсэн
              </span>

              <h2 className="text-xl sm:text-2xl font-black text-white max-w-md">
                {movie.titleMn}
              </h2>

              <p className="text-sm text-neutral-300 max-w-md mt-2 leading-relaxed">
                {accessDenied}
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
                <button
                  onClick={() => {
                    onClose();
                    onGoToPricing();
                  }}
                  className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-red-900/40 transition active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>QPay-ээр гишүүн болох</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-medium transition cursor-pointer"
                >
                  Буцах
                </button>
              </div>

              <div className="mt-4 text-[11px] text-neutral-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
                <span>Wire.mn албан ёсны гарцаар QPay ашиглан 10 секундэд баталгаажина</span>
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
                Таны хөтөч видео тоглуулахыг дэмжихгүй байна.
              </video>

              {/* Verified Quality Tag */}
              <div className="absolute top-3 left-3 pointer-events-none bg-black/60 backdrop-blur-md px-2.5 py-1 rounded text-[11px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Хамгаалагдсан холболт ({streamData.quality})</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Movie Info Section */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3">
            <div>
              <h2 id="movie-modal-title" className="text-xl sm:text-2xl font-bold text-white">
                {movie.titleMn}
              </h2>
              <div className="text-xs text-neutral-400 mt-0.5">
                {movie.titleEn} • {movie.year} • {movie.duration} • Найруулагч: {movie.directorMn}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-neutral-800 text-amber-400 font-bold text-xs border border-neutral-700">
                Үнэлгээ: ★ {movie.rating}
              </span>
              <span className="px-2.5 py-1 rounded bg-neutral-800 text-neutral-200 text-xs border border-neutral-700">
                {movie.quality}
              </span>
            </div>
          </div>

          <p className="text-sm text-neutral-300 leading-relaxed">{movie.descriptionMn}</p>

          <div className="flex flex-wrap gap-2 pt-1">
            {movie.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-800/80 text-neutral-400 border border-neutral-700/60"
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
