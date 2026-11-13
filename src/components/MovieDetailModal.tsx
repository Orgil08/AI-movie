import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Plus,
  Check,
  Star,
  Film,
  Share2,
  Clock,
  Crown,
  Lock,
  Unlock,
  LayoutGrid,
  LayoutList,
  Gift,
  QrCode,
  Building2,
  Copy,
  CheckCircle2,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { Movie, getLocalizedMovieText } from '../data/movies.js';
import { useLocale, useTranslations } from '../i18n/I18nContext.js';
import { isMovieLockedForSubscription } from '../utils/accessControl.js';
import { buildMovieShareUrl, copyTextToClipboard } from '../utils/shareMovie.js';
import { buildEpisodeRanges } from '../utils/seriesEpisodes.js';
import { EpisodeGrid, PublicEpisodeItem } from './EpisodeGrid.js';
export type { PublicEpisodeItem };


interface MovieDetailModalProps {
  movie: Movie;
  onClose: () => void;
  onPlay: (movie: Movie, episodeNumber?: number) => void;
  onWatchTrailer?: (movie: Movie, trailerUrl: string) => void;
  hasActiveSubscription: boolean;
  subscription?: any;
  userRole?: string;
  currentUser?: { id: string; name: string; email: string; role?: 'user' | 'admin' } | null;
  onOpenPricing: () => void;
  onOpenAuth?: () => void;
  isInList: boolean;
  onToggleList: (movie: Movie) => void;
}

