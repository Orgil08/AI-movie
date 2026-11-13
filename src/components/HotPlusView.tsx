import React, { useState, useMemo } from 'react';
import { Movie, getLocalizedMovieText } from '../data/movies.js';
import { Flame, Star, Play, Search, ShieldCheck, Film, Tv } from 'lucide-react';
import { useLocale } from '../i18n/I18nContext.js';
import { filterHotPlusMovies, isAdultRestrictedMovie } from '../utils/ageGateAndPosters.js';
import { MoviePoster } from './MoviePoster.js';

interface HotPlusViewProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie: (movie: Movie) => void;
}

const HOT_GENRES = [
  { id: 'all', labelMn: 'Бүгд', labelEn: 'All' },
  { id: 'триллер', labelMn: 'Триллер', labelEn: 'Thriller' },
  { id: 'мистик', labelMn: 'Мистик', labelEn: 'Mystic' },
  { id: 'нео-нуар', labelMn: 'Neo-Noir', labelEn: 'Neo-Noir' },
  { id: 'драм', labelMn: 'Драм', labelEn: 'Drama' },
  { id: 'sci-fi', labelMn: 'AI Sci-Fi', labelEn: 'AI Sci-Fi' }
];

export const HotPlusView: React.FC<HotPlusViewProps> = ({
  movies,
  onSelectMovie,
  onPlayMovie
}) => {
  const { locale } = useLocale();
  const [contentType, setContentType] = useState<'all' | 'movie' | 'series'>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredMovies = useMemo(
    () =>
      filterHotPlusMovies(movies, {
        contentType,
        genre: selectedGenre,
        search: searchQuery
      }),
    [movies, contentType, selectedGenre, searchQuery]
  );

  return (
    <div className="min-h-screen bg-[#080A10] pt-24 pb-20">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Hot+ 18+ Header Banner */}
        <div className="relative rounded-2xl bg-gradient-to-r from-[#1A0B12] via-[#111522] to-[#0D111B] border border-[#E50914]/30 p-6 sm:p-8 mb-8 overflow-hidden">
          <div className="pointer-events-none absolute -right-16 -top-16 w-72 h-72 rounded-full bg-[#E50914]/15 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E50914]/20 border border-[#E50914]/40 text-[#FF5A64] text-xs font-extrabold mb-3">
                <Flame className="w-3.5 h-3.5 fill-[#FF5A64]" />
                <span>HOT+ • 18+ RESTRICTED SECTION</span>
                <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#34D399] text-[10px]">
                  <ShieldCheck className="w-3 h-3" />
                  {locale === 'en' ? 'Age Verified' : '18+ Баталгаажсан'}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {locale === 'en' ? 'Hot+ & 18+ Adult Cinema' : 'Hot+ 18+ Насанд Хүрэгчдийн Сан'}
              </h1>
              <p className="text-sm text-[#94A3B8] mt-2 max-w-2xl">
                {locale === 'en'
                  ? 'Mature psychological thrillers, neo-noir mysteries, and trending late-night cinema restricted to verified 18+ viewers.'
                  : 'Зөвхөн 18 нас хүрсэн үзэгчдэд зориулсан сэтгэл зүйн триллер, нео-нуар нууцлаг бүтээлүүд болон тренд кинонууд.'}
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full lg:w-80">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  locale === 'en' ? 'Search Hot+ titles...' : 'Hot+ кино, цуврал хайх...'
                }
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D111B] border border-[#252D3A] focus:border-[#E50914] text-sm text-white placeholder-[#64748B] focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Filter Bar: Content Type Tabs + Genre Pills */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setContentType('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                contentType === 'all'
                  ? 'bg-[#E50914] text-white border-[#E50914] shadow-[0_0_20px_rgba(229,9,20,0.35)]'
                  : 'bg-[#111827] text-[#94A3B8] hover:text-white border-[#252D3A]'
              }`}
            >
              {locale === 'en' ? 'All' : 'Бүгд'}
            </button>
            <button
              type="button"
              onClick={() => setContentType('movie')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                contentType === 'movie'
                  ? 'bg-[#E50914] text-white border-[#E50914] shadow-[0_0_20px_rgba(229,9,20,0.35)]'
                  : 'bg-[#111827] text-[#94A3B8] hover:text-white border-[#252D3A]'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>{locale === 'en' ? 'Movies' : 'Кино'}</span>
            </button>
            <button
              type="button"
              onClick={() => setContentType('series')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                contentType === 'series'
                  ? 'bg-[#E50914] text-white border-[#E50914] shadow-[0_0_20px_rgba(229,9,20,0.35)]'
                  : 'bg-[#111827] text-[#94A3B8] hover:text-white border-[#252D3A]'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>{locale === 'en' ? 'Series' : 'Цуврал'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {HOT_GENRES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGenre(g.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  selectedGenre === g.id
                    ? 'bg-[#F5B936] text-[#080A10] border-[#F5B936]'
                    : 'bg-[#111827] text-[#94A3B8] hover:text-white border-[#252D3A]'
                }`}
              >
                {locale === 'en' ? g.labelEn : g.labelMn}
              </button>
            ))}
          </div>
        </div>

        {/* Hot+ Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredMovies.map((movie) => {
            const title = getLocalizedMovieText(
              movie.title,
              locale,
              locale === 'en' ? movie.titleEn : movie.titleMn
            );
            const isAdult = isAdultRestrictedMovie(movie);
            const isSeries = movie.type === 'series';

            return (
              <div
                key={movie.id}
                onClick={() => onSelectMovie(movie)}
                className="group relative rounded-2xl overflow-hidden bg-[#111827] border border-[#252D3A] hover:border-[#E50914]/60 transition-all duration-300 hover:-translate-y-1 cursor-pointer shadow-lg"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0D111B]">
                  <MoviePoster
                    src={movie.posterUrl}
                    alt={title}
                    seedKey={movie.id}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080A10] via-[#080A10]/25 to-transparent" />

                  {/* Top Left 18+ / Hot+ Badge */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow ${
                        isAdult
                          ? 'bg-[#E50914] text-white'
                          : 'bg-[#080A10]/85 text-white border border-white/15'
                      }`}
                    >
                      {isAdult ? '18+ HOT+' : movie.ageRating || '16+'}
                    </span>
                  </div>

                  {/* Top Right Rating */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#080A10]/85 backdrop-blur-md border border-white/10 text-[11px] font-bold text-[#F5B936]">
                    <Star className="w-3 h-3 fill-[#F5B936] text-[#F5B936]" />
                    <span>{movie.rating}</span>
                  </div>

                  {/* Center Hover Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/35">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayMovie(movie);
                      }}
                      className="w-12 h-12 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-[0_0_25px_rgba(229,9,20,0.6)] transform scale-95 group-hover:scale-100 transition-transform cursor-pointer"
                    >
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </button>
                  </div>

                  {/* Bottom Title & Meta Overlay */}
                  <div className="absolute bottom-0 inset-x-0 p-3.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#94A3B8] mb-1">
                      <span className="text-[#FF5A64]">
                        {isSeries
                          ? locale === 'en'
                            ? 'Series'
                            : 'Цуврал'
                          : locale === 'en'
                          ? 'Movie'
                          : 'Кино'}
                      </span>
                      <span>•</span>
                      <span>{movie.year}</span>
                      <span>•</span>
                      <span>{movie.quality === '4K HDR' ? '4K' : 'HD'}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-[#FF5A64] transition-colors">
                      {title}
                    </h3>
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
