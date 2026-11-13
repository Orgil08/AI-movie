import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Calendar,
  Info,
  Trash2,
  Film,
  ArrowUpDown,
  Search,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { Movie, MOVIES, getLocalizedMovieText } from '../data/movies.js';
import { WatchHistoryItem } from '../utils/watchProgress.js';
import { useLocale } from '../i18n/I18nContext.js';

interface WatchHistoryViewProps {
  historyList: WatchHistoryItem[];
  movies?: Movie[];
  onPlayMovie: (movie: Movie) => void;
  onSelectMovie: (movie: Movie) => void;
  onRemoveItem: (movieId: string) => void;
  onClearAll: () => void;
  onBrowseMovies: () => void;
}

export const WatchHistoryView: React.FC<WatchHistoryViewProps> = ({
  historyList,
  movies = [],
  onPlayMovie,
  onSelectMovie,
  onRemoveItem,
  onClearAll,
  onBrowseMovies
}) => {
  const { locale } = useLocale();
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [filterQuery, setFilterQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const catalogueSource = useMemo(() => {
    const map = new Map<string, Movie>();
    for (const m of MOVIES) {
      map.set(m.id, m);
      if (m.slug) map.set(m.slug, m);
    }
    for (const m of movies) {
      map.set(m.id, m);
      if (m.slug) map.set(m.slug, m);
    }
    return map;
  }, [movies]);

  const resolvedHistory = useMemo(() => {
    const items = historyList
      .map((entry) => {
        const movie = catalogueSource.get(entry.movieId);
        if (!movie) return null;
        return {
          entry,
          movie
        };
      })
      .filter((item): item is { entry: WatchHistoryItem; movie: Movie } => item !== null);

    const filtered = filterQuery.trim()
      ? items.filter(({ movie }) => {
          const q = filterQuery.toLowerCase();
          const titleMn = (movie.titleMn || '').toLowerCase();
          const titleEn = (movie.titleEn || '').toLowerCase();
          const genreMn = (movie.genreMn || '').toLowerCase();
          return titleMn.includes(q) || titleEn.includes(q) || genreMn.includes(q);
        })
      : items;

    return [...filtered].sort((a, b) =>
      sortOrder === 'desc'
        ? b.entry.finishedAt - a.entry.finishedAt
        : a.entry.finishedAt - b.entry.finishedAt
    );
  }, [historyList, catalogueSource, filterQuery, sortOrder]);

  const formatFinishedDate = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'mn-MN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return new Date(timestamp).toISOString().slice(0, 10);
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const diffMs = Math.max(0, Date.now() - timestamp);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (locale === 'en') {
      if (diffHours < 1) return 'Finished just now';
      if (diffHours < 24) return `Finished ${diffHours}h ago`;
      if (diffDays === 1) return 'Finished yesterday';
      return `Finished ${diffDays} days ago`;
    } else {
      if (diffHours < 1) return 'Дөнгөж сая үзэж дууссан';
      if (diffHours < 24) return `${diffHours} цагийн өмнө дуусгасан`;
      if (diffDays === 1) return 'Өчигдөр үзэж дууссан';
      return `${diffDays} өдрийн өмнө дуусгасан`;
    }
  };

  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-[#111827] via-[#0f172a] to-[#0b0f19] border border-white/10 p-6 sm:p-8 shadow-2xl mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{locale === 'en' ? 'COMPLETED CINEMA LOG' : 'ҮЗЭЖ ДУУССАН КИНОНЫ ТҮҮХ'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {locale === 'en' ? 'Watch History' : 'Үзсэн киноны түүх'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              {locale === 'en'
                ? 'A chronological list of all movies you have previously finished watching, sorted by the date they were completed.'
                : 'Таны өмнө нь бүрэн үзэж дуусгасан бүх киноны жагсаалт, үзэж дууссан огноогоор эрэмбэлэгдсэн.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-center min-w-[110px]">
              <div className="text-xl sm:text-2xl font-black text-[#e5a93c]">{resolvedHistory.length}</div>
              <div className="text-[11px] text-slate-400 font-medium">
                {locale === 'en' ? 'Movies Finished' : 'Дуусгасан кино'}
              </div>
            </div>

            {historyList.length > 0 && (
              confirmClear ? (
                <div className="flex items-center gap-2 bg-rose-950/60 border border-rose-500/40 px-3 py-2 rounded-xl">
                  <span className="text-xs text-rose-200 font-semibold">
                    {locale === 'en' ? 'Clear all?' : 'Бүгдийг устгах уу?'}
                  </span>
                  <button
                    onClick={() => {
                      onClearAll();
                      setConfirmClear(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
                  >
                    {locale === 'en' ? 'Yes' : 'Тийм'}
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold transition cursor-pointer"
                  >
                    {locale === 'en' ? 'No' : 'Үгүй'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{locale === 'en' ? 'Clear History' : 'Түүх цэвэрлэх'}</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Search & Date Sort Controls */}
        {historyList.length > 0 && (
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder={
                  locale === 'en'
                    ? 'Filter finished movies by title or genre...'
                    : 'Үзэж дууссан киногоо нэр эсвэл төрлөөр шүүх...'
                }
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#e5a93c]/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {locale === 'en' ? 'Sort by finished date:' : 'Дууссан огноогоор:'}
              </span>
              <button
                onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-2 transition cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-[#e5a93c]" />
                <span>
                  {sortOrder === 'desc'
                    ? locale === 'en'
                      ? 'Newest Finished First'
                      : 'Сүүлд дуусгасан нь эхэндээ'
                    : locale === 'en'
                    ? 'Oldest Finished First'
                    : 'Эхэлж дуусгасан нь эхэндээ'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Watch History List */}
      {resolvedHistory.length === 0 ? (
        <div className="rounded-3xl bg-[#0f172a]/80 border border-white/10 p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#e5a93c]/10 border border-[#e5a93c]/30 flex items-center justify-center text-[#e5a93c] mx-auto">
            <Film className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">
            {filterQuery.trim()
              ? locale === 'en'
                ? 'No matching finished movies'
                : 'Хайлтад тохирох кино олдсонгүй'
              : locale === 'en'
              ? 'No finished movies yet'
              : 'Одоогоор үзэж дуусгасан кино байхгүй байна'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {filterQuery.trim()
              ? locale === 'en'
                ? 'Try clearing your search filter to see all movies you have finished watching.'
                : 'Хайлтын утгаа арилгаад бүх үзсэн киноны түүхээ харна уу.'
              : locale === 'en'
              ? 'Movies you finish watching will automatically appear here, sorted by the date you completed them.'
              : 'Таны бүрэн үзэж дуусгасан кинонууд дууссан огнооны дарааллаар энд автоматаар хадгалагдана.'}
          </p>
          <div className="pt-2">
            <button
              onClick={onBrowseMovies}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#e5a93c] to-amber-400 text-black font-extrabold text-xs inline-flex items-center gap-2 hover:brightness-110 transition cursor-pointer shadow-lg shadow-amber-950/30"
            >
              <Sparkles className="w-4 h-4 fill-black" />
              <span>{locale === 'en' ? 'Explore Movie Catalogue' : 'Кино сан руу очих'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {resolvedHistory.map(({ entry, movie }, idx) => {
            const title = getLocalizedMovieText(movie.title, locale, movie.titleMn);
            const altTitle = locale === 'mn' ? movie.titleEn : movie.titleMn;
            const genreLabel = getLocalizedMovieText(movie.genre, locale, movie.genreMn);
            const synopsis = getLocalizedMovieText(movie.synopsis, locale, movie.descriptionMn);

            return (
              <div
                key={`${entry.movieId}-${entry.finishedAt}`}
                data-testid={`watch-history-item-${entry.movieId}`}
                className="group relative rounded-2xl bg-[#0f172a]/90 hover:bg-[#131d33] border border-white/10 hover:border-[#e5a93c]/40 p-4 sm:p-5 transition-all duration-200 shadow-lg flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6"
              >
                {/* Thumbnail / Backdrop */}
                <div
                  onClick={() => onSelectMovie(movie)}
                  className="relative w-full sm:w-52 aspect-video rounded-xl overflow-hidden bg-slate-900 shrink-0 cursor-pointer border border-white/10"
                >
                  <img
                    src={movie.backdropUrl || movie.posterUrl}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Completed Check Badge */}
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-emerald-500/90 text-black text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow">
                    <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                    <span>{locale === 'en' ? 'Finished' : 'Үзэж дууссан'}</span>
                  </div>

                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-semibold border border-white/10">
                    {movie.duration}
                  </div>

                  {/* Full 100% progress bar indicator */}
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-500" />
                </div>

                {/* Movie Metadata & Finished Date */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[#e5a93c] font-semibold">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {locale === 'en' ? 'Finished on: ' : 'Дуусгасан огноо: '}
                        {formatFinishedDate(entry.finishedAt)}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>{formatRelativeTime(entry.finishedAt)}</span>
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-500">#{idx + 1}</span>
                      <h3
                        onClick={() => onSelectMovie(movie)}
                        className="text-base sm:text-lg font-black text-white group-hover:text-[#e5a93c] transition-colors truncate cursor-pointer"
                      >
                        {title}
                      </h3>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                      <span>{altTitle}</span>
                      <span>•</span>
                      <span>{movie.year}</span>
                      <span>•</span>
                      <span>{genreLabel}</span>
                      <span>•</span>
                      <span className="text-[#e5a93c] font-bold">★ {movie.rating}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{synopsis}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex sm:flex-col items-center sm:items-end justify-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10 shrink-0">
                  <button
                    onClick={() => onPlayMovie(movie)}
                    className="flex-1 sm:flex-initial w-full sm:w-36 px-4 py-2.5 rounded-xl bg-[#e5a93c] hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
                  >
                    <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{locale === 'en' ? 'Watch Again' : 'Дахин үзэх'}</span>
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-36">
                    <button
                      onClick={() => onSelectMovie(movie)}
                      className="flex-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>{locale === 'en' ? 'Details' : 'Дэлгэрэнгүй'}</span>
                    </button>

                    <button
                      onClick={() => onRemoveItem(entry.movieId)}
                      title={locale === 'en' ? 'Remove from history' : 'Түүхээс хасах'}
                      className="p-2 rounded-xl bg-white/5 hover:bg-rose-950/50 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
