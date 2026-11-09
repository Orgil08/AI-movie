import React from 'react';
import { Play, X, Clock, Lock, Sparkles, RotateCcw } from 'lucide-react';
import { Movie, MOVIES, getLocalizedMovieText } from '../data/movies.js';
import { useLocale, useTranslations } from '../i18n/I18nContext.js';
import { WatchProgress, formatRemainingTime, formatTimestamp } from '../utils/watchProgress.js';

interface ContinueWatchingRowProps {
  progressList: WatchProgress[];
  hasActiveSubscription: boolean;
  onResume: (movie: Movie, initialTime: number) => void;
  onSelect: (movie: Movie) => void;
  onRemove: (movieId: string) => void;
  onOpenPricing?: () => void;
}

export const ContinueWatchingRow: React.FC<ContinueWatchingRowProps> = ({
  progressList,
  hasActiveSubscription,
  onResume,
  onSelect,
  onRemove,
  onOpenPricing
}) => {
  const { locale } = useLocale();
  const tHome = useTranslations('HomePage');
  const tMovies = useTranslations('Movies');

  if (!progressList || progressList.length === 0) {
    return null;
  }

  // Map progress items to movie records
  const itemsWithMovies = progressList
    .map((progress) => {
      const movie = MOVIES.find((m) => m.id === progress.movieId);
      return movie ? { progress, movie } : null;
    })
    .filter((item): item is { progress: WatchProgress; movie: Movie } => item !== null);

  if (itemsWithMovies.length === 0) {
    return null;
  }

  return (
    <section className="py-7 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 w-full max-w-[1920px] mx-auto">
      {/* Header */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-[#e5a93c]"></span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{tHome('continueWatching')}</span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {tHome('continueWatchingSub')}
          </p>
        </div>
      </div>

      {/* Grid of Continue Watching Cards (16:9 Cinematic Landscape) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {itemsWithMovies.map(({ progress, movie }) => {
          const isLocked = movie.isPremium && !hasActiveSubscription;
          const movieTitle = getLocalizedMovieText(movie.title, locale, movie.titleMn);
          const genre = getLocalizedMovieText(movie.genre, locale, movie.genreMn);
          const remainingText = formatRemainingTime(progress.currentTime, progress.duration, locale as any);
          const currentTimestamp = formatTimestamp(progress.currentTime);
          const totalTimestamp = formatTimestamp(progress.duration);

          return (
            <div
              key={`continue-${movie.id}`}
              className="group relative rounded-xl overflow-hidden bg-[#111827]/90 border border-white/10 hover:border-[#e5a93c]/60 transition-all duration-300 hover:shadow-2xl hover:shadow-black/80 hover:-translate-y-1 cursor-pointer flex flex-col backdrop-blur-sm"
              onClick={() => {
                if (isLocked) {
                  onOpenPricing ? onOpenPricing() : onSelect(movie);
                } else {
                  onResume(movie, progress.currentTime);
                }
              }}
            >
              {/* Landscape Thumbnail 16:9 */}
              <div className="relative aspect-video w-full overflow-hidden bg-[#070a12]">
                <img
                  src={movie.bannerUrl || movie.posterUrl}
                  alt={movieTitle}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                  loading="lazy"
                />

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40" />

                {/* Top Badges & Dismiss Button */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20">
                  {movie.isPremium ? (
                    <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md bg-[#e5a93c] text-black shadow-md tracking-wider">
                      VIP
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md bg-emerald-500 text-black shadow-md tracking-wider">
                      {locale === 'en' ? 'FREE' : 'ҮНЭГҮЙ'}
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[9px] font-bold text-slate-300 border border-white/10">
                    {movie.quality}
                  </span>
                </div>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(movie.id);
                  }}
                  className="absolute top-2 right-2 z-30 w-7 h-7 rounded-full bg-black/70 hover:bg-rose-950/80 hover:text-rose-400 text-slate-300 flex items-center justify-center transition border border-white/10 cursor-pointer"
                  title={tHome('removeFromContinueWatching')}
                  aria-label={tHome('removeFromContinueWatching')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Center Action (Play / Resume or Lock) */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  {isLocked ? (
                    <div className="flex flex-col items-center justify-center p-2 text-center">
                      <div className="w-10 h-10 rounded-full bg-[#e5a93c]/20 border border-[#e5a93c]/50 flex items-center justify-center text-[#e5a93c] mb-1">
                        <Lock className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                        {tMovies('premiumRequired')}
                      </span>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#e5a93c] group-hover:bg-amber-400 text-black flex items-center justify-center shadow-xl shadow-amber-950/60 transform group-hover:scale-110 transition duration-200">
                      <Play className="w-5 h-5 fill-black ml-0.5" />
                    </div>
                  )}
                </div>

                {/* Progress Bar Container on bottom edge of video */}
                <div className="absolute bottom-0 left-0 right-0 z-20">
                  <div className="w-full h-1.5 bg-black/70">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-[#e5a93c] to-amber-300"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Meta & Time Offsets */}
              <div className="p-3.5 flex flex-col justify-between flex-1 bg-[#111827]">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-[#e5a93c] transition-colors">
                      {movieTitle}
                    </h3>
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {genre}
                  </div>
                </div>

                {/* Progress Details */}
                <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <Clock className="w-3 h-3 text-[#e5a93c]" />
                    <span className="text-[#e5a93c] font-bold">{progress.percentage}%</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">{remainingText}</span>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono">
                    {currentTimestamp} / {totalTimestamp}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
