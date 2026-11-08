import React, { useState, useMemo } from 'react';
import { Search, Film, Star, Filter, SlidersHorizontal, Lock, Play } from 'lucide-react';
import { Movie, MOVIES, getLocalizedMovieText } from '../data/movies.js';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';

interface MovieCatalogueViewProps {
  onPlay: (movie: Movie) => void;
  onSelect: (movie: Movie) => void;
  hasActiveSubscription: boolean;
  onOpenPricing: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const MovieCatalogueView: React.FC<MovieCatalogueViewProps> = ({
  onPlay,
  onSelect,
  hasActiveSubscription,
  onOpenPricing,
  searchQuery,
  setSearchQuery
}) => {
  const t = useTranslations('Movies');
  const { locale } = useLocale();
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedQuality, setSelectedQuality] = useState<string>('all');

  const genres = [
    { id: 'all', label: t('filterAll') },
    { id: 'scifi', label: t('filterSciFi') },
    { id: 'action', label: t('filterAction') },
    { id: 'noir', label: t('filterNoir') },
    { id: 'mystic', label: t('filterMystic') },
    { id: 'doc', label: t('filterDoc') }
  ];

  const filteredMovies = useMemo(() => {
    return MOVIES.filter((movie) => {
      const title = getLocalizedMovieText(movie.title, locale, movie.titleMn).toLowerCase();
      const synopsis = getLocalizedMovieText(movie.synopsis, locale, movie.descriptionMn).toLowerCase();
      const director = getLocalizedMovieText(movie.director, locale, movie.directorMn).toLowerCase();
      const genre = getLocalizedMovieText(movie.genre, locale, movie.genreMn).toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      // Search match
      const matchesSearch =
        !q ||
        title.includes(q) ||
        synopsis.includes(q) ||
        director.includes(q) ||
        movie.tags.some((tag) => tag.toLowerCase().includes(q));

      // Genre match
      let matchesGenre = true;
      if (selectedGenre === 'scifi') {
        matchesGenre = genre.includes('sci-fi') || genre.includes('уран зөгнөлт') || genre.includes('киберпанк');
      } else if (selectedGenre === 'action') {
        matchesGenre = genre.includes('адал явдалт') || genre.includes('action');
      } else if (selectedGenre === 'noir') {
        matchesGenre = genre.includes('нуар') || genre.includes('noir');
      } else if (selectedGenre === 'mystic') {
        matchesGenre = genre.includes('мистик') || genre.includes('mystic');
      } else if (selectedGenre === 'doc') {
        matchesGenre = genre.includes('баримтат') || genre.includes('doc');
      }

      // Quality match
      let matchesQuality = true;
      if (selectedQuality !== 'all') {
        matchesQuality = movie.quality === selectedQuality;
      }

      return matchesSearch && matchesGenre && matchesQuality;
    });
  }, [searchQuery, selectedGenre, selectedQuality, locale]);

  return (
    <div className="py-10 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 w-full max-w-[1920px] mx-auto space-y-8 select-none">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-4 rounded-full bg-[#e5a93c]"></span>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {t('title')}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">{t('subtitle')}</p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPrompt')}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111827] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#e5a93c]"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Genre buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {genres.map((g) => {
            const isActive = selectedGenre === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGenre(g.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-[#e5a93c] text-black font-extrabold shadow-md'
                    : 'bg-[#111827] text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                {g.label}
              </button>
            );
          })}
        </div>

        {/* Results Counter & Quality filter */}
        <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
          <span>
            <strong className="text-white">{filteredMovies.length}</strong> {t('resultsCount')}
          </span>
          <select
            value={selectedQuality}
            onChange={(e) => setSelectedQuality(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#111827] border border-white/10 text-xs text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">{locale === 'en' ? 'All Resolutions' : 'Бүх дүрсний чанар'}</option>
            <option value="4K HDR">4K HDR</option>
            <option value="1080p Full HD">1080p Full HD</option>
            <option value="720p HD">720p HD</option>
          </select>
        </div>
      </div>

      {/* Movies Grid */}
      {filteredMovies.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-[#111827] border border-white/10 space-y-3">
          <Film className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">{t('noMoviesFound')}</h3>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedGenre('all');
              setSelectedQuality('all');
            }}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
          >
            {t('clearFilter')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {filteredMovies.map((movie) => {
            const isLocked = movie.isPremium && !hasActiveSubscription;
            const movieTitle = getLocalizedMovieText(movie.title, locale, movie.titleMn);
            const genre = getLocalizedMovieText(movie.genre, locale, movie.genreMn);

            return (
              <div
                key={movie.id}
                className="group relative rounded-xl overflow-hidden bg-[#111827]/80 border border-white/10 hover:border-[#e5a93c]/60 transition-all duration-300 hover:shadow-2xl hover:shadow-black/80 hover:-translate-y-1.5 cursor-pointer flex flex-col backdrop-blur-sm"
                onClick={() => onSelect(movie)}
              >
                {/* Poster */}
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#070a12]">
                  <img
                    src={movie.posterUrl}
                    alt={movieTitle}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Badges */}
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

                  {/* Lock Overlay */}
                  {isLocked && (
                    <div
                      className="absolute inset-0 bg-black/75 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPricing();
                      }}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#e5a93c]/20 border border-[#e5a93c]/50 flex items-center justify-center mb-1 text-[#e5a93c]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                        {t('premiumRequired')}
                      </span>
                      <span className="text-[10px] text-[#e5a93c] font-medium mt-1 underline">
                        QPay / Хаан Банк
                      </span>
                    </div>
                  )}

                  {/* Hover Play Button */}
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

                {/* Info */}
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
      )}
    </div>
  );
};
