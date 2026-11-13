import { Movie, getLocalizedMovieText } from '../data/movies.js';
import { Locale } from '../i18n/types.js';

export const MY_LIST_STORAGE_KEY = 'sodon_my_list';
export const DEFAULT_MY_LIST_IDS = ['ai-nomad-2099', 'quantum-shaman'];

export interface MyListToastNotification {
  id: string;
  movieId: string;
  movieTitle: string;
  posterUrl?: string;
  action: 'added' | 'removed';
  title: string;
  message: string;
  createdAt: number;
}

function getSafeStorage(customStorage?: Storage): Storage | null {
  if (customStorage) return customStorage;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Retrieve the user's saved 'My List' movie IDs from storage.
 */
export function getMyListIds(
  storage?: Storage,
  initializeIfEmpty: boolean = true
): string[] {
  const s = getSafeStorage(storage);
  if (!s) {
    return initializeIfEmpty ? [...DEFAULT_MY_LIST_IDS] : [];
  }

  try {
    const raw = s.getItem(MY_LIST_STORAGE_KEY);
    if (!raw) {
      if (initializeIfEmpty) {
        s.setItem(MY_LIST_STORAGE_KEY, JSON.stringify(DEFAULT_MY_LIST_IDS));
        return [...DEFAULT_MY_LIST_IDS];
      }
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  } catch {
    return [];
  }
}

/**
 * Build a localized toast notification payload when a movie is added or removed from 'My List'.
 */
export function createMyListToast(
  movie: Movie,
  action: 'added' | 'removed',
  locale: Locale = 'mn'
): MyListToastNotification {
  const fallbackTitle =
    locale === 'en'
      ? movie.titleEn || movie.titleMn || movie.id
      : movie.titleMn || movie.titleEn || movie.id;
  const movieTitle = getLocalizedMovieText(movie.title, locale, fallbackTitle);

  const title =
    action === 'added'
      ? locale === 'en'
        ? 'Added to My List'
        : 'Жагсаалтад нэмэгдлээ'
      : locale === 'en'
      ? 'Removed from My List'
      : 'Жагсаалтаас хасагдлаа';

  const message =
    action === 'added'
      ? locale === 'en'
        ? `"${movieTitle}" was added to your My List.`
        : `"${movieTitle}" таны жагсаалтад нэмэгдлээ.`
      : locale === 'en'
      ? `"${movieTitle}" was removed from your My List.`
      : `"${movieTitle}" таны жагсаалтаас хасагдлаа.`;

  return {
    id: `toast-${movie.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    movieId: movie.id,
    movieTitle,
    posterUrl: movie.posterUrl || movie.backdropUrl || movie.bannerUrl,
    action,
    title,
    message,
    createdAt: Date.now()
  };
}

/**
 * Toggle a movie in 'My List', persist to storage, and return the updated list + toast notification.
 */
export function toggleMovieInMyList(
  currentIds: string[],
  movie: Movie,
  locale: Locale = 'mn',
  storage?: Storage
): {
  updatedIds: string[];
  action: 'added' | 'removed';
  toast: MyListToastNotification;
} {
  const exists = currentIds.includes(movie.id);
  const action: 'added' | 'removed' = exists ? 'removed' : 'added';
  const updatedIds = exists
    ? currentIds.filter((id) => id !== movie.id)
    : [movie.id, ...currentIds.filter((id) => id !== movie.id)];

  const s = getSafeStorage(storage);
  if (s) {
    try {
      s.setItem(MY_LIST_STORAGE_KEY, JSON.stringify(updatedIds));
    } catch {
      // Ignore storage quota errors
    }
  }

  const toast = createMyListToast(movie, action, locale);
  return {
    updatedIds,
    action,
    toast
  };
}
