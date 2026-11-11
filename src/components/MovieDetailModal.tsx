import React, { useState } from 'react';
import { X, Play, Plus, Check, Star, Film } from 'lucide-react';
import { Movie, getLocalizedMovieText } from '../data/movies.js';
import { useLocale, useTranslations } from '../i18n/I18nContext.js';
import { isMovieLockedForSubscription } from '../utils/accessControl.js';

interface MovieDetailModalProps {
  movie: Movie;
  onClose: () => void;
  onPlay: (movie: Movie) => void;
  hasActiveSubscription: boolean;
  subscription?: any;
  userRole?: string;
  onOpenPricing: () => void;
  isInList: boolean;
  onToggleList: (movie: Movie) => void;
}

export const MovieDetailModal: React.FC<MovieDetailModalProps> = ({
  movie,
  onClose,
  onPlay,
  hasActiveSubscription,
  subscription,
  userRole,
  onOpenPricing,
  isInList,
  onToggleList
}) => {
  const { locale } = useLocale();
  const tDetails = useTranslations('MovieDetails');
  const [activeTab, setActiveTab] = useState<'overview' | 'trailer' | 'episodes' | 'cast'>('overview');

  const titleMn = movie.titleMn || getLocalizedMovieText(movie.title, 'mn', '');
  const titleEn = movie.titleEn || getLocalizedMovieText(movie.title, 'en', '');
  const title = getLocalizedMovieText(movie.title, locale, titleMn);
  const altTitle = locale === 'mn' ? titleEn : titleMn;

  const synopsisMn = (movie as any).synopsisMn || movie.descriptionMn || getLocalizedMovieText(movie.synopsis, 'mn', '');
  const synopsisEn = (movie as any).synopsisEn || movie.descriptionEn || getLocalizedMovieText(movie.synopsis, 'en', '');
  const synopsis = getLocalizedMovieText(movie.synopsis, locale, synopsisMn);

  const director = getLocalizedMovieText(movie.director, locale, movie.directorMn);
  const cast = getLocalizedMovieText(movie.cast, locale, movie.castMn);
  const genre =
    getLocalizedMovieText(movie.genre, locale, movie.genreMn) ||
    ((movie as any).genres || []).join(' • ');
  const bannerSrc = movie.bannerUrl || (movie as any).backdropUrl || movie.posterUrl;

  const isLocked =
    subscription !== undefined
      ? isMovieLockedForSubscription(movie, subscription, userRole)
      : movie.isPremium && !hasActiveSubscription;

  const mockEpisodes = [
    {
      num: 1,
      titleMn: 'Нээлт: Квант Эхлэл',
      titleEn: 'Genesis: Quantum Awakening',
      duration: '48m',
      descMn: 'Сүлжээний гол зангилаа сэрж, анхны ухамсарт дохиог түгээж эхэлнэ.',
      descEn: 'The core network awakens and emits its first sentient transmission.'
    },
    {
      num: 2,
      titleMn: 'Хоёрдугаар бүлэг: Сүүдрийн Мөр',
      titleEn: 'Chapter II: Shadow Vectors',
      duration: '52m',
      descMn: 'Мөрдөгчид болон хууль бус квант лабораторийн хоорондох нууц тулаан.',
      descEn: 'A high-stakes clash between enforcement operatives and covert AI synth labs.'
    },
    {
      num: 3,
      titleMn: 'Төгсгөлийн Дохио: Алтан Орд',
      titleEn: 'Final Signal: The Golden Horde',
      duration: '56m',
      descMn: 'Олон хэмжээст орон зайн сүүлчийн шийдвэрлэх мөч.',
      descEn: 'The definitive turning point in multi-dimensional nomadic space.'
    }
  ];

  const minPlanPriceLabel =
    movie.minPlan === 'premium'
      ? 'PREMIUM VIP (19,900₮)'
      : movie.minPlan === 'standard'
      ? 'STANDARD VIP (14,900₮+)'
      : 'BASIC VIP (9,900₮+)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0b0f19] border border-white/15 rounded-2xl overflow-hidden shadow-2xl shadow-black my-auto select-none">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/70 hover:bg-black text-slate-300 hover:text-white transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Backdrop Header */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-[#070a12]">
          <img
            src={bannerSrc}
            alt={title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center filter brightness-[0.6] contrast-[1.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0f19] via-[#0b0f19]/60 to-transparent" />

          {/* Backdrop Details */}
          <div className="absolute bottom-6 left-6 right-6 z-10 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#e5a93c] text-black font-extrabold text-[10px] uppercase">
                {movie.isPremium ? `${(movie.minPlan || 'basic').toUpperCase()} VIP` : 'FREE'}
              </span>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[#e5a93c] border border-[#e5a93c]/30 text-xs font-bold">
                <Star className="w-3.5 h-3.5 fill-[#e5a93c]" />
                <span>{movie.rating}</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-xs text-slate-300">
                {movie.year}
              </span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-xs text-slate-300">
                {movie.duration}
              </span>
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-xs text-slate-300">
                {movie.quality}
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {title}
            </h2>
            <div className="text-xs sm:text-sm text-slate-400 font-medium">
              {genre} {altTitle ? `· ${altTitle}` : ''}
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => {
                  onPlay(movie);
                  onClose();
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#e5a93c] to-amber-400 text-black font-extrabold text-sm flex items-center gap-2 hover:brightness-110 transition shadow-lg cursor-pointer"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>
                  {!isLocked
                    ? tDetails('playMovie')
                    : `${tDetails('playMovie')} (${(movie.minPlan || 'basic').toUpperCase()} VIP)`}
                </span>
              </button>

              {movie.trailerUrl && (
                <button
                  onClick={() => setActiveTab('trailer')}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-sm font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  <Film className="w-4 h-4 text-[#e5a93c]" />
                  <span>{locale === 'en' ? 'Watch Trailer' : 'Трейлер үзэх'}</span>
                </button>
              )}

              <button
                onClick={() => onToggleList(movie)}
                className={`px-4 py-2.5 rounded-xl border text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
                  isInList
                    ? 'bg-[#e5a93c]/15 text-[#e5a93c] border-[#e5a93c]/40'
                    : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
                }`}
              >
                {isInList ? <Check className="w-4 h-4 text-[#e5a93c]" /> : <Plus className="w-4 h-4" />}
                <span>{isInList ? tDetails('inList') : tDetails('addToList')}</span>
              </button>

              {isLocked && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenPricing();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-950/60 text-[#e5a93c] border border-[#e5a93c]/50 text-xs font-bold hover:bg-amber-900/60 transition cursor-pointer"
                >
                  {locale === 'en' ? 'Unlock with QPay' : 'QPay-ээр багц нээх'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Streamline OTT Tabs */}
        <div className="border-b border-white/10 px-6 bg-[#0e1422] flex items-center gap-6 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 border-b-2 transition cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#e5a93c] text-[#e5a93c]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {tDetails('overviewTab')}
          </button>
          {movie.trailerUrl && (
            <button
              onClick={() => setActiveTab('trailer')}
              className={`py-3.5 border-b-2 transition cursor-pointer ${
                activeTab === 'trailer'
                  ? 'border-[#e5a93c] text-[#e5a93c]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {locale === 'en' ? 'Trailer' : 'Трейлер'}
            </button>
          )}
          <button
            onClick={() => setActiveTab('episodes')}
            className={`py-3.5 border-b-2 transition cursor-pointer ${
              activeTab === 'episodes'
                ? 'border-[#e5a93c] text-[#e5a93c]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {tDetails('episodesTab')}
          </button>
          <button
            onClick={() => setActiveTab('cast')}
            className={`py-3.5 border-b-2 transition cursor-pointer ${
              activeTab === 'cast'
                ? 'border-[#e5a93c] text-[#e5a93c]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {tDetails('castTab')}
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  {locale === 'en' ? 'Storyline' : 'Киноны товч агуулга'}
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {synopsis}
                </p>

                {synopsisMn && synopsisEn && synopsisMn !== synopsisEn && (
                  <div className="pt-2 border-t border-white/10 text-xs text-slate-400">
                    <span className="font-bold text-slate-300 block mb-1">
                      {locale === 'mn' ? 'English Synopsis:' : 'Монгол тайлбар:'}
                    </span>
                    <p>{locale === 'mn' ? synopsisEn : synopsisMn}</p>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                  <Film className="w-5 h-5 text-[#e5a93c] shrink-0" />
                  <div className="text-xs text-slate-300">
                    <span className="font-semibold text-white">4K Ultra HD & Dolby Atmos:</span>{' '}
                    {locale === 'en'
                      ? 'Streamlined adaptive bitrate server with instant bufferless playback.'
                      : 'Серверийн өндөр хурдны дамжуулалтаар саадгүй үзэх боломжтой.'}
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-3.5 text-xs bg-[#111827] p-4 rounded-xl border border-white/10">
                <div>
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] block font-bold">
                    {locale === 'en' ? 'Titles (MN / EN)' : 'Нэр (МН / EN)'}
                  </span>
                  <span className="text-white font-medium mt-0.5 block">
                    {titleMn} / {titleEn}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] block font-bold">
                    {tDetails('director')}
                  </span>
                  <span className="text-white font-medium mt-0.5 block">{director || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] block font-bold">
                    {tDetails('cast')}
                  </span>
                  <span className="text-white font-medium mt-0.5 block">{cast || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] block font-bold">
                    {tDetails('minPlanRequired')}
                  </span>
                  <span className="text-[#e5a93c] font-bold mt-0.5 block uppercase">
                    {movie.isPremium ? minPlanPriceLabel : locale === 'en' ? 'FREE ACCESS' : 'ҮНЭГҮЙ'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trailer' && movie.trailerUrl && (
            <div className="space-y-3">
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10">
                <video
                  src={movie.trailerUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {activeTab === 'episodes' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 font-medium mb-2 flex items-center justify-between">
                <span>{locale === 'en' ? 'Season 1 Chapters' : 'Бүлэг 1: Ангиуд'}</span>
                <span className="text-[#e5a93c]">3 {locale === 'en' ? 'Episodes' : 'Анги'}</span>
              </div>
              {mockEpisodes.map((ep) => (
                <div
                  key={ep.num}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[#111827] border border-white/10 hover:border-[#e5a93c]/40 transition group cursor-pointer"
                  onClick={() => {
                    onPlay(movie);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-[#e5a93c] group-hover:bg-[#e5a93c] group-hover:text-black transition">
                      {ep.num}
                    </div>
                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#e5a93c] transition">
                        {locale === 'en' ? ep.titleEn : ep.titleMn}
                      </h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {locale === 'en' ? ep.descEn : ep.descMn}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-400">{ep.duration}</span>
                    <Play className="w-4 h-4 text-slate-400 group-hover:text-[#e5a93c] transition" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'cast' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {locale === 'en' ? 'Generative Cast & Production Guild' : 'AI Дүрүүд ба Бүтээгчид'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#111827] border border-white/10">
                  <div className="text-white font-bold">{director || 'SODON AI Studio'}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    {locale === 'en' ? 'Lead Neural Director & Screenplay' : 'Ерөнхий AI Найруулагч'}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#111827] border border-white/10">
                  <div className="text-white font-bold">{cast || 'Synthetic Ensemble'}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    {locale === 'en' ? 'Synthetic Neural Performers' : 'AI Синтетик жүжигчид'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
