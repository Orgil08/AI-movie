import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Lock,
  Unlock,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  Film,
  Play,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Settings,
  Maximize2,
  Flame,
  Check,
  QrCode,
  Building2,
  Loader2,
  Crown,
  Copy
} from 'lucide-react';
import { Movie, getLocalizedMovieText } from '../data/movies.js';
import { useLocale, useTranslations } from '../i18n/I18nContext.js';
import { authFetch } from '../utils/api.js';
import {
  saveWatchProgress,
  recordFinishedMovie,
  removeWatchProgress,
  formatTimestamp
} from '../utils/watchProgress.js';
import { buildEpisodeRanges } from '../utils/seriesEpisodes.js';
import { copyTextToClipboard } from '../utils/shareMovie.js';

interface MoviePlayerModalProps {
  movie: Movie | null;
  initialEpisodeNumber?: number;
  onClose: () => void;
  onGoToPricing: () => void;
  onOpenAuth?: () => void;
  currentUser?: { id: string; name: string; email: string; role?: 'user' | 'admin' } | null;
  hasActiveSubscription: boolean;
  initialTime?: number;
  onProgressUpdate?: (movieId: string, currentTime: number, duration: number) => void;
  isTrailer?: boolean;
  trailerUrl?: string | null;
  onPlayFullMovie?: (movie: Movie) => void;
}

interface StreamResponse {
  authorized: boolean;
  movieId: string;
  episodeNumber?: number;
  episodeTitle?: string;
  titleMn?: string;
  quality: string;
  streamUrl: string;
  token: string;
  expiresAt: number;
}

function parseDurationToSeconds(durationStr: string): number {
  if (!durationStr) return 167;
  let total = 0;
  const hoursMatch = durationStr.match(/(\d+)\s*(?:h|ц)/i);
  const minsMatch = durationStr.match(/(\d+)\s*(?:m|мин)/i);
  if (hoursMatch) total += parseInt(hoursMatch[1], 10) * 3600;
  if (minsMatch) total += parseInt(minsMatch[1], 10) * 60;
  return total > 0 ? total : 167;
}

const SAMPLE_SUBTITLES_MN = [
  'Яагаад заавал би гэж? Яагаад?',
  'Энэ гэрээний ард бүхэл бүтэн ордны нууц бий.',
  'Би чамайг дахин хэзээ ч орхихгүй.',
  'Үнэн илчлэгдэх цаг ирлээ!'
];

