import React, { useState, useEffect } from 'react';
import { Film } from 'lucide-react';
import { resolveSafePosterUrl, FALLBACK_POSTER_ASSETS } from '../utils/ageGateAndPosters';

interface MoviePosterProps {
  src?: string | null;
  alt: string;
  seedKey?: string | number;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export const MoviePoster: React.FC<MoviePosterProps> = ({
  src,
  alt,
  seedKey = 'movie',
  className = 'w-full h-full object-cover',
  loading = 'lazy'
}) => {
  const initialUrl = resolveSafePosterUrl(src, seedKey);
  const fallbackUrl = resolveSafePosterUrl('', seedKey);

  const [currentSrc, setCurrentSrc] = useState<string>(initialUrl);
  const [hasFailedAll, setHasFailedAll] = useState<boolean>(false);

  useEffect(() => {
    setCurrentSrc(resolveSafePosterUrl(src, seedKey));
    setHasFailedAll(false);
  }, [src, seedKey]);

  const handleError = () => {
    if (currentSrc !== fallbackUrl) {
      setCurrentSrc(fallbackUrl);
    } else if (currentSrc !== FALLBACK_POSTER_ASSETS[0]) {
      setCurrentSrc(FALLBACK_POSTER_ASSETS[0]);
    } else {
      setHasFailedAll(true);
    }
  };

  if (hasFailedAll) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#131926] to-[#0B0E17] text-[#94A3B8] p-4 text-center ${className}`}
      >
        <Film className="w-8 h-8 text-[#F5B936]/70 mb-2" />
        <span className="text-xs font-bold text-white/80 line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading={loading}
      onError={handleError}
      className={className}
    />
  );
};
