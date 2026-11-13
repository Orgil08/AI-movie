import React, { useRef } from 'react';
import { Play, Star, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Movie, getLocalizedMovieText } from '../data/movies.js';
import { useLocale } from '../i18n/I18nContext.js';

interface MovieRowProps {
  title: string;
  subtitle?: string;
  movies: Movie[];
  hasActiveSubscription: boolean;
  subscription?: any;
  userRole?: string;
  onPlay: (movie: Movie) => void;
  onSelect: (movie: Movie) => void;
  onOpenPricing?: () => void;
  onViewAll?: () => void;
  variant?: 'featured-box' | 'standard';
  badgeText?: string;
  statsText?: string;
}

export const MovieRow: React.FC<MovieRowProps> = ({
  title,
  subtitle,
  movies,
  onPlay,
  onSelect,
  onViewAll,
  variant = 'standard',
  badgeText,
  statsText
}) => {
  const { locale } = useLocale();
  const rowRef = useRef<HTMLDivElement>(null);

  if (!movies || movies.length === 0) return null;

  const scrollRow = (direction: 'left' | 'right') => {
    if (!rowRef.current) return;
    const scrollAmount = Math.max(320, rowRef.current.clientWidth * 0.75);
    rowRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const totalEpisodesSum = movies.reduce(
    (sum, m) => sum + (m.type === 'series' ? Number(m.totalEpisodes || 50) : 1),
    0
  );

  const renderCards = () => (
    <div
      ref={rowRef}
      className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto no-scrollbar scroll-smooth pb-2 pt-1"
    >
      {movies.map((movie) => {
        const movieTitle = getLocalizedMovieText(movie.title, locale, movie.titleMn);
        const genre =
          getLocalizedMovieText(movie.genre, locale, movie.genreMn) ||
          ((movie as any).genres || []).slice(0, 2).join(' · ');
        const isSeries = movie.type === 'series';
        const epCount = isSeries ? movie.totalEpisodes || 50 : null;

        return (
          <div
            key={movie.id}
            onClick={() => onSelect(movie)}
            className="group relative w-[175px] sm:w-[205px] md:w-[225px] lg:w-[238px] shrink-0 rounded-2xl overflow-hidden bg-[#11141D] border border-[#252A36] card-hover-glow cursor-pointer flex flex-col select-none"
          >
            {/* Poster Container */}
            <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#080A10]">
              <img
                src={movie.posterUrl || '/src/assets/images/hero_nomad_2099_1794122759432.jpg'}
                alt={movieTitle}
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (!img.src.includes('hero_nomad_2099')) {
                    img.src = '/src/assets/images/hero_nomad_2099_1794122759432.jpg';
                  }
                }}
              />

              {/* Top-left Mongolian Subtitle / Type Badge */}
              <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
                {movie.hasMongolianSubtitles !== false && (
                  <span className="px-2 py-0.5 rounded-full bg-[#080A10]/85 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white flex items-center gap-1 shadow-sm">
                    <span>🇲🇳</span>
                    <span>MN</span>
                  </span>
                )}
              </div>

              {/* Top-right Star Rating Badge */}
              <div className="absolute top-2.5 right-2.5 z-10">
                <span className="px-2 py-0.5 rounded-full bg-[#080A10]/85 backdrop-blur-md border border-white/15 text-[10px] font-bold text-[#E8B94F] flex items-center gap-1 shadow-sm">
                  <Star className="w-2.5 h-2.5 fill-[#E8B94F] text-[#E8B94F]" />
                  <span>{movie.rating}</span>
                </span>
              </div>

              {/* Exclusive / Original center-bottom pill */}
              {(movie.isExclusive || movie.isOriginal) && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10">
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-600 to-pink-500 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1 whitespace-nowrap">
                    <Play className="w-2.5 h-2.5 fill-white" />
                    <span>{movie.isExclusive ? 'EXCLUSIVE' : 'ORIGINAL'}</span>
                  </span>
                </div>
              )}

              {/* Bottom Dark Gradient Overlay with Metadata & Title (Screenshot 1) */}
              <div className="absolute inset-x-0 bottom-0 pt-14 pb-3.5 px-3.5 bg-gradient-to-t from-[#080A10] via-[#080A10]/90 to-transparent flex flex-col justify-end">
                <div className="w-4 h-[2px] rounded-full bg-[#1764F5] mb-1.5" />
                <div className="flex items-center justify-between text-[11px] font-medium text-[#9CA3AF]">
                  <div className="flex items-center gap-1">
                    <span className="text-[#347DFF] font-semibold">
                      {isSeries
                        ? locale === 'en'
                          ? 'Series'
                          : 'Цуврал'
                        : locale === 'en'
                        ? 'Movie'
                        : 'Кино'}
                    </span>
                    <span>·</span>
                    <span>{movie.year}</span>
                  </div>
                  {epCount && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-200 font-semibold">
                      {locale === 'en' ? `${epCount} ep` : `${epCount} анги`}
                    </span>
                  )}
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1 mt-0.5 group-hover:text-[#347DFF] transition-colors">
                  {movieTitle}
                </h3>
              </div>

              {/* Hover Quick Details & Watch Overlay */}
              <div className="absolute inset-0 bg-[#080A10]/70 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-4 text-center z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(movie);
                  }}
                  aria-label={`Play ${movieTitle}`}
                  className="w-12 h-12 rounded-full bg-[#1764F5] hover:bg-[#347DFF] text-white flex items-center justify-center shadow-[0_0_24px_rgba(23,100,245,0.65)] transform scale-90 group-hover:scale-100 transition duration-200 cursor-pointer mb-2.5"
                >
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </button>
                <span className="text-xs font-bold text-white line-clamp-2 mb-1">{movieTitle}</span>
                <span className="text-[11px] text-[#9CA3AF] line-clamp-1">{genre}</span>
                {isSeries && movie.freeEpisodes ? (
                  <span className="mt-2 px-2.5 py-0.5 rounded-full bg-[#E8B94F]/15 border border-[#E8B94F]/40 text-[#E8B94F] text-[10px] font-bold">
                    {locale === 'en'
                      ? `First ${movie.freeEpisodes} Ep Free`
                      : `Эхний ${movie.freeEpisodes} анги үнэгүй`}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (variant === 'featured-box') {
    return (
      <section className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 py-4">
        <div className="rounded-3xl bg-[#10131D] border border-[#252A36] p-5 sm:p-7 shadow-xl">
          {/* Top Pill Strip */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#080A10] border border-[#252A36] text-xs font-semibold text-white">
              <span>🇲🇳</span>
              <span>{badgeText || (locale === 'en' ? 'Mongolian Subtitles' : 'Монгол хадмалтай')}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1764F5]/10 border border-[#1764F5]/30 text-xs font-medium text-[#347DFF]">
              {statsText ||
                (locale === 'en'
                  ? `${movies.length} titles · Movies & Short Dramas`
                  : `${movies.length} монгол хадмалтай · Кино ба богино драм`)}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#080A10] border border-[#252A36] text-xs text-[#9CA3AF]">
              {locale === 'en' ? `Total ${totalEpisodesSum} episodes` : `Нийт ${totalEpisodesSum} анги`}
            </span>
          </div>

          {/* Title & Right Controls */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {title}
              </h2>
              {subtitle && <p className="text-xs sm:text-sm text-[#9CA3AF]">{subtitle}</p>}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => scrollRow('left')}
                aria-label="Scroll left"
                className="w-8 h-8 rounded-full bg-[#080A10] hover:bg-[#1764F5] border border-[#252A36] text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollRow('right')}
                aria-label="Scroll right"
                className="w-8 h-8 rounded-full bg-[#080A10] hover:bg-[#1764F5] border border-[#252A36] text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {onViewAll && (
                <button
                  type="button"
                  onClick={onViewAll}
                  className="px-3.5 py-1.5 rounded-full bg-[#1764F5]/15 hover:bg-[#1764F5] border border-[#1764F5]/40 text-xs font-semibold text-[#347DFF] hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>{locale === 'en' ? 'All Subtitled' : 'Бүх хадмалтай кино'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {renderCards()}
        </div>
      </section>
    );
  }

  return (
    <section className="py-5 px-4 sm:px-6 lg:px-10 w-full max-w-[1680px] mx-auto">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-5 rounded-full bg-[#1764F5] shadow-[0_0_10px_#1764F5]" />
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">{title}</h2>
          </div>
          {subtitle && <p className="text-xs text-[#9CA3AF] mt-1 ml-4">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => scrollRow('left')}
            aria-label="Scroll left"
            className="w-8 h-8 rounded-full bg-[#10131D] hover:bg-[#1764F5] border border-[#252A36] text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollRow('right')}
            aria-label="Scroll right"
            className="w-8 h-8 rounded-full bg-[#10131D] hover:bg-[#1764F5] border border-[#252A36] text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {renderCards()}
    </section>
  );
};