export const MoviePlayerModal: React.FC<MoviePlayerModalProps> = ({
  movie,
  initialEpisodeNumber = 1,
  onClose,
  onGoToPricing,
  onOpenAuth,
  currentUser,
  hasActiveSubscription,
  initialTime = 0,
  onProgressUpdate,
  isTrailer = false,
  trailerUrl = null,
  onPlayFullMovie
}) => {
  const { locale } = useLocale();
  const tPlayer = useTranslations('Player');

  const isSeries = Boolean(movie && (movie.type === 'series' || (movie.totalEpisodes && movie.totalEpisodes > 1)));
  const totalEpisodes = Math.max(1, Number(movie?.totalEpisodes) || (isSeries ? 50 : 1));
  const freeEpisodes = Math.max(0, Number(movie?.freeEpisodes ?? (isSeries ? 6 : 0)));
  const unlockPrice = Math.max(500, Number(movie?.unlockPrice) || 4900);
  const rentalDurationHours = Math.max(1, Number(movie?.rentalDurationHours) || 72);

  const [currentEpisode, setCurrentEpisode] = useState<number>(initialEpisodeNumber || 1);
  const [selectedRangeIndex, setSelectedRangeIndex] = useState<number>(0);
  const [episodesList, setEpisodesList] = useState<any[]>([]);
  const [seriesPurchase, setSeriesPurchase] = useState<any>(null);
  const [hasActiveVip, setHasActiveVip] = useState<boolean>(false);
  const [completedEpisodes, setCompletedEpisodes] = useState<Set<number>>(new Set([2]));
  const [resumeCandidateEpisode, setResumeCandidateEpisode] = useState<number | null>(3);

  const [loading, setLoading] = useState(false);
  const [streamData, setStreamData] = useState<StreamResponse | null>(null);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [resumedToast, setResumedToast] = useState<string | null>(null);

  // Player interactive controls
  const [isMuted, setIsMuted] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [qualityLabel, setQualityLabel] = useState<'AUTO' | '1080p' | '4K'>('AUTO');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [durationSec, setDurationSec] = useState<number>(167);

  // Rental Unlock Modal inside Player
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [rentalMethod, setRentalMethod] = useState<'wire_qpay' | 'bank_transfer'>('wire_qpay');
  const [rentalOrder, setRentalOrder] = useState<any>(null);
  const [rentalLoading, setRentalLoading] = useState(false);
  const [rentalError, setRentalError] = useState<string | null>(null);
  const [bankSenderName, setBankSenderName] = useState('');
  const [bankSubmitted, setBankSubmitted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const hasSeekedInitial = useRef(false);
  const lastSavedTime = useRef(0);

  const playingTrailer = Boolean(isTrailer || trailerUrl);
  const resolvedTrailerUrl = movie ? (trailerUrl || movie.trailerUrl || '').trim() : '';

  const ranges = React.useMemo(() => buildEpisodeRanges(totalEpisodes, 30), [totalEpisodes]);

  // Keep range tab synced with currentEpisode
  useEffect(() => {
    const idx = ranges.findIndex(
      (r) => currentEpisode >= r.start && currentEpisode <= r.end
    );
    if (idx >= 0) setSelectedRangeIndex(idx);
  }, [currentEpisode, ranges]);

  // Load Series Episodes & Purchase Status
  const fetchEpisodesMetadata = async () => {
    if (!movie || !isSeries) return;
    try {
      const res = await fetch(`/api/movies/${encodeURIComponent(movie.id)}/episodes`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.episodes)) {
          setEpisodesList(data.episodes);
        }
        setSeriesPurchase(data.purchase || null);
        setHasActiveVip(Boolean(data.hasActiveVip));
        if (Array.isArray(data.episodeProgress) && data.episodeProgress.length > 0) {
          const done = new Set<number>();
          let latestEp = 1;
          for (const p of data.episodeProgress) {
            if (p.completed) done.add(Number(p.episodeNumber));
            if (Number(p.episodeNumber) > latestEp) latestEp = Number(p.episodeNumber);
          }
          if (done.size > 0) setCompletedEpisodes(done);
          if (latestEp > 1 && latestEp !== currentEpisode) {
            setResumeCandidateEpisode(latestEp);
          }
        }
      }
    } catch {
      // Ignore metadata error
    }
  };

  useEffect(() => {
    setCurrentEpisode(initialEpisodeNumber || 1);
    void fetchEpisodesMetadata();
  }, [movie?.id, initialEpisodeNumber]);

  const isAllEpisodesUnlocked =
    Boolean(seriesPurchase) ||
    hasActiveVip ||
    hasActiveSubscription ||
    currentUser?.role === 'admin';

  const isEpisodeUnlocked = (epNum: number): boolean => {
    if (isAllEpisodesUnlocked) return true;
    const found = episodesList.find((e) => e.episodeNumber === epNum);
    if (found) return Boolean(found.unlocked || found.isFree);
    return epNum <= freeEpisodes;
  };

  // Fetch stream URL for movie or current episode
  useEffect(() => {
    hasSeekedInitial.current = false;
    lastSavedTime.current = 0;

    if (!movie) {
      setStreamData(null);
      setAccessDenied(null);
      return;
    }

    if (playingTrailer) {
      if (!resolvedTrailerUrl) {
        setAccessDenied(
          locale === 'en'
            ? 'Trailer video URL is not available for this movie.'
            : 'Энэ киноны трейлер видео холбоос одоогоор байхгүй байна.'
        );
        setStreamData(null);
        setLoading(false);
        return;
      }

      setAccessDenied(null);
      setStreamData({
        authorized: true,
        movieId: movie.id,
        titleMn: movie.titleMn,
        quality: movie.quality || '1080p Full HD',
        streamUrl: resolvedTrailerUrl,
        token: 'trailer-preview',
        expiresAt: Date.now() + 3600 * 1000
      });
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setAccessDenied(null);

    const streamEndpoint = isSeries
      ? `/api/movies/${encodeURIComponent(movie.id)}/episodes/${currentEpisode}/stream`
      : `/api/movies/${encodeURIComponent(movie.id)}/stream`;

    authFetch(streamEndpoint)
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          if (isMounted) {
            const msg =
              errData.message ||
              (locale === 'en'
                ? 'Unlock all episodes or activate VIP to watch this episode.'
                : 'Энэ ангийг үзэхийн тулд цувралыг түрээслэх эсвэл VIP багц идэвхжүүлнэ үү.');
            setAccessDenied(msg);
            setStreamData(null);
            setLoading(false);
          }
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to retrieve streaming token');
        }

        const data: StreamResponse = await res.json();
        if (isMounted) {
          setStreamData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setAccessDenied(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [movie, currentEpisode, locale, playingTrailer, resolvedTrailerUrl, isSeries, isAllEpisodesUnlocked]);

  // Keyboard shortcuts (Space, Left/Right seek, M mute, F fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (!videoRef.current) return;

      if (e.key === ' ') {
        e.preventDefault();
        if (videoRef.current.paused) {
          void videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      } else if (e.key === 'ArrowRight') {
        videoRef.current.currentTime = Math.min(
          videoRef.current.duration || 9999,
          videoRef.current.currentTime + 10
        );
      } else if (e.key === 'ArrowLeft') {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      } else if (e.key.toLowerCase() === 'm') {
        videoRef.current.muted = !videoRef.current.muted;
        setIsMuted(videoRef.current.muted);
      } else if (e.key.toLowerCase() === 'f') {
        if (playerContainerRef.current && document.fullscreenElement !== playerContainerRef.current) {
          void playerContainerRef.current.requestFullscreen?.();
        } else if (document.fullscreenElement) {
          void document.exitFullscreen?.();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const movieDurationSeconds = movie ? parseDurationToSeconds(movie.duration) : 167;

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
      setDurationSec(Math.floor(videoRef.current.duration));
    }
    videoRef.current.playbackRate = playbackSpeed;
    videoRef.current.muted = isMuted;

    if (playingTrailer) return;
    if (!hasSeekedInitial.current && initialTime > 0 && currentEpisode === initialEpisodeNumber) {
      try {
        const targetTime = Math.min(
          initialTime,
          videoRef.current.duration && !isNaN(videoRef.current.duration)
            ? videoRef.current.duration
            : initialTime
        );
        videoRef.current.currentTime = targetTime;
        hasSeekedInitial.current = true;
        setResumedToast(
          locale === 'en'
            ? `Resumed from ${formatTimestamp(initialTime)}`
            : `${formatTimestamp(initialTime)} цагаас үргэлжлүүлж байна`
        );
        setTimeout(() => setResumedToast(null), 3500);
      } catch {
        // Ignore seek error
      }
    }
  };

  const persistServerProgress = (epNum: number, cur: number, dur: number, completed = false) => {
    if (!currentUser || !movie) return;
    void fetch('/api/watch-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        movieId: movie.id,
        episodeNumber: epNum,
        currentTime: cur,
        duration: dur,
        completed
      })
    }).catch(() => {});
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !movie) return;
    const current = Math.floor(videoRef.current.currentTime);
    setCurrentTimeSec(current);

    if (playingTrailer) return;
    if (Math.abs(current - lastSavedTime.current) >= 3) {
      lastSavedTime.current = current;
      const duration =
        videoRef.current.duration && !isNaN(videoRef.current.duration) && videoRef.current.duration > 5
          ? Math.floor(videoRef.current.duration)
          : movieDurationSeconds;

      saveWatchProgress({
        movieId: movie.id,
        currentTime: current,
        duration
      });
      persistServerProgress(currentEpisode, current, duration, false);

      if (onProgressUpdate) {
        onProgressUpdate(movie.id, current, duration);
      }
    }
  };

  // Safe Auto-Play Next Episode: never auto-plays a locked episode
  const handleEnded = () => {
    if (playingTrailer || !movie) return;
    const duration =
      videoRef.current?.duration && !isNaN(videoRef.current.duration) && videoRef.current.duration > 5
        ? Math.floor(videoRef.current.duration)
        : movieDurationSeconds;

    recordFinishedMovie({ movieId: movie.id, duration });
    removeWatchProgress(movie.id);
    persistServerProgress(currentEpisode, duration, duration, true);
    setCompletedEpisodes((prev) => new Set(prev).add(currentEpisode));

    if (onProgressUpdate) {
      onProgressUpdate(movie.id, duration, duration);
    }

    if (isSeries && currentEpisode < totalEpisodes) {
      const nextEp = currentEpisode + 1;
      if (isEpisodeUnlocked(nextEp)) {
        setCurrentEpisode(nextEp);
      } else {
        setUnlockModalOpen(true);
      }
    }
  };

  const handleSelectEpisode = (epNum: number) => {
    if (isEpisodeUnlocked(epNum)) {
      setCurrentEpisode(epNum);
      setUnlockModalOpen(false);
    } else {
      setCurrentEpisode(epNum);
      setUnlockModalOpen(true);
    }
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleCycleQuality = () => {
    setQualityLabel((prev) => (prev === 'AUTO' ? '1080p' : prev === '1080p' ? '4K' : 'AUTO'));
  };

  const handleCycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    setPlaybackSpeed(next);
    if (videoRef.current) {
      videoRef.current.playbackRate = next;
    }
  };

  const handleCreateRentalOrder = async (method: 'wire_qpay' | 'bank_transfer') => {
    if (!movie) return;
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
      setRentalError(err?.message || 'Сүлжээний алдаа.');
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
      if (res.ok) {
        await fetchEpisodesMetadata();
        setUnlockModalOpen(false);
        setAccessDenied(null);
      }
    } finally {
      setRentalLoading(false);
    }
  };

  const handleConfirmBankRental = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rentalOrder?.orderNumber) return;
    setRentalLoading(true);
    try {
      const res = await fetch('/api/payments/bank-transfer/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderNumber: rentalOrder.orderNumber,
          senderName: bankSenderName.trim() || currentUser?.name
        })
      });
      if (res.ok) {
        setBankSubmitted(true);
      }
    } finally {
      setRentalLoading(false);
    }
  };

  if (!movie) return null;

  const title = getLocalizedMovieText(movie.title, locale, movie.titleMn);
  const currentRange = ranges[selectedRangeIndex] || { start: 1, end: Math.min(30, totalEpisodes) };
  const rangeNumbers = Array.from(
    { length: Math.max(0, currentRange.end - currentRange.start + 1) },
    (_, i) => currentRange.start + i
  );
  const activeSubtitleLine =
    SAMPLE_SUBTITLES_MN[Math.floor(currentTimeSec / 4) % SAMPLE_SUBTITLES_MN.length];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="movie-modal-title"
      className="fixed inset-0 z-50 bg-[#080A10] overflow-y-auto animate-in fade-in duration-200 select-none"
    >
      <div className="min-h-screen w-full max-w-[1680px] mx-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 p-3 sm:p-6">
        {/* LEFT SIDE: Vertical / Theater Video Player Container (Reference Screenshot 3) */}
        <div
          ref={playerContainerRef}
          className="relative flex-1 h-[76vh] lg:h-[88vh] rounded-3xl overflow-hidden bg-black border border-[#252A36] flex items-center justify-center shadow-[0_24px_60px_rgba(0,0,0,0.9)]"
        >
          {/* Top-Left Back Button + Title + Episode Indicator */}
          <div className="absolute top-5 left-5 z-30 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-10 h-10 rounded-full bg-[#080A10]/80 hover:bg-[#1764F5] border border-white/15 text-white flex items-center justify-center transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h2
                id="movie-modal-title"
                className="text-sm sm:text-base font-extrabold text-white drop-shadow"
              >
                {title}
              </h2>
              <div className="text-xs text-slate-300 font-medium">
                {playingTrailer
                  ? locale === 'en'
                    ? 'Official Trailer'
                    : 'Албан ёсны трейлер'
                  : isSeries
                  ? `${currentEpisode}-р анги / Нийт ${totalEpisodes} анги`
                  : movie.duration}
              </div>
            </div>
          </div>

          {/* Top-Right Volume / Mute Button */}
          <div className="absolute top-5 right-5 z-30 flex items-center gap-2">
            {playingTrailer && onPlayFullMovie && (
              <button
                type="button"
                onClick={() => onPlayFullMovie(movie)}
                className="px-3.5 py-2 rounded-full bg-[#1764F5] hover:bg-[#347DFF] text-white font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{locale === 'en' ? 'Watch Full' : 'Бүтнээр үзэх'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleToggleMute}
              aria-label="Toggle Mute"
              className="w-10 h-10 rounded-full bg-[#080A10]/80 hover:bg-white/15 border border-white/15 text-white flex items-center justify-center transition cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Top-Center Floating "Resume from Episode N" Pill (Screenshot 3) */}
          {isSeries &&
            !playingTrailer &&
            resumeCandidateEpisode &&
            resumeCandidateEpisode !== currentEpisode && (
              <button
                type="button"
                onClick={() => {
                  handleSelectEpisode(resumeCandidateEpisode);
                  setResumeCandidateEpisode(null);
                }}
                className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-[#10131D]/90 hover:bg-[#1764F5] border border-[#1764F5]/60 text-xs font-bold text-white flex items-center gap-2 shadow-xl backdrop-blur-md transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>
                  {locale === 'en'
                    ? `Resume from Episode ${resumeCandidateEpisode}`
                    : `${resumeCandidateEpisode}-р ангиас үргэлжлүүлэх`}
                </span>
              </button>
            )}

          {/* Main Video / Loading / Locked State */}
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-[#9CA3AF]">
              <Loader2 className="w-10 h-10 text-[#1764F5] animate-spin" />
              <span className="text-xs font-medium">{tPlayer('loading')}</span>
            </div>
          ) : accessDenied ? (
            <div className="absolute inset-0 bg-gradient-to-t from-[#080A10] via-[#080A10]/95 to-black/85 flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="w-16 h-16 rounded-full bg-[#1764F5]/20 border border-[#1764F5]/50 flex items-center justify-center text-[#347DFF] mb-4 shadow-xl">
                <Lock className="w-8 h-8" />
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#1764F5]/20 text-[#347DFF] border border-[#1764F5]/40 mb-2">
                {isSeries ? `${currentEpisode}-р анги түгжээтэй` : tPlayer('serverLocked')}
              </span>

              <h3 className="text-xl sm:text-2xl font-black text-white max-w-md">{title}</h3>

              <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-md mt-2 leading-relaxed">
                {accessDenied}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                {isSeries && (
                  <button
                    type="button"
                    onClick={() => setUnlockModalOpen(true)}
                    className="px-6 py-3 rounded-xl bg-[#1764F5] hover:bg-[#347DFF] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-[#1764F5]/30 transition cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>
                      Бүх ангийг нээх · {freeEpisodes + 1}-р ангиас {unlockPrice.toLocaleString()}₮
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGoToPricing();
                  }}
                  className="px-5 py-3 rounded-xl bg-[#E8B94F]/15 hover:bg-[#E8B94F]/25 border border-[#E8B94F]/50 text-[#E8B94F] font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>VIP Багц (19,900₮)</span>
                </button>
              </div>

              <div className="mt-5 text-[11px] text-[#9CA3AF] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1764F5]" />
                <span>Wire.mn QPay болон Хаан Банкаар шуурхай нээгдэнэ</span>
              </div>
            </div>
          ) : streamData ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={streamData.streamUrl}
                poster={(movie as any).backdropUrl || movie.bannerUrl || movie.posterUrl}
                controls
                autoPlay
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                className="w-full h-full object-contain"
              />

              {/* Mongolian Subtitle Overlay Pill (Screenshot 3) */}
              {subtitlesEnabled && !playingTrailer && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-none z-20 px-4 py-1.5 rounded-xl bg-black/85 border border-white/10 text-white font-bold text-sm sm:text-base text-center shadow-xl">
                  {activeSubtitleLine}
                </div>
              )}

              {/* Right-Side Vertical Floating Controls (MN Subtitle / AUTO Quality / Settings - Screenshot 3) */}
              <div className="absolute right-4 bottom-20 z-20 flex flex-col items-center gap-3.5">
                {/* MN Subtitle Button */}
                <div className="relative flex flex-col items-center gap-1 group">
                  <span className="hidden sm:inline-block absolute right-14 top-2 px-3 py-1 rounded-full bg-white text-black text-[11px] font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Хадмал асаах / унтраах · MN
                  </span>
                  <button
                    type="button"
                    onClick={() => setSubtitlesEnabled((prev) => !prev)}
                    className={`w-11 h-11 rounded-full border text-xs font-extrabold flex items-center justify-center transition cursor-pointer ${
                      subtitlesEnabled
                        ? 'bg-[#10131D]/90 border-[#1764F5] text-white shadow-[0_0_14px_rgba(23,100,245,0.5)]'
                        : 'bg-black/70 border-white/20 text-[#9CA3AF]'
                    }`}
                  >
                    MN
                  </button>
                  <span className="text-[10px] font-semibold text-slate-300">Хадмал</span>
                </div>

                {/* AUTO Quality Button */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCycleQuality}
                    className="w-11 h-11 rounded-full bg-black/75 hover:bg-[#10131D] border border-white/20 text-[10px] font-extrabold text-white flex items-center justify-center transition cursor-pointer"
                  >
                    {qualityLabel}
                  </button>
                  <span className="text-[10px] font-semibold text-slate-300">Чанар</span>
                </div>

                {/* Settings / Speed Button */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCycleSpeed}
                    title="Playback Speed"
                    className="w-11 h-11 rounded-full bg-black/75 hover:bg-[#10131D] border border-white/20 text-white flex items-center justify-center transition cursor-pointer"
                  >
                    {playbackSpeed === 1 ? (
                      <Settings className="w-4 h-4" />
                    ) : (
                      <span className="text-[10px] font-bold">{playbackSpeed}x</span>
                    )}
                  </button>
                  <span className="text-[10px] font-semibold text-slate-300">Тохиргоо</span>
                </div>
              </div>

              {/* Bottom-Left Episode & Time Pills (Screenshot 3) */}
              <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
                {isSeries && (
                  <span className="px-2.5 py-1 rounded-lg bg-[#1764F5]/30 border border-[#1764F5] text-xs font-bold text-[#347DFF]">
                    {currentEpisode}-р анги / {totalEpisodes}
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-lg bg-black/80 border border-white/10 text-xs font-mono text-white">
                  {formatTimestamp(currentTimeSec)} / {formatTimestamp(durationSec)}
                </span>
              </div>

              {/* Next / Prev Episode Quick Pill */}
              {isSeries && !playingTrailer && (
                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                  {currentEpisode > 1 && (
                    <button
                      type="button"
                      onClick={() => handleSelectEpisode(currentEpisode - 1)}
                      className="px-3 py-1.5 rounded-full bg-black/80 hover:bg-[#10131D] border border-white/15 text-[11px] font-semibold text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Өмнөх</span>
                    </button>
                  )}
                  {currentEpisode < totalEpisodes && (
                    <button
                      type="button"
                      onClick={() => handleSelectEpisode(currentEpisode + 1)}
                      className="px-3.5 py-1.5 rounded-full bg-black/80 hover:bg-[#1764F5] border border-white/15 text-[11px] font-semibold text-white flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <span>Дараагийн анги ({currentEpisode + 1}-р анги)</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {resumedToast && (
                <div className="absolute top-28 left-1/2 -translate-x-1/2 pointer-events-none bg-black/85 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold text-[#347DFF] border border-[#1764F5]/40 flex items-center gap-2 shadow-2xl">
                  <RotateCcw className="w-3.5 h-3.5 text-[#1764F5]" />
                  <span>{resumedToast}</span>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* RIGHT SIDE: Episode Selection & Unlock Panel (Reference Screenshot 3) */}
        <div className="w-full lg:w-[410px] shrink-0 rounded-3xl bg-[#10131D] border border-[#252A36] p-6 flex flex-col justify-between shadow-2xl">
          <div className="space-y-4">
            {/* Top Free Episode Progress Indicator */}
            {isSeries ? (
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <Flame className="w-4 h-4 text-[#347DFF]" />
                  <span>{locale === 'en' ? 'Free episodes' : 'Үнэгүй анги'}</span>
                </div>
                <div className="flex items-center gap-1 flex-1 max-w-[150px] mx-2">
                  {Array.from({ length: Math.min(6, Math.max(1, freeEpisodes)) }, (_, i) => {
                    const active = currentEpisode >= i + 1 && currentEpisode <= freeEpisodes;
                    return (
                      <span
                        key={i}
                        className={`h-1 flex-1 rounded-full ${
                          active ? 'bg-[#1764F5]' : 'bg-[#252A36]'
                        }`}
                      />
                    );
                  })}
                </div>
                <span className="text-[#9CA3AF] font-semibold">
                  {Math.min(currentEpisode, freeEpisodes)}/{freeEpisodes}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                <span className="font-bold text-[#347DFF]">AI MOVIE STREAMING</span>
                <span>{movie.quality}</span>
              </div>
            )}

            {/* Series Title & Episode Summary */}
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-[#9CA3AF] mt-1">
                {isSeries
                  ? `Нийт ${totalEpisodes} анги · Эхний ${freeEpisodes} анги үнэгүй`
                  : `${movie.year} · ${movie.duration} · ★ ${movie.rating}`}
              </p>
            </div>

            {isSeries ? (
              <>
                {/* Range Selector Pills (1–30, 🔒 31–50) */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {ranges.map((r, idx) => {
                    const isSelected = idx === selectedRangeIndex;
                    const rangeLocked = !isAllEpisodesUnlocked && r.start > freeEpisodes;
                    return (
                      <button
                        key={r.start}
                        type="button"
                        onClick={() => setSelectedRangeIndex(idx)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#1E2436] border-[#347DFF] text-white'
                            : 'bg-[#080A10] border-[#252A36] text-[#9CA3AF] hover:text-white'
                        }`}
                      >
                        {rangeLocked && <Lock className="w-3 h-3 text-[#9CA3AF]" />}
                        <span>
                          {r.start}–{r.end}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Lock Status Subline */}
                <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                  {isAllEpisodesUnlocked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">
                        Бүх {totalEpisodes} анги нээлттэй
                      </span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-[#9CA3AF]" />
                      <span>{freeEpisodes + 1}-р ангиас түгжээтэй</span>
                    </>
                  )}
                </div>

                {/* 6-Column Numbered Episode Grid (Screenshot 3) */}
                <div className="grid grid-cols-6 gap-2.5 max-h-[310px] overflow-y-auto pr-1 pt-1">
                  {rangeNumbers.map((epNum) => {
                    const isCurrent = epNum === currentEpisode;
                    const unlocked = isEpisodeUnlocked(epNum);
                    const isCompleted = completedEpisodes.has(epNum);

                    return (
                      <button
                        key={epNum}
                        type="button"
                        onClick={() => handleSelectEpisode(epNum)}
                        className={`relative h-12 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center transition cursor-pointer ${
                          isCurrent
                            ? 'bg-[#1764F5]/20 border-[#1764F5] text-[#347DFF] shadow-[0_0_15px_rgba(23,100,245,0.35)]'
                            : unlocked
                            ? 'bg-[#0C0F18] hover:bg-[#161B2B] border-[#252A36] text-white'
                            : 'bg-[#0A0D14] hover:border-[#252A36] border-[#1A1E2B] text-[#6B7280]'
                        }`}
                      >
                        {isCompleted && !isCurrent && (
                          <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-[#1764F5] text-white flex items-center justify-center shadow">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                        <span>{epNum}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Single Movie Synopsis & Details inside Right Panel */
              <div className="space-y-3 text-xs text-slate-300 leading-relaxed pt-2 border-t border-[#252A36]">
                <p>{getLocalizedMovieText(movie.synopsis, locale, movie.descriptionMn)}</p>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {(movie.genres || []).map((g, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-[#080A10] border border-[#252A36] text-[#9CA3AF]"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Full-Width CTA Button (Screenshot 3: "Бүх ангийг нээх · 7-р ангиас 4,900₮") */}
          <div className="pt-5 mt-4 border-t border-[#252A36] space-y-2.5">
            {isSeries && !isAllEpisodesUnlocked ? (
              <button
                type="button"
                onClick={() => setUnlockModalOpen(true)}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#1764F5] hover:bg-[#347DFF] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(23,100,245,0.4)] transition cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>
                  Бүх ангийг нээх · {freeEpisodes + 1}-р ангиас {unlockPrice.toLocaleString()}₮
                </span>
              </button>
            ) : (
              <div className="w-full py-3 px-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  {locale === 'en' ? 'All Episodes Unlocked' : 'Бүх анги нээлттэй байна'}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[#080A10] hover:bg-[#161B29] border border-[#252A36] text-xs font-semibold text-[#9CA3AF] hover:text-white transition cursor-pointer"
            >
              {locale === 'en' ? 'Back to Details' : 'Киноны дэлгэрэнгүй рүү буцах'}
            </button>
          </div>
        </div>
      </div>

      {/* Inline Rental / Unlock Modal inside Player */}
      {unlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl bg-[#10131D] border border-[#252A36] p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setUnlockModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#080A10] text-[#9CA3AF] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1764F5]/20 text-[#347DFF] text-xs font-bold mb-2">
                <Unlock className="w-3.5 h-3.5" />
                <span>{currentEpisode}-р ангиас үргэлжлүүлэн үзэх</span>
              </span>
              <h4 className="text-lg font-extrabold text-white">{title}</h4>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Бүх {totalEpisodes} ангийг <strong className="text-white">{unlockPrice.toLocaleString()}₮</strong>-өөр{' '}
                {rentalDurationHours} цаг түрээслэх эсвэл VIP багцаар хязгааргүй үзээрэй.
              </p>
            </div>

            {rentalError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
                {rentalError}
              </div>
            )}

            {!rentalOrder ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRentalMethod('wire_qpay')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      rentalMethod === 'wire_qpay'
                        ? 'bg-[#1764F5]/15 border-[#1764F5] text-white'
                        : 'bg-[#080A10] border-[#252A36] text-[#9CA3AF]'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-[#347DFF] mb-1" />
                    <div className="text-xs font-bold text-white">Wire.mn QPay</div>
                    <div className="text-[10px] text-[#9CA3AF]">Шуурхай нээгдэнэ</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRentalMethod('bank_transfer')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      rentalMethod === 'bank_transfer'
                        ? 'bg-[#1764F5]/15 border-[#1764F5] text-white'
                        : 'bg-[#080A10] border-[#252A36] text-[#9CA3AF]'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-[#E8B94F] mb-1" />
                    <div className="text-xs font-bold text-white">Хаан Банк</div>
                    <div className="text-[10px] text-[#9CA3AF]">5132104221</div>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={rentalLoading}
                  onClick={() => handleCreateRentalOrder(rentalMethod)}
                  className="w-full py-3 rounded-xl bg-[#1764F5] hover:bg-[#347DFF] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {rentalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                  <span>
                    {currentUser
                      ? `Бүх ангийг нээх · ${unlockPrice.toLocaleString()}₮`
                      : 'Нэвтэрч бүх ангийг нээх'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUnlockModalOpen(false);
                    onClose();
                    onGoToPricing();
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#E8B94F]/15 border border-[#E8B94F]/40 text-[#E8B94F] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>VIP Багц авах (19,900₮)</span>
                </button>
              </div>
            ) : rentalOrder.paymentMethod === 'wire_qpay' ? (
              <div className="space-y-3 text-center">
                <div className="p-3.5 rounded-2xl bg-[#080A10] border border-[#252A36]">
                  <div className="text-xs text-[#9CA3AF]">{rentalOrder.orderNumber}</div>
                  <div className="text-xl font-black text-white mt-1">
                    {unlockPrice.toLocaleString()}₮
                  </div>
                </div>
                <button
                  type="button"
                  disabled={rentalLoading}
                  onClick={handleSimulateQPayPaid}
                  className="w-full py-3 rounded-xl bg-[#1764F5] hover:bg-[#347DFF] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {rentalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Төлбөр шалгах / Шууд үзэх</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmBankRental} className="space-y-3">
                <div className="p-3 rounded-2xl bg-[#080A10] border border-[#252A36] text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#9CA3AF]">Хаан Банк:</span>
                    <span className="font-bold text-white">5132104221</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9CA3AF]">Утга:</span>
                    <button
                      type="button"
                      onClick={() => void copyTextToClipboard(rentalOrder.orderNumber)}
                      className="font-mono font-bold text-[#347DFF] flex items-center gap-1"
                    >
                      <span>{rentalOrder.orderNumber}</span>
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {bankSubmitted ? (
                  <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-300 text-center">
                    Шилжүүлгийн мэдээлэл илгээгдлээ!
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={bankSenderName}
                      onChange={(e) => setBankSenderName(e.target.value)}
                      placeholder="Шилжүүлсэн хүний нэр"
                      className="w-full px-3 py-2 rounded-xl bg-[#080A10] border border-[#252A36] text-xs text-white"
                      required
                    />
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-[#1764F5] text-white font-bold text-xs cursor-pointer"
                    >
                      Шилжүүлснээ баталгаажуулах
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
