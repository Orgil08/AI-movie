import { MOVIES } from '../data/movies.js';

export interface WatchProgress {
  movieId: string;
  currentTime: number; // in seconds
  duration: number; // in seconds
  percentage: number; // 0 - 100
  updatedAt: number; // timestamp ms
}

export const WATCH_PROGRESS_STORAGE_KEY = 'sodon_continue_watching';
export const MAX_CONTINUE_WATCHING = 8;

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
 * Default sample continue watching entries to showcase the feature immediately on first launch.
 */
export const DEFAULT_MOCK_WATCH_PROGRESS: WatchProgress[] = [
  {
    movieId: 'ai-nomad-2099',
    currentTime: 3820, // ~1h 3m into a 2h 18m film
    duration: 8280,
    percentage: 46,
    updatedAt: Date.now() - 1000 * 60 * 30 // 30 mins ago
  },
  {
    movieId: 'deep-singularity',
    currentTime: 4850, // ~1h 20m into a 1h 54m film
    duration: 6840,
    percentage: 71,
    updatedAt: Date.now() - 1000 * 60 * 60 * 3 // 3 hours ago
  },
  {
    movieId: 'ai-genesis',
    currentTime: 810, // ~13m into a 45m documentary
    duration: 2700,
    percentage: 30,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 // 1 day ago
  }
];

/**
 * Get all continue watching records from localStorage.
 * Automatically initializes with realistic mock data if localStorage is empty,
 * unless disabled.
 */
export function getWatchProgressList(
  storage?: Storage,
  initializeIfEmpty: boolean = true
): WatchProgress[] {
  const s = getSafeStorage(storage);
  if (!s) {
    return initializeIfEmpty ? DEFAULT_MOCK_WATCH_PROGRESS : [];
  }

  try {
    const raw = s.getItem(WATCH_PROGRESS_STORAGE_KEY);
    if (!raw) {
      if (initializeIfEmpty) {
        s.setItem(WATCH_PROGRESS_STORAGE_KEY, JSON.stringify(DEFAULT_MOCK_WATCH_PROGRESS));
        return DEFAULT_MOCK_WATCH_PROGRESS;
      }
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filter valid items and sort by updatedAt desc
    const validItems: WatchProgress[] = parsed
      .filter((item): item is WatchProgress => {
        return (
          item &&
          typeof item.movieId === 'string' &&
          typeof item.currentTime === 'number' &&
          typeof item.duration === 'number' &&
          item.duration > 0
        );
      })
      .map((item) => ({
        ...item,
        percentage: Math.min(100, Math.max(0, Math.round((item.currentTime / item.duration) * 100))),
        updatedAt: item.updatedAt || Date.now()
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);

    return validItems.slice(0, MAX_CONTINUE_WATCHING);
  } catch {
    return [];
  }
}

/**
 * Retrieve progress for a single movie.
 */
export function getWatchProgressForMovie(
  movieId: string,
  storage?: Storage
): WatchProgress | null {
  const list = getWatchProgressList(storage, false);
  return list.find((item) => item.movieId === movieId) || null;
}

/**
 * Save or update progress for a movie in localStorage.
 */
export function saveWatchProgress(
  entry: { movieId: string; currentTime: number; duration: number },
  storage?: Storage
): WatchProgress[] {
  if (!entry.movieId || entry.duration <= 0) {
    return getWatchProgressList(storage, false);
  }

  const list = getWatchProgressList(storage, false);
  const currentTime = Math.max(0, Math.min(entry.currentTime, entry.duration));
  const percentage = Math.min(100, Math.max(0, Math.round((currentTime / entry.duration) * 100)));

  // If movie is essentially completed (> 96%), remove from continue watching
  if (percentage >= 96) {
    return removeWatchProgress(entry.movieId, storage);
  }

  const updatedItem: WatchProgress = {
    movieId: entry.movieId,
    currentTime,
    duration: entry.duration,
    percentage,
    updatedAt: Date.now()
  };

  const filtered = list.filter((item) => item.movieId !== entry.movieId);
  const updatedList = [updatedItem, ...filtered].slice(0, MAX_CONTINUE_WATCHING);

  const s = getSafeStorage(storage);
  if (s) {
    try {
      s.setItem(WATCH_PROGRESS_STORAGE_KEY, JSON.stringify(updatedList));
    } catch {
      // Ignore quota errors
    }
  }

  return updatedList;
}

/**
 * Remove a movie from the Continue Watching list.
 */
export function removeWatchProgress(
  movieId: string,
  storage?: Storage
): WatchProgress[] {
  const list = getWatchProgressList(storage, false);
  const updatedList = list.filter((item) => item.movieId !== movieId);

  const s = getSafeStorage(storage);
  if (s) {
    try {
      s.setItem(WATCH_PROGRESS_STORAGE_KEY, JSON.stringify(updatedList));
    } catch {
      // Ignore
    }
  }

  return updatedList;
}

/**
 * Clear all progress records.
 */
export function clearAllWatchProgress(storage?: Storage): void {
  const s = getSafeStorage(storage);
  if (s) {
    try {
      s.removeItem(WATCH_PROGRESS_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Format remaining time nicely for human display.
 */
export function formatRemainingTime(
  currentTime: number,
  duration: number,
  locale: 'mn' | 'en'
): string {
  const remainingSeconds = Math.max(0, duration - currentTime);
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);

  if (locale === 'en') {
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${Math.max(1, minutes)}m left`;
  } else {
    if (hours > 0) {
      return `${hours}ц ${minutes}м үлдсэн`;
    }
    return `${Math.max(1, minutes)} мин үлдсэн`;
  }
}

/**
 * Format seconds into HH:MM:SS or MM:SS timestamp.
 */
export function formatTimestamp(seconds: number): string {
  const totalSecs = Math.floor(Math.max(0, seconds));
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${mins}:${pad(secs)}`;
}