export const MovieDetailModal: React.FC<MovieDetailModalProps> = ({
  movie,
  onClose,
  onPlay,
  onWatchTrailer,
  hasActiveSubscription,
  subscription,
  userRole,
  currentUser,
  onOpenPricing,
  onOpenAuth,
  isInList,
  onToggleList
}) => {
  const { locale } = useLocale();
  const tDetails = useTranslations('MovieDetails');

  const isSeries = movie.type === 'series' || (movie.totalEpisodes && movie.totalEpisodes > 1);
  const [activeTab, setActiveTab] = useState<'episodes' | 'overview' | 'trailer'>(
    isSeries ? 'episodes' : 'overview'
  );
  const [episodeViewMode, setEpisodeViewMode] = useState<'grid' | 'numbered'>('grid');
  const [selectedRangeIndex, setSelectedRangeIndex] = useState(0);
  const [episodes, setEpisodes] = useState<PublicEpisodeItem[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [seriesPurchase, setSeriesPurchase] = useState<any>(null);
  const [hasActiveVip, setHasActiveVip] = useState(false);
  const [episodeProgressMap, setEpisodeProgressMap] = useState<Record<number, { completed: boolean; currentTime: number }>>({});
  const [linkCopied, setLinkCopied] = useState(false);

  // Rental Checkout Modal State
  const [rentalModalOpen, setRentalModalOpen] = useState(false);
  const [lockedTargetEpisode, setLockedTargetEpisode] = useState<number | null>(null);
  const [rentalMethod, setRentalMethod] = useState<'wire_qpay' | 'bank_transfer'>('wire_qpay');
  const [rentalOrder, setRentalOrder] = useState<any>(null);
  const [rentalLoading, setRentalLoading] = useState(false);
  const [rentalError, setRentalError] = useState<string | null>(null);
  const [bankSenderName, setBankSenderName] = useState('');
  const [bankPhone, setBankPhone] = useState('');
  const [bankSubmitted, setBankSubmitted] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  const totalEpisodes = Math.max(1, Number(movie.totalEpisodes) || (isSeries ? 50 : 1));
  const freeEpisodes = Math.max(0, Number(movie.freeEpisodes ?? (isSeries ? 6 : 0)));
  const unlockPrice = Math.max(500, Number(movie.unlockPrice) || 4900);
  const rentalDurationHours = Math.max(1, Number(movie.rentalDurationHours) || 72);
  const ranges = React.useMemo(() => buildEpisodeRanges(totalEpisodes, 30), [totalEpisodes]);

  const fetchSeriesEpisodes = async () => {
    setLoadingEpisodes(true);
    try {
      const res = await fetch(`/api/movies/${encodeURIComponent(movie.id)}/episodes`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.episodes)) {
          setEpisodes(data.episodes);
        }
        setSeriesPurchase(data.purchase || null);
        setHasActiveVip(Boolean(data.hasActiveVip));
        if (Array.isArray(data.episodeProgress)) {
          const map: Record<number, { completed: boolean; currentTime: number }> = {};
          for (const p of data.episodeProgress) {
            map[Number(p.episodeNumber)] = {
              completed: Boolean(p.completed),
              currentTime: Number(p.currentTime || 0)
            };
          }
          setEpisodeProgressMap(map);
        }
      }
    } catch {
      // Fallback generated episodes list if offline
    } finally {
      setLoadingEpisodes(false);
    }
  };

  useEffect(() => {
    void fetchSeriesEpisodes();
  }, [movie.id]);

  const handleShareMovie = async () => {
    const shareUrl = buildMovieShareUrl(movie, locale);
    await copyTextToClipboard(shareUrl);
    setLinkCopied(true);
    window.setTimeout(() => {
      setLinkCopied(false);
    }, 2500);
  };

  const handleOpenRentalModal = (targetEp?: number) => {
    setLockedTargetEpisode(targetEp ?? null);
    setRentalError(null);
    setRentalOrder(null);
    setBankSubmitted(false);
    setRentalModalOpen(true);
  };

  const handleCreateRentalOrder = async (method: 'wire_qpay' | 'bank_transfer') => {
    if (!currentUser) {
      if (onOpenAuth) {
        onClose();
        onOpenAuth();
      }
      return;
    }
    setRentalLoading(true);
    setRentalError(null);
    try {
      const res = await fetch('/api/payments/create-rental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          seriesId: movie.id,
          paymentMethod: method,
          accessType: 'rental'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setRentalError(data.message || 'Түрээсийн захиалга үүсгэхэд алдаа гарлаа.');
        return;
      }
      setRentalOrder(data);
    } catch (err: any) {
      setRentalError(err?.message || 'Сүлжээний алдаа гарлаа.');
    } finally {
      setRentalLoading(false);
    }
  };

  const handleSimulateQPayPaid = async () => {
    if (!rentalOrder?.orderNumber) return;
    setRentalLoading(true);
    setRentalError(null);
    try {
      const res = await fetch('/api/test/simulate-wire-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderNumber: rentalOrder.orderNumber })
      });
      const data = await res.json();
      if (!res.ok) {
        setRentalError(data.message || 'Төлбөр шалгахад алдаа гарлаа.');
        return;
      }
      await fetchSeriesEpisodes();
      setRentalModalOpen(false);
      if (lockedTargetEpisode) {
        onPlay(movie, lockedTargetEpisode);
        onClose();
      }
    } catch (err: any) {
      setRentalError(err?.message || 'Алдаа гарлаа.');
    } finally {
      setRentalLoading(false);
    }
  };

  const handleConfirmBankRental = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rentalOrder?.orderNumber) return;
    setRentalLoading(true);
    setRentalError(null);
    try {
      const res = await fetch('/api/payments/bank-transfer/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderNumber: rentalOrder.orderNumber,
          senderName: bankSenderName.trim() || currentUser?.name,
          phone: bankPhone.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setRentalError(data.message || 'Шилжүүлэг илгээхэд алдаа гарлаа.');
        return;
      }
      setBankSubmitted(true);
    } catch (err: any) {
      setRentalError(err?.message || 'Алдаа гарлаа.');
    } finally {
      setRentalLoading(false);
    }
  };

  const titleMn = movie.titleMn || getLocalizedMovieText(movie.title, 'mn', '');
  const titleEn = movie.titleEn || getLocalizedMovieText(movie.title, 'en', '');
  const title = getLocalizedMovieText(movie.title, locale, titleMn);
  const originalTitle = movie.originalTitle || titleEn;

  const synopsisMn =
    (movie as any).synopsisMn || movie.descriptionMn || getLocalizedMovieText(movie.synopsis, 'mn', '');
  const synopsis = getLocalizedMovieText(movie.synopsis, locale, synopsisMn);

  const director = getLocalizedMovieText(movie.director, locale, movie.directorMn);
  const cast = getLocalizedMovieText(movie.cast, locale, movie.castMn);
  const genresList: string[] =
    Array.isArray((movie as any).genres) && (movie as any).genres.length > 0
      ? (movie as any).genres
      : [getLocalizedMovieText(movie.genre, locale, movie.genreMn) || 'Драм'];
  const bannerSrc = movie.bannerUrl || (movie as any).backdropUrl || movie.posterUrl;
  const trailerUrl = (movie.trailerUrl || '').trim();

  const isAllEpisodesUnlocked =
    Boolean(seriesPurchase) ||
    hasActiveVip ||
    hasActiveSubscription ||
    userRole === 'admin';

  const isSingleMovieLocked =
    !isSeries &&
    !isAllEpisodesUnlocked &&
    (subscription !== undefined
      ? isMovieLockedForSubscription(movie, subscription, userRole)
      : movie.isPremium && !hasActiveSubscription);

  // Build displayed episodes for current range
  const currentRange = ranges[selectedRangeIndex] || { start: 1, end: totalEpisodes, labelMn: `1–${totalEpisodes}-р анги`, labelEn: `Ep 1–${totalEpisodes}` };
  const displayedEpisodes: PublicEpisodeItem[] = React.useMemo(() => {
    const sourceList: PublicEpisodeItem[] =
      episodes.length > 0
        ? episodes
        : Array.from({ length: totalEpisodes }, (_, i) => {
            const num = i + 1;
            const isFree = num <= freeEpisodes;
            return {
              seriesId: movie.id,
              episodeNumber: num,
              title: `${num}-р анги`,
              titleEn: `Episode ${num}`,
              duration: '2 мин',
              thumbnailUrl: movie.posterUrl,
              isFree,
              unlocked: isFree || isAllEpisodesUnlocked
            };
          });

    return sourceList.filter(
      (ep) => ep.episodeNumber >= currentRange.start && ep.episodeNumber <= currentRange.end
    );
  }, [episodes, totalEpisodes, freeEpisodes, movie.id, movie.posterUrl, isAllEpisodesUnlocked, currentRange]);

  const handleEpisodeClick = (ep: PublicEpisodeItem) => {
    const unlocked = ep.unlocked || ep.isFree || isAllEpisodesUnlocked;
    if (unlocked) {
      onPlay(movie, ep.episodeNumber);
      onClose();
    } else {
      handleOpenRentalModal(ep.episodeNumber);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#080A10]/95 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-200 select-none">
      {/* Top Ambient Blurred Backdrop */}
      <div className="relative min-h-screen w-full">
        <div className="absolute inset-x-0 top-0 h-[520px] overflow-hidden pointer-events-none">
          <img
            src={bannerSrc}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center scale-110 blur-2xl opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#080A10]/50 via-[#080A10]/85 to-[#080A10]" />
        </div>

        {/* Main Content Container (Reference Screenshot 2) */}
        <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pt-6 pb-20">
          {/* Top Bar: Breadcrumb + Close Button */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-[#9CA3AF] flex-wrap">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white font-medium cursor-pointer transition"
              >
                <ArrowLeft className="w-4 h-4 text-[#1764F5]" />
                <span>{locale === 'en' ? 'Home' : 'Нүүр'}</span>
              </button>
              <span>/</span>
              <span>
                {isSeries
                  ? locale === 'en'
                    ? 'Short Drama & Series'
                    : 'Богино драм'
                  : locale === 'en'
                  ? 'Movies'
                  : 'Уран сайхны кино'}
              </span>
              <span>/</span>
              <span>{genresList[0] || 'Драм'}</span>
              <span>/</span>
              <span className="text-white font-semibold truncate max-w-[220px] sm:max-w-xs">
                {title}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2.5 rounded-full bg-[#10131D] hover:bg-[#1764F5] border border-[#252A36] text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Hero Split Layout: Left Poster + Right Details (Screenshot 2) */}
          <div className="flex flex-col md:flex-row gap-7 lg:gap-10 items-start">
            {/* LEFT SIDE: Large Movie Poster with Total Episodes & Rating Badges */}
            <div className="w-52 sm:w-64 md:w-72 shrink-0 mx-auto md:mx-0">
              <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#11141D] border border-[#252A36] shadow-[0_24px_60px_rgba(0,0,0,0.85)]">
                <img
                  src={movie.posterUrl}
                  alt={title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                {/* Bottom-Left: Total Episode Count Badge */}
                <div className="absolute bottom-3 left-3 z-10">
                  <span className="px-3 py-1 rounded-lg bg-[#080A10]/90 backdrop-blur-md border border-white/15 text-xs font-bold text-white shadow-md">
                    {isSeries
                      ? locale === 'en'
                        ? `Total ${totalEpisodes} ep`
                        : `Нийт ${totalEpisodes} анги`
                      : movie.duration}
                  </span>
                </div>

                {/* Bottom-Right: Star Rating Badge */}
                <div className="absolute bottom-3 right-3 z-10">
                  <span className="px-2.5 py-1 rounded-lg bg-[#080A10]/90 backdrop-blur-md border border-[#E8B94F]/40 text-xs font-extrabold text-[#E8B94F] flex items-center gap-1 shadow-md">
                    <Star className="w-3.5 h-3.5 fill-[#E8B94F] text-[#E8B94F]" />
                    <span>{movie.rating}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Metadata, Titles, Description & Action Buttons */}
            <div className="flex-1 space-y-4 pt-1">
              {/* Top Badges Row */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                {movie.hasMongolianSubtitles !== false && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1764F5]/20 border border-[#1764F5]/50 text-[#347DFF] font-semibold">
                    <span>🇲🇳</span>
                    <span>{locale === 'en' ? 'Mongolian Subtitles' : 'Монгол хадмалтай'}</span>
                  </span>
                )}

                {isSeries && freeEpisodes > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8B94F]/15 border border-[#E8B94F]/40 text-[#E8B94F] font-semibold">
                    <Gift className="w-3.5 h-3.5" />
                    <span>
                      {locale === 'en'
                        ? `First ${freeEpisodes} episodes free`
                        : `Эхний ${freeEpisodes} анги үнэгүй`}
                    </span>
                  </span>
                )}

                <span className="text-[#9CA3AF]">•</span>
                <span className="text-slate-200">{movie.year}</span>
                <span className="text-[#9CA3AF]">•</span>
                <span className="text-slate-200">{movie.country || 'Хятад'}</span>
                <span className="text-[#9CA3AF]">•</span>
                <span className="px-2 py-0.5 rounded bg-[#10131D] border border-[#252A36] text-xs font-semibold text-white">
                  {movie.ageRating || '16+'}
                </span>
                <span className="text-[#9CA3AF]">•</span>
                <span className="text-slate-300">
                  {locale === 'en'
                    ? `Total ${movie.duration}`
                    : movie.duration?.toLowerCase().startsWith('нийт')
                    ? movie.duration
                    : `нийт ${movie.duration}`}
                </span>
              </div>

              {/* Main Title & Original English Title */}
              <div>
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                  {title}
                </h1>
                {originalTitle && (
                  <p className="text-sm sm:text-base text-[#9CA3AF] font-medium mt-1">
                    {originalTitle}
                  </p>
                )}
              </div>

              {/* Genre Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {genresList.map((g, idx) => (
                  <span
                    key={idx}
                    className="px-3.5 py-1 rounded-full bg-[#10131D] border border-[#252A36] text-xs font-medium text-slate-300"
                  >
                    {g}
                  </span>
                ))}
              </div>

              {/* Synopsis */}
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
                {synopsis}
              </p>

              {/* Primary Action Buttons Row (Screenshot 2) */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {/* 1. Watch Free Episode / Play Movie */}
                <button
                  type="button"
                  onClick={() => {
                    if (isSeries) {
                      onPlay(movie, 1);
                      onClose();
                    } else {
                      onPlay(movie);
                      onClose();
                    }
                  }}
                  className="px-5 py-3 rounded-xl bg-[#10131D] hover:bg-[#1764F5] border border-[#252A36] hover:border-[#1764F5] text-white font-bold text-xs sm:text-sm flex items-center gap-2.5 transition shadow-lg cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>
                    {isSeries
                      ? locale === 'en'
                        ? 'Watch Ep 1 Free'
                        : '1-р анги үнэгүй үзэх'
                      : !isSingleMovieLocked
                      ? tDetails('playMovie')
                      : `${tDetails('playMovie')} (VIP)`}
                  </span>
                </button>

                {/* 2. Rent / Unlock All Episodes */}
                {isSeries && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isAllEpisodesUnlocked) {
                        onPlay(movie, freeEpisodes + 1);
                        onClose();
                      } else {
                        handleOpenRentalModal();
                      }
                    }}
                    className={`px-5 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2.5 border transition cursor-pointer ${
                      isAllEpisodesUnlocked
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                        : 'bg-[#1764F5]/15 hover:bg-[#1764F5]/30 border-[#1764F5]/60 text-white shadow-[0_0_24px_rgba(23,100,245,0.2)]'
                    }`}
                  >
                    {isAllEpisodesUnlocked ? (
                      <>
                        <Unlock className="w-4 h-4 text-emerald-400" />
                        <span>
                          {locale === 'en' ? 'All Episodes Unlocked' : 'Бүх анги нээгдсэн'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-[#347DFF]" />
                        <span>
                          {locale === 'en'
                            ? `Rent (${unlockPrice.toLocaleString()}₮)`
                            : `Түрээслэх (${unlockPrice.toLocaleString()}₮)`}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#080A10]/80 border border-[#1764F5]/40 text-[11px] text-[#347DFF]">
                          {locale === 'en' ? `${rentalDurationHours}h` : `${rentalDurationHours} цаг`}
                        </span>
                      </>
                    )}
                  </button>
                )}

                {/* 3. VIP Access */}
                {(movie.vipEnabled !== false || !isSeries) && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPricing();
                    }}
                    className="px-5 py-3 rounded-xl bg-[#E8B94F]/15 hover:bg-[#E8B94F]/25 border border-[#E8B94F]/50 text-[#E8B94F] font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer"
                  >
                    <Crown className="w-4 h-4 text-[#E8B94F]" />
                    <span>VIP (19,900₮)</span>
                  </button>
                )}

                {/* 4. Watch Trailer (if available) */}
                {trailerUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onWatchTrailer) {
                        onWatchTrailer(movie, trailerUrl);
                      } else {
                        setActiveTab('trailer');
                      }
                    }}
                    data-testid="watch-trailer-button"
                    className="px-4 py-3 rounded-xl bg-[#10131D] hover:bg-[#161B29] text-white border border-[#252A36] text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer"
                  >
                    <Film className="w-4 h-4 text-[#347DFF]" />
                    <span>{locale === 'en' ? 'Watch Trailer' : 'Трейлер үзэх'}</span>
                  </button>
                )}

                {/* 5. Add to My List */}
                <button
                  type="button"
                  onClick={() => onToggleList(movie)}
                  data-testid="detail-toggle-mylist-btn"
                  className={`px-4 py-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
                    isInList
                      ? 'bg-[#1764F5]/20 text-[#347DFF] border-[#1764F5]/50'
                      : 'bg-[#10131D] text-white border-[#252A36] hover:border-slate-500'
                  }`}
                >
                  {isInList ? <Check className="w-4 h-4 text-[#347DFF]" /> : <Plus className="w-4 h-4" />}
                  <span>{isInList ? tDetails('inList') : tDetails('addToList')}</span>
                </button>

                {/* 6. Social Share */}
                <button
                  type="button"
                  onClick={handleShareMovie}
                  data-testid="detail-share-movie-btn"
                  aria-label={linkCopied ? tDetails('linkCopied') : tDetails('shareMovie')}
                  className={`px-4 py-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
                    linkCopied
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-[#10131D] text-white border-[#252A36] hover:border-slate-500'
                  }`}
                >
                  {linkCopied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Share2 className="w-4 h-4 text-[#347DFF]" />
                  )}
                  <span>{linkCopied ? tDetails('linkCopied') : tDetails('shareMovie')}</span>
                </button>
              </div>

              {/* Monetization Helper Line (Screenshot 2) */}
              {isSeries && (
                <p className="text-xs text-[#9CA3AF] pt-1">
                  {locale === 'en' ? (
                    <>
                      First <strong className="text-white">{freeEpisodes} episodes are free</strong>. Rent all{' '}
                      {totalEpisodes} episodes for{' '}
                      <strong className="text-white">{unlockPrice.toLocaleString()}₮</strong> ({rentalDurationHours}h) or
                      unlock unlimited access with{' '}
                      <strong className="text-[#E8B94F]">19,900₮ VIP</strong>.
                    </>
                  ) : (
                    <>
                      Эхний <strong className="text-white">{freeEpisodes} анги үнэгүй</strong>. Цааш бүх{' '}
                      {totalEpisodes} ангийг <strong className="text-white">{unlockPrice.toLocaleString()}₮</strong>-өөр{' '}
                      {rentalDurationHours} цаг түрээслэх эсвэл{' '}
                      <strong className="text-[#E8B94F]">19,900₮ VIP багцаар</strong> бүх богино драмыг 30 хоног
                      хязгааргүй үзээрэй.
                    </>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="my-8 border-t border-[#252A36]" />

          {/* Bottom Tabs & View Switcher Bar (Screenshot 2) */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              {isSeries && (
                <button
                  type="button"
                  onClick={() => setActiveTab('episodes')}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                    activeTab === 'episodes'
                      ? 'bg-[#10131D] text-white border border-[#252A36]'
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  {locale === 'en' ? `Episodes (${totalEpisodes})` : `Ангиуд (${totalEpisodes})`}
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-[#10131D] text-white border border-[#252A36]'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                {locale === 'en' ? 'Detailed Info' : 'Дэлгэрэнгүй мэдээлэл'}
              </button>
              {trailerUrl && (
                <button
                  type="button"
                  onClick={() => setActiveTab('trailer')}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                    activeTab === 'trailer'
                      ? 'bg-[#10131D] text-white border border-[#252A36]'
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  {locale === 'en' ? 'Trailer' : 'Трейлер'}
                </button>
              )}
            </div>

            {/* Grid View (Зурагтай) vs Numbered View (Дугаараар) Switcher */}
            {activeTab === 'episodes' && isSeries && (
              <div className="inline-flex items-center p-1 rounded-xl bg-[#10131D] border border-[#252A36]">
                <button
                  type="button"
                  onClick={() => setEpisodeViewMode('grid')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    episodeViewMode === 'grid'
                      ? 'bg-[#1764F5] text-white shadow-sm'
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  <span>{locale === 'en' ? 'With Thumbnail' : 'Зурагтай'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEpisodeViewMode('numbered')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    episodeViewMode === 'numbered'
                      ? 'bg-[#1764F5] text-white shadow-sm'
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>{locale === 'en' ? 'Numbered' : 'Дугаараар'}</span>
                </button>
              </div>
            )}
          </div>

          {/* EPISODES TAB CONTENT (Part 6 & Screenshot 2) */}
          {activeTab === 'episodes' && isSeries && (
            <div className="space-y-5">
              {/* Episode Range Controls Row */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[#9CA3AF] mr-1">
                    {locale === 'en' ? 'Select range:' : 'Анги сонгох:'}
                  </span>
                  {ranges.map((r, idx) => {
                    const isSelected = idx === selectedRangeIndex;
                    return (
                      <button
                        key={r.start}
                        type="button"
                        onClick={() => setSelectedRangeIndex(idx)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#1764F5]/20 border-[#1764F5] text-[#347DFF]'
                            : 'bg-[#10131D] border-[#252A36] text-[#9CA3AF] hover:text-white'
                        }`}
                      >
                        {locale === 'en' ? r.labelEn : r.labelMn}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 text-xs text-[#9CA3AF]">
                  <span>
                    {locale === 'en' ? (
                      <>
                        Showing <strong className="text-white">{currentRange.start}–{currentRange.end}</strong> of{' '}
                        <strong className="text-white">{totalEpisodes}</strong> episodes
                      </>
                    ) : (
                      <>
                        Нийт <strong className="text-white">{totalEpisodes}</strong> ангиас{' '}
                        <strong className="text-white">
                          {currentRange.start}–{currentRange.end}
                        </strong>{' '}
                        харуулж байна
                      </>
                    )}
                  </span>

                  {!isAllEpisodesUnlocked && (
                    <button
                      type="button"
                      onClick={() => handleOpenRentalModal()}
                      className="px-3.5 py-1.5 rounded-xl bg-[#1764F5] hover:bg-[#347DFF] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-[#1764F5]/25"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>
                        {locale === 'en'
                          ? `Unlock All · ${unlockPrice.toLocaleString()}₮`
                          : `Бүх ангийг нээх · ${unlockPrice.toLocaleString()}₮`}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {loadingEpisodes ? (
                <div className="py-12 flex items-center justify-center text-sm text-[#9CA3AF] gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#1764F5]" />
                  <span>{locale === 'en' ? 'Loading episodes...' : 'Ангиудыг ачаалж байна...'}</span>
                </div>
              ) : (
                <EpisodeGrid
                  episodes={displayedEpisodes}
                  fallbackThumbnailUrl={movie.posterUrl}
                  freeEpisodes={freeEpisodes}
                  isAllEpisodesUnlocked={isAllEpisodesUnlocked}
                  episodeProgressMap={episodeProgressMap}
                  locale={locale}
                  viewMode={episodeViewMode}
                  onSelectEpisode={handleEpisodeClick}
                />
              )}
            </div>
          )}

          {/* OVERVIEW TAB CONTENT */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4 bg-[#10131D] border border-[#252A36] rounded-2xl p-6">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  {locale === 'en' ? 'Storyline & Production' : 'Киноны дэлгэрэнгүй агуулга'}
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">{synopsis}</p>
                <div className="p-4 rounded-xl bg-[#080A10] border border-[#252A36] flex items-center gap-3">
                  <Film className="w-5 h-5 text-[#1764F5] shrink-0" />
                  <div className="text-xs text-[#9CA3AF]">
                    <span className="font-semibold text-white">Cloudflare R2 Edge Streaming:</span>{' '}
                    {locale === 'en'
                      ? 'High-bitrate adaptive MP4 streaming with Mongolian subtitle tracks.'
                      : 'Монгол хадмал орчуулгатай, өндөр хурдны Cloudflare R2 дамжуулалт.'}
                  </div>
                </div>
              </div>

              <div className="space-y-3.5 text-xs bg-[#10131D] p-6 rounded-2xl border border-[#252A36]">
                <div>
                  <span className="text-[#9CA3AF] uppercase tracking-wider text-[10px] block font-bold">
                    {locale === 'en' ? 'Titles (MN / EN)' : 'Нэр (МН / EN)'}
                  </span>
                  <span className="text-white font-semibold mt-0.5 block">
                    {titleMn} / {originalTitle}
                  </span>
                </div>
                <div>
                  <span className="text-[#9CA3AF] uppercase tracking-wider text-[10px] block font-bold">
                    {tDetails('director')}
                  </span>
                  <span className="text-white font-medium mt-0.5 block">{director || '—'}</span>
                </div>
                <div>
                  <span className="text-[#9CA3AF] uppercase tracking-wider text-[10px] block font-bold">
                    {tDetails('cast')}
                  </span>
                  <span className="text-white font-medium mt-0.5 block">{cast || '—'}</span>
                </div>
                <div>
                  <span className="text-[#9CA3AF] uppercase tracking-wider text-[10px] block font-bold">
                    {locale === 'en' ? 'Country & Year' : 'Улс ба Он'}
                  </span>
                  <span className="text-white font-medium mt-0.5 block">
                    {movie.country || 'Хятад'} · {movie.year}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TRAILER TAB CONTENT */}
          {activeTab === 'trailer' && trailerUrl && (
            <div className="aspect-video w-full max-w-4xl rounded-2xl overflow-hidden bg-black border border-[#252A36]">
              <video src={trailerUrl} controls autoPlay className="w-full h-full object-contain" />
            </div>
          )}
        </div>
      </div>

      {/* RENTAL / UNLOCK ALL EPISODES MODAL (Wire.mn QPay + Khan Bank + VIP) */}
      {rentalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#10131D] border border-[#252A36] p-6 shadow-2xl space-y-5">
            <button
              type="button"
              onClick={() => setRentalModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#080A10] text-[#9CA3AF] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1764F5]/15 border border-[#1764F5]/40 text-xs font-bold text-[#347DFF] mb-2">
                <Unlock className="w-3.5 h-3.5" />
                <span>
                  {lockedTargetEpisode
                    ? `${lockedTargetEpisode}-р ангиас бүх ангийг нээх`
                    : 'Бүх ангийг нээх / Түрээслэх'}
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-white">{title}</h3>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Эхний {freeEpisodes} анги үнэгүй. Цааш {freeEpisodes + 1}–{totalEpisodes}-р ангийг{' '}
                <strong className="text-white">{unlockPrice.toLocaleString()}₮</strong>-өөр{' '}
                {rentalDurationHours} цаг түрээслэх эсвэл VIP багцаар хязгааргүй үзээрэй.
              </p>
            </div>

            {rentalError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
                {rentalError}
              </div>
            )}

            {!rentalOrder ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRentalMethod('wire_qpay')}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                      rentalMethod === 'wire_qpay'
                        ? 'bg-[#1764F5]/15 border-[#1764F5] text-white'
                        : 'bg-[#080A10] border-[#252A36] text-[#9CA3AF]'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-[#347DFF] mb-1.5" />
                    <div className="text-xs font-bold text-white">Wire.mn QPay QR</div>
                    <div className="text-[11px] text-[#9CA3AF]">Шуурхай нээгдэнэ</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRentalMethod('bank_transfer')}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                      rentalMethod === 'bank_transfer'
                        ? 'bg-[#1764F5]/15 border-[#1764F5] text-white'
                        : 'bg-[#080A10] border-[#252A36] text-[#9CA3AF]'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-[#E8B94F] mb-1.5" />
                    <div className="text-xs font-bold text-white">Дансаар шилжүүлэх</div>
                    <div className="text-[11px] text-[#9CA3AF]">Хаан Банк: 5132104221</div>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={rentalLoading}
                  onClick={() => handleCreateRentalOrder(rentalMethod)}
                  className="w-full py-3.5 rounded-xl bg-[#1764F5] hover:bg-[#347DFF] text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {rentalLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Unlock className="w-4 h-4" />
                  )}
                  <span>
                    {currentUser
                      ? `Түрээслэх · ${unlockPrice.toLocaleString()}₮ (${rentalDurationHours} цаг)`
                      : 'Нэвтэрч түрээслэх'}
                  </span>
                </button>

                <div className="pt-2 border-t border-[#252A36] flex items-center justify-between">
                  <span className="text-xs text-[#9CA3AF]">Бүх кино, цувралыг 30 хоног үзэх үү?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setRentalModalOpen(false);
                      onClose();
                      onOpenPricing();
                    }}
                    className="text-xs font-bold text-[#E8B94F] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>VIP Багц (19,900₮) →</span>
                  </button>
                </div>
              </div>
            ) : rentalOrder.paymentMethod === 'wire_qpay' ? (
              <div className="space-y-4 text-center">
                <div className="p-4 rounded-2xl bg-[#080A10] border border-[#252A36] space-y-2">
                  <div className="text-xs text-[#9CA3AF]">Захиалгын дугаар: {rentalOrder.orderNumber}</div>
                  <div className="text-2xl font-black text-white">
                    {Number(rentalOrder.amount || unlockPrice).toLocaleString()}₮
                  </div>
                  <div className="text-xs text-emerald-400">
                    Wire.mn QPay нэхэмжлэх үүслээ ({rentalDurationHours} цаг)
                  </div>
                </div>

                <button
                  type="button"
                  disabled={rentalLoading}
                  onClick={handleSimulateQPayPaid}
                  className="w-full py-3 rounded-xl bg-[#1764F5] hover:bg-[#347DFF] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {rentalLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Төлбөр шалгах / Бүх ангийг шууд нээх</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmBankRental} className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-[#080A10] border border-[#252A36] text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#9CA3AF]">Банк:</span>
                    <span className="font-bold text-white">Хаан Банк (5132104221)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#9CA3AF]">Хүлээн авагч:</span>
                    <span className="font-bold text-white">Сүхбат Мөнх-Оргил</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#9CA3AF]">Дүн:</span>
                    <span className="font-bold text-[#E8B94F]">{unlockPrice.toLocaleString()}₮</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#9CA3AF]">Гүйлгээний утга:</span>
                    <button
                      type="button"
                      onClick={() => {
                        void copyTextToClipboard(rentalOrder.orderNumber);
                        setCopiedAccount(true);
                        setTimeout(() => setCopiedAccount(false), 2000);
                      }}
                      className="font-mono font-bold text-[#347DFF] flex items-center gap-1 cursor-pointer"
                    >
                      <span>{rentalOrder.orderNumber}</span>
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  {copiedAccount && (
                    <div className="text-[11px] text-emerald-400 text-right">Хуулагдлаа!</div>
                  )}
                </div>

                {bankSubmitted ? (
                  <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 text-center">
                    Таны шилжүүлгийн мэдээлэл хүлээн авагдлаа. Админ баталгаажуулмагц бүх анги нээгдэнэ.
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={bankSenderName}
                      onChange={(e) => setBankSenderName(e.target.value)}
                      placeholder="Шилжүүлсэн хүний нэр"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#080A10] border border-[#252A36] text-xs text-white focus:outline-none focus:border-[#1764F5]"
                      required
                    />
                    <input
                      type="text"
                      value={bankPhone}
                      onChange={(e) => setBankPhone(e.target.value)}
                      placeholder="Утасны дугаар"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#080A10] border border-[#252A36] text-xs text-white focus:outline-none focus:border-[#1764F5]"
                    />
                    <button
                      type="submit"
                      disabled={rentalLoading}
                      className="w-full py-3 rounded-xl bg-[#1764F5] hover:bg-[#347DFF] text-white font-bold text-xs sm:text-sm cursor-pointer"
                    >
                      Шилжүүлснээ мэдэгдэх
                    </button>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
