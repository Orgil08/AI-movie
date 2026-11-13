import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Movie, getLocalizedMovieText } from '../data/movies';
import {
  Play,
  Info,
  Star,
  Lock,
  Search,
  SlidersHorizontal,
  Film,
  Bookmark,
  Check,
  Loader2,
  X
} from 'lucide-react';
import { useLocale } from '../i18n/I18nContext.js';
import { getMovieTitleSuggestions } from '../utils/movieFilter.js';
import { MoviePoster } from './MoviePoster.js';

interface MovieCatalogueViewProps {
  movies: Movie[];
  hasSubscription?: boolean;
  hasActiveSubscription?: boolean;
  subscription?: any;
  userRole?: string;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onOpenPricing?: () => void;
  onSelectMovie?: (movie: Movie) => void;
  onSelect?: (movie: Movie) => void;
  onPlayMovie?: (movie: Movie) => void;
  onPlay?: (movie: Movie) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  externalGenre?: string;
  onExternalGenreChange?: (genre: string) => void;
  navFilter?: 'all' | 'originals' | 'hot';
  onClearNavFilter?: () => void;
  myListIds?: string[];
  onToggleMyList?: (movie: Movie) => void;
}

const GENRE_FILTERS = [
  { id: 'all', labelMn: 'Бүгд', labelEn: 'All' },
  { id: 'sci-fi', labelMn: 'AI Sci-Fi', labelEn: 'AI Sci-Fi', match: ['sci-fi', 'уран зөгнөлт', 'киберпанк'] },
  { id: 'action-adv', labelMn: 'Адал явдалт', labelEn: 'Adventure', match: ['адал явдалт', 'adventure'] },
  { id: 'noir', labelMn: 'Neo-Noir', labelEn: 'Neo-Noir', match: ['нео-нуар', 'neo-noir', 'триллер'] },
  { id: 'mystic', labelMn: 'Мистик', labelEn: 'Mystic', match: ['мистик', 'mystic', 'уран сэтгэмж'] },
  { id: 'doc', labelMn: 'Баримтат', labelEn: 'Documentary', match: ['баримтат', 'documentary'] },
  { id: 'action', labelMn: 'Action', labelEn: 'Action', match: ['action', 'тулаант', 'адал явдалт'] },
  { id: 'drama', labelMn: 'Drama', labelEn: 'Drama', match: ['драм', 'drama', 'хайр дурлал'] },
  { id: 'comedy', labelMn: 'Comedy', labelEn: 'Comedy', match: ['инээдэм', 'comedy'] },
  { id: 'animation', labelMn: 'Animation', labelEn: 'Animation', match: ['анимэ', 'animation', 'хүүхэлдэйн'] }
];

