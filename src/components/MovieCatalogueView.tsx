import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Film, Star, Lock, Play, Clock, X, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Movie, getLocalizedMovieText } from '../data/movies.js';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches
} from '../utils/recentSearches.js';
import { isMovieLockedForSubscription } from '../utils/accessControl.js';

interface MovieCatalogueViewProps {
  movies?: Movie[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onPlay: (movie: Movie) => void;
  onSelect: (movie: Movie) => void;
  hasActiveSubscription: boolean;
  subscription?: any;
  userRole?: string;
  onOpenPricing: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const PAGE_SIZE = 12;

export const MovieCatalogueView: React.FC<MovieCatalogueViewProps> = ({
  movies: propMovies,
  loading: propLoading,
  error: propError,
  onRefresh,
  onPlay,
  onSelect,
  hasActiveSubscription,
  subscription,
  userRole,
  onOpenPricing,
  searchQuery,
  setSearchQuery
}) => {
  const t = useTranslations('Movies');
  const tSearch = useTranslations('Search');
  const { locale } = useLocale();
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedQuality, setSelectedQuality] = useState<string>('all');
  const [selectedAccessFilter, setSelectedAccessFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  // Local fetch state if parent does not supply movies
  const [fetchedMovies, setFetchedMovies] = useState<Movie[]>([]);
  const [internalLoading, setInternalLoading] = useState<boolean>(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const loadMoviesFromApi = async () => {
    setInternalLoading(true);
    setInternalError(null);
    try {
      const res = await fetch('/api/movies');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load movies');
      }
      setFetchedMovies(data.movies || []);
    } catch (err: any) {
      setInternalError(err.message || 'Failed to load movies');
    } finally {
      setInternalLoading(false);
    }
  };

  useEffect(() => {
    if (propMovies === undefined) {
      loadMoviesFromApi();
    }
  }, [propMovies]);

  const sourceMovies = propMovies !== undefined ? propMovies : fetchedMovies;
  const isLoading = propLoading !== undefined ? propLoading : internalLoading;
  const errorMsg = propError !== undefined ? propError : internalError;

  // Recent Searches state
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecentSearches(getRecentSearches());

    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, selectedGenre, selectedQuality, selectedAccessFilter]);

  const handleSelectRecent = (query: string) => {
    setSearchQuery(query);
    const updated = addRecentSearch(query);
    setRecentSearches(updated);
    setIsDropdownOpen(false);
  };

