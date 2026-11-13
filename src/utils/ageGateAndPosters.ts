export const FALLBACK_POSTER_ASSETS = [
  '/src/assets/images/poster_quantum_shaman_1794122760152.jpg',
  '/src/assets/images/hero_nomad_2099_1794122759432.jpg',
  '/src/assets/images/hero_singularity_core_1794122760127.jpg'
] as const;

export interface AgeGateMovieLike {
  id?: string;
  titleMn?: string;
  titleEn?: string;
  directorMn?: string;
  directorEn?: string;
  ageRating?: string;
  isAdult?: boolean;
  isOriginal?: boolean;
  isExclusive?: boolean;
  featured?: boolean;
  trending?: boolean;
  type?: 'movie' | 'series' | string;
  genreMn?: string;
  genreEn?: string;
  genres?: string[];
  tags?: string[];
  posterUrl?: string;
  backdropUrl?: string;
  bannerUrl?: string;
}

/**
 * Determines whether a movie or series requires 18+ age verification.
 * Ordinary movies (13+, 16+, G, PG) do NOT require 18+ verification.
 */
export function isAdultRestrictedMovie(movie: AgeGateMovieLike | null | undefined): boolean {
  if (!movie) return false;
  if (movie.isAdult === true) return true;

  const rating = String(movie.ageRating || '').trim().toUpperCase();
  if (rating === '18+' || rating === 'R18+' || rating === 'NC-17' || rating === 'ADULT') {
    return true;
  }

  if (Array.isArray(movie.tags)) {
    for (const tag of movie.tags) {
      const normalized = String(tag || '').trim().toLowerCase();
      if (normalized === '18+' || normalized === 'hot+ 18+' || normalized === 'adult') {
        return true;
      }
    }
  }

  return false;
}

/**
 * Filters a movie list for public/catalog endpoints based on 18+ verification status.
 * Unverified non-admin users never receive 18+ restricted content in general listings or search suggestions.
 */
export function filterMoviesForAgeGate<T extends AgeGateMovieLike>(
  movies: T[],
  isAgeVerified: boolean,
  userRole?: string | null
): T[] {
  if (!Array.isArray(movies)) return [];
  if (isAgeVerified || userRole === 'admin') {
    return movies;
  }
  return movies.filter((m) => !isAdultRestrictedMovie(m));
}

/**
 * Checks if a poster URL string looks structurally valid and is not a broken placeholder.
 */
export function isValidPosterUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === '#') {
    return false;
  }
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith('/')) {
    return /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i.test(trimmed);
  }
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (!parsed.hostname || parsed.hostname === 'localhost' || parsed.hostname.endsWith('.invalid')) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Resolves a guaranteed safe poster URL so broken or missing poster fields in MongoDB
 * never display raw alt text or broken browser image icons.
 */
export function resolveSafePosterUrl(
  posterUrl: string | null | undefined,
  seedKey?: string | number
): string {
  if (isValidPosterUrl(posterUrl)) {
    return posterUrl!.trim();
  }

  let index = 0;
  if (typeof seedKey === 'number' && Number.isFinite(seedKey)) {
    index = Math.abs(Math.floor(seedKey)) % FALLBACK_POSTER_ASSETS.length;
  } else if (typeof seedKey === 'string' && seedKey.length > 0) {
    let hash = 0;
    for (let i = 0; i < seedKey.length; i++) {
      hash = (hash * 31 + seedKey.charCodeAt(i)) >>> 0;
    }
    index = hash % FALLBACK_POSTER_ASSETS.length;
  }

  return FALLBACK_POSTER_ASSETS[index];
}

/**
 * Filters movies for the dedicated SODON AI MOVIE Originals view.
 */
export function filterOriginalsMovies<T extends AgeGateMovieLike>(
  movies: T[],
  contentType: 'all' | 'movie' | 'series' = 'all'
): T[] {
  if (!Array.isArray(movies)) return [];

  const originals = movies.filter((m) => {
    if (isAdultRestrictedMovie(m)) return false;
    const hasOriginalFlag = Boolean(m.isOriginal || m.isExclusive || m.featured);
    const hasOriginalTag =
      Array.isArray(m.tags) &&
      m.tags.some((t) => /original|онцгой|exclusive|streamline gold|шинэ нээлт/i.test(String(t)));
    return hasOriginalFlag || hasOriginalTag;
  });

  const baseList = originals.length > 0 ? originals : movies.filter((m) => !isAdultRestrictedMovie(m));

  if (contentType === 'movie') {
    return baseList.filter((m) => (m.type || 'movie') === 'movie');
  }
  if (contentType === 'series') {
    return baseList.filter((m) => m.type === 'series');
  }
  return baseList;
}

/**
 * Filters movies for the age-verified Hot+ 18+ view.
 */
export function filterHotPlusMovies<T extends AgeGateMovieLike>(
  movies: T[],
  options?: {
    contentType?: 'all' | 'movie' | 'series';
    genre?: string;
    search?: string;
  }
): T[] {
  if (!Array.isArray(movies)) return [];

  const contentType = options?.contentType || 'all';
  const genre = (options?.genre || 'all').trim().toLowerCase();
  const search = (options?.search || '').trim().toLowerCase();

  // Prioritize explicit 18+ movies first, then trending titles
  const hotPool = movies.filter((m) => isAdultRestrictedMovie(m) || Boolean(m.trending));
  const pool = hotPool.length > 0 ? hotPool : movies;

  return pool
    .filter((m) => {
      if (contentType === 'movie' && (m.type || 'movie') !== 'movie') return false;
      if (contentType === 'series' && m.type !== 'series') return false;

      if (genre && genre !== 'all' && genre !== 'бүгд') {
        const hay = [
          m.genreMn || '',
          m.genreEn || '',
          ...(Array.isArray(m.genres) ? m.genres : []),
          ...(Array.isArray(m.tags) ? m.tags : [])
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(genre)) return false;
      }

      if (search) {
        const hay = [
          m.titleMn || '',
          m.titleEn || '',
          m.directorMn || '',
          m.directorEn || '',
          m.genreMn || '',
          m.genreEn || ''
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(search)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const aAdult = isAdultRestrictedMovie(a) ? 1 : 0;
      const bAdult = isAdultRestrictedMovie(b) ? 1 : 0;
      return bAdult - aAdult;
    });
}
