import React from 'react';
import { Play, Lock, Star, ShieldCheck, Film } from 'lucide-react';
import { Movie, getLocalizedMovieText } from '../data/movies.js';
import { useLocale, useTranslations } from '../i18n/I18nContext.js';

interface MovieRowProps {
  title: string;
  subtitle?: string;
  movies: Movie[];
  hasActiveSubscription: boolean;
  onPlay: (movie: Movie) => void;
  onSelect: (movie: Movie) => void;
  onOpenPricing?: () => void;
}

export const MovieRow: React.FC<MovieRowProps> = ({
  title,
  subtitle,
  movies,
  hasActiveSubscription,
  onPlay,
  onSelect,
  onOpenPricing
}) => {
  const { locale } = useLocale();
  const tMovies = useTranslations('Movies');

  return (
    <section className="py-7 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Streamline Section Header */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-[#e5a93c]"></span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {title}
            </h2>
          </div>
          {subtitle && <p className="text-xs sm:text-sm text-slate-400 mt-1">{subtitle}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
        {movies.map((movie) => {
          const isLocked = movie.isPremium && !hasActiveSubscription;
          const movieTitle = getLocalizedMovieText(movie.title, locale, movie.titleMn);
          const genre = getLocalizedMovieText(movie.genre, locale, movie.genreMn);

          return (
            <div
              key={movie.id}
              className="group relative rounded-xl overflow-hidden bg-[#111827]/80 border border-white/10 hover:border-[#e5a93c]/60 transition-all duration-300 hover:shadow-2xl hover:shadow-black/80 hover:-translate-y-1.5 cursor-pointer flex flex-col backdrop-blur-sm"
              onClick={() => onSelect(movie)}
            >
              {/* Poster Image Container */}
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#070a12]">
                <img
                  src={movie.posterUrl}
                  alt={movieTitle}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback to stylized SVG/CSS frame
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />

                {/* Top Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                  {movie.isPremium ? (
                    <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md bg-[#e5a93c] text-black shadow-md tracking-wider">
                      VIP
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md bg-emerald-500 text-black shadow-md tracking-wider">
                      {locale === 'en' ? 'FREE' : 'ҮНЭГҮЙ'}
                    </span>
                  )}
                </div>

                <div className="absolute top-2 right-2 z-10">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-black/75 backdrop-blur-md text-[#e5a93c] border border-[#e5a93c]/30 flex items-center gap-1 shadow-sm">
                    <Star className="w-2.5 h-2.5 fill-[#e5a93c] text-[#e5a93c]" />
                    <span>{movie.rating}</span>
                  </span>
                </div>

                {/* Lock Overlay when Premium and Unsubscribed */}
                {isLocked && (
                  <div
                    className="absolute inset-0 bg-black/75 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center transition-opacity"
                    onClick={(e) => {
                      if (onOpenPricing) {
                        e.stopPropagation();
                        onOpenPricing();
                      }
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#e5a93c]/20 border border-[#e5a93c]/50 flex items-center justify-center mb-1 text-[#e5a93c]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                      {tMovies('premiumRequired')}
                    </span>
                    <span className="text-[10px] text-[#e5a93c] font-medium mt-1 underline">
                      QPay / Хаан Банк
                    </span>
                  </div>
                )}

                {/* Hover Play Button (when unlocked) */}
                {!isLocked && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlay(movie);
                      }}
                      className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#e5a93c] to-amber-300 text-black flex items-center justify-center shadow-xl shadow-amber-950/50 transform scale-90 group-hover:scale-100 transition duration-200 cursor-pointer"
                      aria-label={`Play ${movieTitle}`}
                    >
                      <Play className="w-5 h-5 fill-black ml-0.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Card Meta info */}
              <div className="p-3.5 flex-1 flex flex-col justify-between bg-[#111827]">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-[#e5a93c] transition-colors">
                    {movieTitle}
                  </h3>
                  <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {genre}
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span>{movie.duration}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 font-semibold">
                    {movie.quality}
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
