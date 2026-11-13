import React, { useState, useMemo } from 'react';
import { Movie, getLocalizedMovieText } from '../data/movies.js';
import { Star, Play, ArrowRight, Sparkles, Film, Tv } from 'lucide-react';
import { useLocale } from '../i18n/I18nContext.js';
import { filterOriginalsMovies } from '../utils/ageGateAndPosters.js';
import { MoviePoster } from './MoviePoster.js';

interface OriginalsViewProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie: (movie: Movie) => void;
}

export const OriginalsView: React.FC<OriginalsViewProps> = ({
  movies,
  onSelectMovie,
  onPlayMovie
}) => {
  const { locale } = useLocale();
  const [contentType, setContentType] = useState<'all' | 'movie' | 'series'>('all');

  const allOriginals = useMemo(() => filterOriginalsMovies(movies, 'all'), [movies]);
  const movieOriginals = useMemo(() => filterOriginalsMovies(movies, 'movie'), [movies]);
  const seriesOriginals = useMemo(() => filterOriginalsMovies(movies, 'series'), [movies]);

  const displayedOriginals = useMemo(
    () => filterOriginalsMovies(movies, contentType),
    [movies, contentType]
  );

  return (
    <div className="min-h-screen bg-[#080A10] pt-24 pb-20">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#252D3A]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1769FF]/15 border border-[#1769FF]/30 text-[#599CFF] text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SODON AI STUDIO ORIGINALS</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              SODON AI MOVIE Originals
            </h1>
            <p className="text-sm sm:text-base text-[#94A3B8] mt-2 max-w-2xl">
              {locale === 'en'
                ? 'Exclusive full-length AI feature films and short drama series produced strictly for SODON AI MOVIE.'
                : 'Зөвхөн SODON AI MOVIE платформд зориулан бүтээгдсэн онцгой бүрэн хэмжээний AI кино болон олон ангит цувралууд.'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#94A3B8] font-medium">
            <span>{locale === 'en' ? 'Total works:' : 'Нийт бүтээл:'}</span>
            <span className="px-2.5 py-1 rounded-lg bg-[#111827] border border-[#252D3A] text-white font-bold">
              {displayedOriginals.length} {locale === 'en' ? 'titles' : 'бүтээл'}
            </span>
          </div>
        </div>

        {/* Filter Tabs (Бүгд / Кино / Цуврал) */}
        <div className="flex flex-wrap items-center gap-2.5 py-6">
          <button
            type="button"
            onClick={() => setContentType('all')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              contentType === 'all'
                ? 'bg-[#1769FF] text-white border-[#1769FF] shadow-[0_0_20px_rgba(23,105,255,0.35)]'
                : 'bg-[#111827] text-[#94A3B8] hover:text-white border-[#252D3A]'
            }`}
          >
            <span>{locale === 'en' ? 'All' : 'Бүгд'}</span>
            <span className="opacity-80">{allOriginals.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setContentType('movie')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              contentType === 'movie'
                ? 'bg-[#1769FF] text-white border-[#1769FF] shadow-[0_0_20px_rgba(23,105,255,0.35)]'
                : 'bg-[#111827] text-[#94A3B8] hover:text-white border-[#252D3A]'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>{locale === 'en' ? 'Movies' : 'Кино'}</span>
            <span className="opacity-80">{movieOriginals.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setContentType('series')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              contentType === 'series'
                ? 'bg-[#1769FF] text-white border-[#1769FF] shadow-[0_0_20px_rgba(23,105,255,0.35)]'
                : 'bg-[#111827] text-[#94A3B8] hover:text-white border-[#252D3A]'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>{locale === 'en' ? 'Series' : 'Цуврал'}</span>
            <span className="opacity-80">{seriesOriginals.length}</span>
          </button>
        </div>

        {/* 3-Column Desktop Grid of Large Cinematic Original Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedOriginals.map((movie) => {
            const title = getLocalizedMovieText(
              movie.title,
              locale,
              locale === 'en' ? movie.titleEn : movie.titleMn
            );
            const synopsis = getLocalizedMovieText(
              movie.synopsis,
              locale,
              locale === 'en'
                ? movie.descriptionEn || movie.descriptionMn
                : movie.descriptionMn
            );
            const genre = getLocalizedMovieText(
              movie.genre,
              locale,
              locale === 'en' ? movie.genreEn || movie.genreMn : movie.genreMn
            );
            const isSeries = movie.type === 'series';

            return (
              <div
                key={movie.id}
                onClick={() => onSelectMovie(movie)}
                className="group relative flex flex-col rounded-2xl overflow-hidden bg-[#111827] border border-[#252D3A] hover:border-[#1769FF]/60 transition-all duration-300 hover:-translate-y-1 shadow-[0_14px_35px_rgba(0,0,0,0.45)] cursor-pointer"
              >
                {/* Wide Cinematic Backdrop / Poster Area */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0D111B]">
                  <MoviePoster
                    src={movie.backdropUrl || movie.bannerUrl || movie.posterUrl}
                    alt={title}
                    seedKey={movie.id}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/35 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#080A10]/85 backdrop-blur-md border border-white/15 text-[11px] font-bold text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1769FF]" />
                        {isSeries
                          ? locale === 'en'
                            ? 'Series'
                            : 'Цуврал'
                          : locale === 'en'
                          ? 'Movie'
                          : 'Кино'}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-[#F5B936]/90 text-[#080A10] text-[10px] font-black uppercase tracking-wider">
                        ORIGINAL
                      </span>
                    </div>

                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#080A10]/85 backdrop-blur-md border border-white/10 text-xs font-bold text-[#F5B936]">
                      <Star className="w-3.5 h-3.5 fill-[#F5B936] text-[#F5B936]" />
                      <span>{movie.rating}</span>
                    </div>
                  </div>

                  {/* Quick Play Floating Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayMovie(movie);
                    }}
                    className="absolute bottom-3.5 right-3.5 w-11 h-11 rounded-full bg-[#1769FF] hover:bg-[#2F7BFF] text-white flex items-center justify-center shadow-[0_8px_20px_rgba(23,105,255,0.5)] opacity-90 group-hover:scale-105 transition-all cursor-pointer"
                    title={locale === 'en' ? 'Watch Now' : 'Шууд үзэх'}
                  >
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </button>
                </div>

                {/* Card Body */}
                <div className="flex flex-col flex-1 justify-between p-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A3B8] mb-2">
                      <span className="font-semibold text-white/90">{movie.year}</span>
                      <span>•</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] text-white/80 font-semibold">
                        {movie.ageRating || '13+'}
                      </span>
                      <span>•</span>
                      <span className="truncate max-w-[180px]">{genre}</span>
                    </div>

                    <h3 className="text-lg font-extrabold text-white group-hover:text-[#599CFF] transition-colors line-clamp-1 mb-2">
                      {title}
                    </h3>

                    <p className="text-xs text-[#94A3B8] line-clamp-2 leading-relaxed mb-4">
                      {synopsis}
                    </p>
                  </div>

                  {/* Footer Meta + Arrow Button */}
                  <div className="pt-3 border-t border-[#252D3A] flex items-center justify-between text-xs">
                    <span className="text-[#94A3B8] font-medium">
                      {isSeries
                        ? `${movie.totalEpisodes || 50} ${locale === 'en' ? 'episodes' : 'анги'} • ${
                            movie.quality
                          }`
                        : `${movie.duration} • ${movie.quality}`}
                    </span>

                    <span className="inline-flex items-center gap-1.5 text-white font-bold group-hover:text-[#599CFF] transition-colors">
                      <span>{locale === 'en' ? 'Details' : 'Дэлгэрэнгүй'}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
