import React, { useState, useEffect } from 'react';
import { Play, Info, Star, Plus, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie, getLocalizedMovieText } from '../data/movies.js';
import { useTranslations, useLocale } from '../i18n/I18nContext.js';

interface HeroBannerProps {
  movie: Movie;
  slides?: Movie[];
  onPlay: (movie: Movie) => void;
  onSelect: (movie: Movie) => void;
  hasActiveSubscription: boolean;
  subscription?: any;
  userRole?: string;
  isInList?: boolean;
  myListIds?: string[];
  onToggleList?: (movie: Movie) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  movie,
  slides,
  onPlay,
  onSelect,
  isInList = false,
  myListIds,
  onToggleList
}) => {
  const t = useTranslations('HomePage');
  const tDetails = useTranslations('MovieDetails');
  const { locale } = useLocale();

  const slideList = React.useMemo(() => {
    if (slides && slides.length > 0) return slides.slice(0, 5);
    return movie ? [movie] : [];
  }, [slides, movie]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex >= slideList.length) {
      setActiveIndex(0);
    }
  }, [slideList.length, activeIndex]);

  useEffect(() => {
    if (slideList.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slideList.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [slideList.length]);

  if (slideList.length === 0) return null;

  const activeMovie = slideList[activeIndex] || movie;
  const title = getLocalizedMovieText(activeMovie.title, locale, activeMovie.titleMn);
  const synopsis = getLocalizedMovieText(
    activeMovie.synopsis,
    locale,
    (activeMovie as any).synopsisMn || activeMovie.descriptionMn
  );
  const genresList: string[] =
    Array.isArray((activeMovie as any).genres) && (activeMovie as any).genres.length > 0
      ? (activeMovie as any).genres
      : [getLocalizedMovieText(activeMovie.genre, locale, activeMovie.genreMn) || 'Драм'];
  const bannerSrc = activeMovie.bannerUrl || (activeMovie as any).backdropUrl || activeMovie.posterUrl;
  const isCurrentInList = myListIds ? myListIds.includes(activeMovie.id) : isInList;

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + slideList.length) % slideList.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % slideList.length);
  };

  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 pt-5 pb-3 select-none">
      <div className="relative w-full h-[460px] sm:h-[510px] lg:h-[550px] rounded-3xl overflow-hidden bg-[#10131D] border border-[#252A36] shadow-[0_24px_60px_rgba(0,0,0,0.75)]">
        {/* Background Backdrop */}
        <img
          key={activeMovie.id}
          src={bannerSrc}
          alt={title}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.68] contrast-[1.08] transition-all duration-700 ease-out"
        />

        {/* Deep Dark Cinema Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080A10] via-[#080A10]/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080A10] via-[#080A10]/80 to-transparent w-full lg:w-3/4" />

        {/* Top Bar: Original / Content Type Badges + Carousel Arrows */}
        <div className="relative z-10 flex items-center justify-between px-6 sm:px-10 pt-6 sm:pt-8">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#080A10]/85 backdrop-blur-md border border-[#252A36] text-xs font-bold text-white shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#1764F5] shadow-[0_0_8px_#1764F5]" />
              <span>AI MOVIE Original</span>
            </span>
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-[#10131D]/80 backdrop-blur-md border border-[#252A36] text-xs font-medium text-[#9CA3AF]">
              {activeMovie.type === 'series'
                ? locale === 'en'
                  ? `TV Series · ${activeMovie.totalEpisodes || 50} Ep`
                  : `Олон ангит кино · ${activeMovie.totalEpisodes || 50} анги`
                : locale === 'en'
                ? 'Feature Film'
                : 'Уран сайхны кино'}
            </span>
            {activeMovie.hasMongolianSubtitles !== false && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1764F5]/15 border border-[#1764F5]/40 text-xs font-semibold text-white">
                <span>🇲🇳</span>
                <span>{locale === 'en' ? 'MN Subtitles' : 'Монгол хадмалтай'}</span>
              </span>
            )}
          </div>

          {slideList.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous slide"
                className="w-9 h-9 rounded-full bg-[#080A10]/70 hover:bg-[#1764F5] border border-[#252A36] hover:border-[#1764F5] text-white flex items-center justify-center transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next slide"
                className="w-9 h-9 rounded-full bg-[#080A10]/70 hover:bg-[#1764F5] border border-[#252A36] hover:border-[#1764F5] text-white flex items-center justify-center transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom Content & Slide Selector Strip */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-6 sm:px-10 pb-6 sm:pb-9 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          {/* Left Hero Details */}
          <div className="max-w-xl space-y-3.5">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
              {title}
            </h1>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-medium text-slate-200">
              <span className="inline-flex items-center gap-1 text-[#E8B94F] font-bold">
                <Star className="w-3.5 h-3.5 fill-[#E8B94F] text-[#E8B94F]" />
                <span>{activeMovie.rating}</span>
              </span>
              <span className="text-[#9CA3AF]">•</span>
              <span>{activeMovie.year}</span>
              <span className="text-[#9CA3AF]">•</span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-xs font-semibold text-white">
                {activeMovie.ageRating || '16+'}
              </span>
              {genresList.slice(0, 3).map((g, i) => (
                <React.Fragment key={i}>
                  <span className="text-[#9CA3AF]">•</span>
                  <span className="text-slate-300">{g}</span>
                </React.Fragment>
              ))}
            </div>

            {/* Short Description */}
            <p className="text-xs sm:text-sm text-[#9CA3AF] line-clamp-2 leading-relaxed max-w-lg">
              {synopsis}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onPlay(activeMovie)}
                className="px-5 py-2.5 rounded-xl bg-[#1764F5] hover:bg-[#347DFF] text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition shadow-lg shadow-[#1764F5]/30 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>
                  {activeMovie.type === 'series'
                    ? locale === 'en'
                      ? 'Watch Ep 1 Free'
                      : '1-р анги үзэх'
                    : t('watchNow')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelect(activeMovie)}
                className="px-4 py-2.5 rounded-xl bg-[#10131D]/90 hover:bg-[#181D2C] text-white font-semibold text-xs sm:text-sm flex items-center gap-2 border border-[#252A36] hover:border-[#1764F5]/60 transition cursor-pointer"
              >
                <Info className="w-4 h-4 text-[#347DFF]" />
                <span>{t('moreInfo')}</span>
              </button>

              {onToggleList && (
                <button
                  type="button"
                  onClick={() => onToggleList(activeMovie)}
                  data-testid="hero-toggle-mylist-btn"
                  className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                    isCurrentInList
                      ? 'bg-[#1764F5]/20 text-[#347DFF] border-[#1764F5]/50'
                      : 'bg-[#080A10]/70 hover:bg-[#10131D] text-slate-200 border-[#252A36]'
                  }`}
                >
                  {isCurrentInList ? (
                    <Check className="w-4 h-4 text-[#347DFF]" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>{isCurrentInList ? tDetails('inList') : tDetails('addToList')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Slide Thumbnail Strip (iKINO Screenshot 1 Reference) */}
          {slideList.length > 1 && (
            <div className="hidden md:flex items-center gap-3 overflow-x-auto no-scrollbar max-w-full lg:max-w-[54%]">
              {slideList.slice(0, 4).map((slide, idx) => {
                const isSelected = idx === activeIndex;
                const slideTitle = getLocalizedMovieText(slide.title, locale, slide.titleMn);
                const thumbSrc = slide.bannerUrl || (slide as any).backdropUrl || slide.posterUrl;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={`flex items-center gap-3 p-2 rounded-2xl border backdrop-blur-xl transition-all text-left w-52 shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-[#10131D]/95 border-[#1764F5] shadow-[0_0_20px_rgba(23,100,245,0.35)]'
                        : 'bg-[#080A10]/75 border-[#252A36] hover:border-slate-600 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={thumbSrc}
                      alt={slideTitle}
                      referrerPolicy="no-referrer"
                      className="w-16 h-11 rounded-xl object-cover shrink-0 border border-white/10"
                    />
                    <div className="min-w-0 flex-1 pr-1">
                      <div className="text-[11px] font-bold text-[#347DFF] truncate">
                        {slide.type === 'series'
                          ? locale === 'en'
                            ? 'Series'
                            : 'Цуврал'
                          : locale === 'en'
                          ? 'Movie'
                          : 'Кино'}
                      </div>
                      <div className="text-xs font-bold text-white truncate mt-0.5">
                        {slideTitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
