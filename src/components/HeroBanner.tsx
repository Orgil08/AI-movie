import React from 'react';
import { Play, Info, Star, ShieldCheck, Film } from 'lucide-react';
import { Movie, getLocalizedMovieText } from '../data/movies.js';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';
import { isMovieLockedForSubscription } from '../utils/accessControl.js';

interface HeroBannerProps {
  movie: Movie;
  onPlay: (movie: Movie) => void;
  onSelect: (movie: Movie) => void;
  hasActiveSubscription: boolean;
  subscription?: any;
  userRole?: string;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  movie,
  onPlay,
  onSelect,
  hasActiveSubscription,
  subscription,
  userRole
}) => {
  const t = useTranslations('HomePage');
  const { locale } = useLocale();

  if (!movie) return null;

  const title = getLocalizedMovieText(movie.title, locale, movie.titleMn);
  const altTitle = locale === 'mn'
    ? (movie.titleEn || getLocalizedMovieText(movie.title, 'en', ''))
    : (movie.titleMn || getLocalizedMovieText(movie.title, 'mn', ''));
  const synopsis = getLocalizedMovieText(
    movie.synopsis,
    locale,
    (movie as any).synopsisMn || movie.descriptionMn
  );
  const director = getLocalizedMovieText(movie.director, locale, movie.directorMn);
  const genre =
    getLocalizedMovieText(movie.genre, locale, movie.genreMn) ||
    ((movie as any).genres || []).join(' • ');
  const bannerSrc = movie.bannerUrl || (movie as any).backdropUrl || movie.posterUrl;

  const isLocked =
    subscription !== undefined
      ? isMovieLockedForSubscription(movie, subscription, userRole)
      : movie.isPremium && !hasActiveSubscription;

  return (
    <div className="relative w-full h-[76vh] min-h-[540px] max-h-[760px] bg-[#0b0f19] overflow-hidden select-none">
      {/* Background Cinematic Banner Image with Fallback */}
      <img
        src={bannerSrc}
        alt={title}
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.6] contrast-[1.12] transition-transform duration-1000 ease-out"
      />

      {/* Streamline Midnight & Gold Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b0f19] via-[#0b0f19]/85 to-transparent w-full lg:w-3/4" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Content Container */}
      <div className="relative w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 h-full flex flex-col justify-end pb-16 md:pb-24 z-10">
        <div className="max-w-3xl space-y-4">
          {/* Streamline Tag & Metadata strip */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-0.5 rounded-md bg-[#e5a93c] text-black font-extrabold tracking-wider uppercase text-[11px] shadow-sm">
              SODON GOLD
            </span>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[#e5a93c] border border-[#e5a93c]/30 font-bold">
              <Star className="w-3.5 h-3.5 fill-[#e5a93c] text-[#e5a93c]" />
              <span>{movie.rating}</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-md text-slate-300">
              {movie.year}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-md text-slate-300">
              {movie.duration}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/15 text-slate-200">
              {movie.quality}
            </span>
            {movie.isPremium && (
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 text-[#e5a93c] border border-amber-500/30 flex items-center gap-1 font-medium uppercase">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{movie.minPlan || 'basic'} VIP</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
            {title}
          </h1>

          {/* Subtitle / Genre / Director */}
          <div className="text-xs sm:text-sm font-medium text-slate-400 flex items-center gap-2 flex-wrap">
            <span className="text-[#e5a93c]">{genre}</span>
            {altTitle && (
              <>
                <span className="text-slate-600">·</span>
                <span>{altTitle}</span>
              </>
            )}
            {director && (
              <>
                <span className="text-slate-600">·</span>
                <span>{locale === 'en' ? `Directed by ${director}` : `Найруулагч: ${director}`}</span>
              </>
            )}
          </div>

          {/* Synopsis */}
          <p className="text-sm sm:text-base text-slate-300 line-clamp-3 leading-relaxed drop-shadow max-w-xl">
            {synopsis}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onPlay(movie)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#e5a93c] via-amber-400 to-[#e5a93c] text-black font-extrabold text-sm sm:text-base flex items-center gap-2.5 hover:brightness-110 transition active:scale-95 shadow-xl shadow-amber-900/40 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-black" />
              <span>
                {!isLocked
                  ? t('watchNow')
                  : `${t('watchNow')} (${(movie.minPlan || 'basic').toUpperCase()} VIP)`}
              </span>
            </button>

            <button
              onClick={() => onSelect(movie)}
              className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md text-white font-semibold text-sm sm:text-base flex items-center gap-2 border border-white/20 transition active:scale-95 cursor-pointer"
            >
              <Info className="w-4 h-4 text-[#e5a93c]" />
              <span>{t('moreInfo')}</span>
            </button>

            <button
              onClick={() => onSelect(movie)}
              className="hidden sm:flex px-4 py-3 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-md text-slate-300 hover:text-white text-sm font-medium items-center gap-2 border border-white/10 transition cursor-pointer"
            >
              <Film className="w-4 h-4" />
              <span>{t('trailer')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
