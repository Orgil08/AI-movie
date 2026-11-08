import React from 'react';
import { Play, Info, Sparkles, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import { Movie } from '../data/movies.js';

interface HeroBannerProps {
  movie: Movie;
  onPlay: (movie: Movie) => void;
  onSelect: (movie: Movie) => void;
  hasActiveSubscription: boolean;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  movie,
  onPlay,
  onSelect,
  hasActiveSubscription
}) => {
  return (
    <div className="relative w-full h-[70vh] min-h-[500px] max-h-[720px] bg-neutral-950 overflow-hidden select-none">
      {/* Background Image with Cinematic Overlays */}
      <img
        src={movie.bannerUrl}
        alt={movie.titleMn}
        className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.65] contrast-[1.1] scale-105 transition-transform duration-1000 ease-out"
      />

      {/* Cinematic Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/60 to-transparent w-full md:w-3/4" />

      {/* Content Container */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pb-16 md:pb-24 z-10">
        <div className="max-w-2xl space-y-4">
          {/* Badge line */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-0.5 rounded bg-red-600 text-white uppercase tracking-wider flex items-center gap-1 font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              AI ЭХ ҮЗВЭР
            </span>
            <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-amber-400 border border-amber-500/30">
              ★ {movie.rating}
            </span>
            <span className="px-2 py-0.5 rounded bg-white/10 backdrop-blur-md text-neutral-300">
              {movie.year}
            </span>
            <span className="px-2 py-0.5 rounded bg-white/10 backdrop-blur-md text-neutral-300">
              {movie.duration}
            </span>
            <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 border border-neutral-700">
              {movie.quality}
            </span>
            {movie.isPremium && (
              <span className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-500/20 to-red-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Премиум
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-md">
            {movie.titleMn}
          </h1>

          <div className="text-sm font-medium text-neutral-400 italic">
            {movie.titleEn} • Найруулагч: {movie.directorMn}
          </div>

          {/* Description */}
          <p className="text-sm sm:text-base text-neutral-300 line-clamp-3 leading-relaxed drop-shadow">
            {movie.descriptionMn}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              onClick={() => onPlay(movie)}
              className="px-6 py-3 rounded-lg bg-white text-black font-bold text-base flex items-center gap-2 hover:bg-neutral-200 transition active:scale-95 shadow-xl cursor-pointer"
            >
              <Play className="w-5 h-5 fill-black" />
              <span>{hasActiveSubscription || !movie.isPremium ? 'Шууд Үзэх' : 'Үзэх (Премиум)'}</span>
            </button>

            <button
              onClick={() => onSelect(movie)}
              className="px-6 py-3 rounded-lg bg-neutral-800/80 backdrop-blur-md text-white font-semibold text-base flex items-center gap-2 hover:bg-neutral-700/80 border border-white/20 transition active:scale-95 cursor-pointer"
            >
              <Info className="w-5 h-5" />
              <span>Дэлгэрэнгүй мэдээлэл</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