export const MovieCatalogueView: React.FC<MovieCatalogueViewProps> = ({
  movies,
  hasSubscription,
  hasActiveSubscription,
  onSelectMovie,
  onSelect,
  onPlayMovie,
  onPlay,
  searchQuery,
  setSearchQuery,
  externalGenre,
  onExternalGenreChange,
  myListIds = [],
  onToggleMyList
}) => {
  const { locale } = useLocale();
  const resolvedHasSubscription = Boolean(hasSubscription ?? hasActiveSubscription);
  const handleSelectMovie = (m: Movie) => {
    if (onSelectMovie) onSelectMovie(m);
    else if (onSelect) onSelect(m);
  };
  const handlePlayMovie = (m: Movie) => {
    if (onPlayMovie) onPlayMovie(m);
    else if (onPlay) onPlay(m);
  };
  const [selectedGenre, setSelectedGenre] = useState('all');

  useEffect(() => {
    if (externalGenre && externalGenre !== 'all') {
      const matched = GENRE_FILTERS.find(
        (g) =>
          g.id === externalGenre ||
          g.labelMn.toLowerCase() === externalGenre.toLowerCase() ||
          (g.match && g.match.some((kw) => externalGenre.toLowerCase().includes(kw)))
      );
      if (matched) {
        setSelectedGenre(matched.id);
      }
    } else if (externalGenre === 'all') {
      setSelectedGenre('all');
    }
  }, [externalGenre]);
  const [accessFilter, setAccessFilter] = useState<'all' | 'free' | 'vip'>('all');
  const [qualityFilter, setQualityFilter] = useState<'all' | '4K' | '1080p' | 'HDR'>('all');

  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSuggestions((prev) => (prev.length === 0 ? prev : []));
      setIsSearchingSuggestions((prev) => (prev ? false : prev));
      return;
    }

    const controller = new AbortController();
    setIsSearchingSuggestions(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/movies/suggestions?q=${encodeURIComponent(trimmed)}&limit=6`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.suggestions)) {
            setSuggestions(data.suggestions);
            setIsSearchingSuggestions(false);
            return;
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }

      setSuggestions(getMovieTitleSuggestions(movies, trimmed, 6));
      setIsSearchingSuggestions(false);
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, movies]);

  const filteredMovies = useMemo(() => {
    return movies.filter((m) => {
      const titleMn = getLocalizedMovieText(m.title, 'mn', m.titleMn);
      const titleEn = getLocalizedMovieText(m.title, 'en', m.titleEn);
      const genreMn = getLocalizedMovieText(m.genre, 'mn', m.genreMn);
      const genreEn = getLocalizedMovieText(m.genre, 'en', m.genreEn);
      const directorMn = getLocalizedMovieText(m.director, 'mn', m.directorMn);
      const directorEn = getLocalizedMovieText(m.director, 'en', m.directorEn);

      const matchesSearch =
        !searchQuery.trim() ||
        titleMn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        genreMn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        genreEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        directorMn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        directorEn.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedGenre !== 'all') {
        const filterObj = GENRE_FILTERS.find((g) => g.id === selectedGenre);
        const keywords = filterObj?.match || [selectedGenre.toLowerCase()];
        const combined = [
          genreMn,
          genreEn,
          ...(Array.isArray(m.genres) ? m.genres : []),
          ...(Array.isArray(m.tags) ? m.tags : [])
        ]
          .join(' ')
          .toLowerCase();

        if (!keywords.some((kw) => combined.includes(kw))) return false;
      }

      if (accessFilter === 'free' && m.isPremium) return false;
      if (accessFilter === 'vip' && !m.isPremium) return false;

      if (qualityFilter === '4K' && !m.quality.includes('4K')) return false;
      if (qualityFilter === 'HDR' && !m.quality.includes('HDR')) return false;
      if (qualityFilter === '1080p' && !m.quality.includes('1080p')) return false;

      return true;
    });
  }, [movies, searchQuery, selectedGenre, accessFilter, qualityFilter]);

  return (
    <div className="min-h-screen bg-[#080A10] pt-24 pb-20">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Header Section matching image_eae8b694.png */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-7 border-b border-[#252D3A]">
          <div>
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-8 rounded-full bg-[#1769FF]" />
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {locale === 'en' ? 'All Movies Library' : 'Бүх Киноны Сан'}
              </h1>
            </div>
            <p className="text-[#94A3B8] text-xs sm:text-sm mt-2">
              {locale === 'en'
                ? 'Mongolia’s first AI-generated 4K cinema streaming platform'
                : 'Монголын анхны хиймэл оюун ухаанаар бүтээгдсэн 4K кино стриминг платформ'}
            </p>
          </div>

          {/* Search Bar with Real-Time Debounced Suggestions Dropdown */}
          <div className="relative w-full md:w-96" ref={searchContainerRef}>
            <Search
              className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                searchFocused ? 'text-[#1769FF]' : 'text-[#64748B]'
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchFocused(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchFocused(false);
              }}
              placeholder={
                locale === 'en'
                  ? 'Search movie title, director...'
                  : 'Хайх киноны нэр, найруулагч...'
              }
              className={`w-full bg-[#0D111B] border rounded-xl pl-11 pr-10 py-3 text-sm text-white placeholder-[#64748B] transition-all duration-300 focus:outline-none ${
                searchFocused
                  ? 'border-[#1769FF] shadow-[0_0_20px_rgba(23,105,255,0.25)]'
                  : 'border-[#252D3A] hover:border-[#364154]'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Search Suggestions Dropdown */}
            {searchFocused && searchQuery.trim().length > 0 && (
              <div
                data-testid="catalogue-search-suggestions"
                className="absolute left-0 right-0 mt-2 rounded-2xl bg-[#0D111B] border border-[#252D3A] shadow-2xl overflow-hidden z-40 animate-searchDropdown"
              >
                <div className="px-4 py-2.5 border-b border-[#252D3A] flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    {locale === 'en' ? 'Search Suggestions' : 'Санал болгох кинонууд'}
                  </span>
                  {isSearchingSuggestions && (
                    <Loader2 className="w-3.5 h-3.5 text-[#1769FF] animate-spin" />
                  )}
                </div>

                {suggestions.length > 0 ? (
                  <div className="divide-y divide-[#252D3A]/60 max-h-80 overflow-y-auto">
                    {suggestions.map((movie) => {
                      const sugTitle = getLocalizedMovieText(
                        movie.title,
                        locale,
                        locale === 'en' ? movie.titleEn : movie.titleMn
                      );
                      return (
                        <button
                          key={movie.id}
                          type="button"
                          onClick={() => {
                            setSearchQuery(sugTitle);
                            setSearchFocused(false);
                            handleSelectMovie(movie);
                          }}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-left cursor-pointer group"
                        >
                          <div className="w-9 h-12 rounded-lg overflow-hidden bg-[#111827] shrink-0 border border-[#252D3A]">
                            <MoviePoster
                              src={movie.posterUrl}
                              alt={sugTitle}
                              seedKey={movie.id}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white group-hover:text-[#599CFF] truncate transition-colors">
                              {sugTitle}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#94A3B8]">
                              <span>{movie.year}</span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-0.5 text-[#F5B936] font-semibold">
                                <Star className="w-2.5 h-2.5 fill-[#F5B936] text-[#F5B936]" />
                                {movie.rating}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  !isSearchingSuggestions && (
                    <div className="px-4 py-5 text-center text-xs text-[#94A3B8]">
                      {locale === 'en' ? 'No matching movie titles' : 'Тохирох кино олдсонгүй'}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filter Bar matching image_eae8b694.png */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-6">
          {/* Genre Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {GENRE_FILTERS.map((g) => {
              const isSelected = selectedGenre === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setSelectedGenre(g.id);
                    if (onExternalGenreChange && g.id === 'all') {
                      onExternalGenreChange('all');
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#F5B936] text-[#080A10] border-[#F5B936] shadow-[0_4px_15px_rgba(245,185,54,0.3)]'
                      : 'bg-[#0D111B] text-[#94A3B8] hover:text-white border-[#252D3A]'
                  }`}
                >
                  {locale === 'en' ? g.labelEn : g.labelMn}
                </button>
              );
            })}
          </div>

          {/* Right Filters: Count + Access Filter + Quality Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-[#94A3B8] font-medium mr-1">
              <strong className="text-white">{filteredMovies.length}</strong>{' '}
              {locale === 'en' ? 'titles found' : 'бүтээл олдлоо'}
            </span>

            <select
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value as any)}
              className="bg-[#0D111B] border border-[#252D3A] rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-200 focus:outline-none focus:border-[#1769FF] cursor-pointer"
            >
              <option value="all">
                {locale === 'en' ? 'All Access (VIP + Free)' : 'Бүх эрх (VIP + Үнэгүй)'}
              </option>
              <option value="vip">{locale === 'en' ? 'VIP Only' : 'VIP'}</option>
              <option value="free">{locale === 'en' ? 'Free Only' : 'Үнэгүй'}</option>
            </select>

            <select
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value as any)}
              className="bg-[#0D111B] border border-[#252D3A] rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-200 focus:outline-none focus:border-[#1769FF] cursor-pointer"
            >
              <option value="all">
                {locale === 'en' ? 'All Video Qualities' : 'Бүх дүрсний чанар'}
              </option>
              <option value="1080p">1080p</option>
              <option value="4K">4K</option>
              <option value="HDR">HDR</option>
            </select>
          </div>
        </div>

        {/* Grid Results */}
        {filteredMovies.length === 0 ? (
          <div className="rounded-3xl bg-[#0D111B] border border-[#252D3A] p-16 text-center my-8">
            <Film className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">
              {locale === 'en' ? 'No matching titles found' : 'Хайлтад тохирох кино олдсонгүй'}
            </h3>
            <p className="text-xs text-[#94A3B8] mb-6">
              {locale === 'en'
                ? 'Try clearing your filters or searching with another keyword.'
                : 'Өөр түлхүүр үгээр хайх эсвэл шүүлтүүрээ цэвэрлэж үзнэ үү.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedGenre('all');
                setAccessFilter('all');
                setQualityFilter('all');
              }}
              className="px-5 py-2.5 rounded-xl bg-[#1769FF] text-white text-xs font-bold hover:bg-[#2F7BFF] transition-colors cursor-pointer"
            >
              {locale === 'en' ? 'Reset All Filters' : 'Шүүлтүүр арилгах'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
            {filteredMovies.map((movie) => {
              const isLocked = movie.isPremium && !resolvedHasSubscription;
              const isInMyList = myListIds.includes(movie.id);
              const movieTitle = getLocalizedMovieText(
                movie.title,
                locale,
                locale === 'en' ? movie.titleEn : movie.titleMn
              );
              const isSeries = movie.type === 'series';

              return (
                <div
                  key={movie.id}
                  onClick={() => handleSelectMovie(movie)}
                  data-testid={`catalog-movie-card-${movie.id}`}
                  className="group relative rounded-2xl overflow-hidden bg-[#111827] border border-[#252D3A] hover:border-[#1769FF]/60 transition-all duration-300 hover:-translate-y-1 shadow-[0_12px_30px_rgba(0,0,0,0.45)] cursor-pointer"
                >
                  {/* Poster Container with Resilient MoviePoster Component */}
                  <div className="aspect-[2/3] w-full relative overflow-hidden bg-[#0D111B]">
                    <MoviePoster
                      src={movie.posterUrl}
                      alt={movieTitle}
                      seedKey={movie.id || movieTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#080A10] via-[#080A10]/25 to-transparent" />

                    {/* Top Left Badges matching image_eae8b694.png */}
                    <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#080A10]/85 backdrop-blur-md border border-white/10 text-[10px] font-extrabold text-white">
                        <span className="text-[#1769FF]">MN</span>
                        <span>MN</span>
                      </span>
                      {(movie.isExclusive || movie.isOriginal) && (
                        <span className="px-2 py-0.5 rounded-md bg-[#E50914] text-white text-[10px] font-black uppercase tracking-wider shadow">
                          EXCLUSIVE
                        </span>
                      )}
                    </div>

                    {/* Top Right Rating + Bookmark */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {onToggleMyList && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleMyList(movie);
                          }}
                          title={
                            isInMyList ? 'Жагсаалтаас хасах' : 'Миний жагсаалтад нэмэх'
                          }
                          className={`w-7 h-7 rounded-lg backdrop-blur-md flex items-center justify-center border transition-all cursor-pointer ${
                            isInMyList
                              ? 'bg-[#F5B936] text-[#080A10] border-[#F5B936]'
                              : 'bg-[#080A10]/80 text-white hover:bg-black border-white/15'
                          }`}
                        >
                          {isInMyList ? (
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#080A10]/85 backdrop-blur-md border border-white/10 text-[11px] font-bold text-[#F5B936]">
                        <Star className="w-3 h-3 fill-[#F5B936] text-[#F5B936]" />
                        <span>{movie.rating}</span>
                      </div>
                    </div>

                    {/* Center Hover Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/35">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayMovie(movie);
                        }}
                        className="w-12 h-12 rounded-full bg-[#1769FF] text-white flex items-center justify-center shadow-[0_0_25px_rgba(23,105,255,0.65)] transform scale-90 group-hover:scale-100 transition-transform cursor-pointer"
                      >
                        {isLocked ? (
                          <Lock className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Bottom Card Text matching image_eae8b694.png */}
                    <div className="absolute bottom-0 inset-x-0 p-3.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#94A3B8] mb-1">
                        <span className="text-[#599CFF]">
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
                        {isSeries && movie.totalEpisodes && (
                          <>
                            <span>•</span>
                            <span className="text-white/90 font-bold">
                              {movie.totalEpisodes} {locale === 'en' ? 'ep' : 'анги'}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="text-sm font-extrabold text-white line-clamp-1 group-hover:text-[#599CFF] transition-colors">
                        {movieTitle}
                      </h3>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