  const handleRemoveRecent = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    const updated = removeRecentSearch(query);
    setRecentSearches(updated);
  };

  const handleClearAllRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentSearches();
    setRecentSearches([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmed = searchQuery.trim();
      if (trimmed) {
        const updated = addRecentSearch(trimmed);
        setRecentSearches(updated);
        setIsDropdownOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const genres = [
    { id: 'all', label: t('filterAll') },
    { id: 'scifi', label: t('filterSciFi') },
    { id: 'action', label: t('filterAction') },
    { id: 'noir', label: t('filterNoir') },
    { id: 'mystic', label: t('filterMystic') },
    { id: 'doc', label: t('filterDoc') }
  ];

  const filteredMovies = useMemo(() => {
    return sourceMovies.filter((movie) => {
      // Only published movies are visible publicly
      if ((movie as any).published === false) return false;

      const title = getLocalizedMovieText(movie.title, locale, movie.titleMn).toLowerCase();
      const altTitle = (movie.titleEn || movie.titleMn || '').toLowerCase();
      const synopsis = getLocalizedMovieText(
        movie.synopsis,
        locale,
        (movie as any).synopsisMn || movie.descriptionMn
      ).toLowerCase();
      const director = getLocalizedMovieText(movie.director, locale, movie.directorMn).toLowerCase();
      const genreStr = (
        getLocalizedMovieText(movie.genre, locale, movie.genreMn) +
        ' ' +
        ((movie as any).genres || []).join(' ')
      ).toLowerCase();
      const tags: string[] = Array.isArray(movie.tags) ? movie.tags : (movie as any).genres || [];
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !q ||
        title.includes(q) ||
        altTitle.includes(q) ||
        synopsis.includes(q) ||
        director.includes(q) ||
        genreStr.includes(q) ||
        tags.some((tag) => String(tag).toLowerCase().includes(q));

      let matchesGenre = true;
      if (selectedGenre === 'scifi') {
        matchesGenre =
          genreStr.includes('sci-fi') ||
          genreStr.includes('scifi') ||
          genreStr.includes('уран зөгнөлт') ||
          genreStr.includes('киберпанк');
      } else if (selectedGenre === 'action') {
        matchesGenre =
          genreStr.includes('адал явдалт') ||
          genreStr.includes('тулаант') ||
          genreStr.includes('action') ||
          genreStr.includes('adventure');
      } else if (selectedGenre === 'noir') {
        matchesGenre =
          genreStr.includes('нуар') ||
          genreStr.includes('noir') ||
          genreStr.includes('триллер') ||
          genreStr.includes('thriller');
      } else if (selectedGenre === 'mystic') {
        matchesGenre =
          genreStr.includes('мистик') ||
          genreStr.includes('mystic') ||
          genreStr.includes('fantasy') ||
          genreStr.includes('уран сэтгэмж');
      } else if (selectedGenre === 'doc') {
        matchesGenre = genreStr.includes('баримтат') || genreStr.includes('doc');
      } else if (selectedGenre !== 'all') {
        matchesGenre = genreStr.includes(selectedGenre.toLowerCase());
      }

      let matchesQuality = true;
      if (selectedQuality !== 'all') {
        matchesQuality = movie.quality === selectedQuality;
      }

      let matchesAccess = true;
      if (selectedAccessFilter === 'free') {
        matchesAccess = !movie.isPremium;
      } else if (selectedAccessFilter === 'premium') {
        matchesAccess = Boolean(movie.isPremium);
      }

      return matchesSearch && matchesGenre && matchesQuality && matchesAccess;
    });
  }, [sourceMovies, searchQuery, selectedGenre, selectedQuality, selectedAccessFilter, locale]);

  const paginatedMovies = useMemo(
    () => filteredMovies.slice(0, visibleCount),
    [filteredMovies, visibleCount]
  );

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

        {/* Search Container with Recent Searches Dropdown & Quick Access */}
        <div ref={searchContainerRef} className="relative w-full md:w-96 flex flex-col gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isDropdownOpen) setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={t('searchPrompt')}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#111827] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#e5a93c] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title={tSearch('clearSearch')}
                aria-label={tSearch('clearSearch')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Access Badges: Last 5 Searches */}
          {recentSearches.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
              <span className="text-slate-400 flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider">
                <Clock className="w-2.5 h-2.5 text-[#e5a93c]" />
                {tSearch('recentSearches')}:
              </span>
              {recentSearches.map((item) => (
                <button
                  key={`pill-${item}`}
                  type="button"
                  onClick={() => handleSelectRecent(item)}
                  className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-[#e5a93c]/20 hover:text-[#e5a93c] text-slate-300 border border-white/10 hover:border-[#e5a93c]/40 text-[11px] transition cursor-pointer flex items-center gap-1"
                >
                  <span className="truncate max-w-[120px]">{item}</span>
                </button>
              ))}
            </div>
          )}

          {/* Dropdown Menu (visible on focus / click) */}
          {isDropdownOpen && recentSearches.length > 0 && (
            <div className="absolute left-0 right-0 top-12 z-50 rounded-xl bg-[#0d1322] border border-[#e5a93c]/30 shadow-2xl backdrop-blur-xl p-2.5 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between px-2 pt-1 pb-1.5 border-b border-white/10">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Clock className="w-3 h-3 text-[#e5a93c]" />
                  {tSearch('recentSearches')}
                </span>
                <button
                  type="button"
                  onClick={handleClearAllRecent}
                  className="text-[10px] font-semibold text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  {tSearch('clearAll')}
                </button>
              </div>

              <div className="space-y-1">
                {recentSearches.map((item) => (
                  <div
                    key={`dropdown-${item}`}
                    onClick={() => handleSelectRecent(item)}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/10 hover:text-white transition group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Clock className="w-3 h-3 text-slate-400 group-hover:text-[#e5a93c] transition-colors shrink-0" />
                      <span className="truncate font-medium">{item}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveRecent(e, item)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition rounded hover:bg-white/5 cursor-pointer ml-2"
                      title={locale === 'en' ? 'Remove search' : 'Устгах'}
                      aria-label={locale === 'en' ? `Remove search ${item}` : `${item} хайлтыг устгах`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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

        {/* Results Counter, Access filter & Quality filter */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 shrink-0">
          <span>
            <strong className="text-white">{filteredMovies.length}</strong> {t('resultsCount')}
          </span>
          <select
            value={selectedAccessFilter}
            onChange={(e) => setSelectedAccessFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg bg-[#111827] border border-white/10 text-xs text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">{locale === 'en' ? 'All Access' : 'Бүх эрх (VIP + Үнэгүй)'}</option>
            <option value="free">{locale === 'en' ? 'Free Only' : 'Зөвхөн Үнэгүй'}</option>
            <option value="premium">{locale === 'en' ? 'VIP Only' : 'Зөвхөн VIP'}</option>
          </select>
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

      {/* Loading / Error / Empty / Movies Grid */}
      {isLoading ? (
        <div className="py-24 text-center rounded-2xl bg-[#111827]/60 border border-white/10 space-y-3">
          <div className="w-10 h-10 border-2 border-[#e5a93c] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">
            {locale === 'en' ? 'Loading movie catalogue...' : 'Кино сан ачаалж байна...'}
          </p>
        </div>
      ) : errorMsg ? (
        <div className="py-20 text-center rounded-2xl bg-[#111827] border border-rose-500/30 space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
          <h3 className="text-base font-bold text-white">
            {locale === 'en' ? 'Could not load movies' : 'Киноны жагсаалт ачаалахад алдаа гарлаа'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">{errorMsg}</p>
          <button
            onClick={() => (onRefresh ? onRefresh() : loadMoviesFromApi())}
            className="px-4 py-2 rounded-lg bg-[#e5a93c] text-black text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{locale === 'en' ? 'Retry' : 'Дахин оролдох'}</span>
          </button>
        </div>
      ) : filteredMovies.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-[#111827] border border-white/10 space-y-3">
          <Film className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">{t('noMoviesFound')}</h3>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedGenre('all');
              setSelectedQuality('all');
              setSelectedAccessFilter('all');
            }}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
          >
            {t('clearFilter')}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
            {paginatedMovies.map((movie) => {
              const isLocked =
                subscription !== undefined
                  ? isMovieLockedForSubscription(movie, subscription, userRole)
                  : movie.isPremium && !hasActiveSubscription;
              const movieTitle = getLocalizedMovieText(movie.title, locale, movie.titleMn);
              const genre =
                getLocalizedMovieText(movie.genre, locale, movie.genreMn) ||
                ((movie as any).genres || []).join(' • ');

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
                          {(movie.minPlan || 'VIP').toUpperCase()}
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
                        <span className="text-[10px] text-[#e5a93c] font-bold mt-0.5 uppercase">
                          {(movie.minPlan || 'basic').toUpperCase()}+ БАГЦ
                        </span>
                        <span className="text-[10px] text-slate-300 font-medium mt-1 underline">
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

          {/* Pagination / Load More */}
          {filteredMovies.length > visibleCount && (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold transition cursor-pointer"
              >
                {locale === 'en'
                  ? `Load More (${filteredMovies.length - visibleCount} remaining)`
                  : `Цааш үзэх (+${filteredMovies.length - visibleCount} кино)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
