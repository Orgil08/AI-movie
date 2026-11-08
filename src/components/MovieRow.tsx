import React from 'react';
import { Play, Lock, Sparkles, Star } from 'lucide-react';
import { Movie } from '../data/movies.js';

interface MovieRowProps {
  title: string;
  subtitle?: string;
  movies: Movie[];
  hasActiveSubscription: boolean;
  onPlay: (movie: Movie) => void;
  onSelect: (movie: Movie) => void;
}

export const MovieRow: React.FC<MovieRowProps> = ({
  title,
  subtitle,
  movies,
  hasActiveSubscription,
  onPlay,
  onSelect
}) => {
  return (
    <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <span>{title}</span>
          <span className="w-2 h-2 rounded-full bg-red-600"></span>
        </h2>
        {subtitle && <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {movies.map((movie) => {
          const isLocked = movie.isPremium && !hasActiveSubscription;

          return (
            <div
              key={movie.id}
              className="group relative rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition-all duration-300 hover:shadow-2xl hover:shadow-red-950/20 hover:-translate-y-1 cursor-pointer flex flex-col"
              onClick={() => onSelect(movie)}
            >
              {/* Poster Image Container */}
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-950">
                <img
                  src={movie.posterUrl}
                  alt={movie.titleMn}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                  loading="lazy"
                />

                {/* Top Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                  {movie.isPremium ? (
                    <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md">
                      Премиум
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-emerald-600 text-white shadow-md">
                      Үнэгүй
                    </span>
                  )}
                </div>

                <div className="absolute top-2 right-2 z-10">
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-black/70 backdrop-blur-sm text-amber-400 border border-amber-500/20 flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-amber-400" />
                    {movie.rating}
                  </span>
                </div>

                {/* Lock Overlay when Premium and Unsubscribed */}
                {isLocked && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center mb-1 text-red-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                      Гишүүнчлэл хэрэгтэй
                    </span>
                    <span className="text-[10px] text-neutral-300 mt-0.5">
                      QPay-ээр нээх
                    </span>
                  </div>
                )}

                {/* Hover Play Button (when unlocked or clicked) */}
                {!isLocked && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlay(movie);
                      }}
                      className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition duration-200"
                      aria-label={`${movie.titleMn} тоглуулах`}
                    >
                      <Play className="w-6 h-6 fill-white ml-0.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Card Meta info */}
              <div className="p-3 flex-1 flex flex-col justify-between bg-neutral-900/90">
                <div>
                  <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-red-400 transition-colors">
                    {movie.titleMn}
                  </h3>
                  <div className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                    {movie.genreMn}
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400 font-medium">
                  <span>{movie.duration}</span>
                  <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                    {movie.quality}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
