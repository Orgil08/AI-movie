import { MOVIES } from '../data/movies.js';

export interface WatchProgress {
  movieId: string;
  currentTime: number; // in seconds
  duration: number; // in seconds
  percentage: number; // 0 - 100
  updatedAt: number; // timestamp ms
}

export interface WatchHistoryItem {
  movieId: string;
  duration: number; // in seconds
  finishedAt: number; // timestamp ms when finished
}

export const WATCH_PROGRESS_STORAGE_KEY = 'sodon_continue_watching';
export const WATCH_HISTORY_STORAGE_KEY = 'sodon_watch_history';
export const MAX_CONTINUE_WATCHING = 8;
export const MAX_WATCH_HISTORY = 50;

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
 * Default sample finished watch history entries sorted by completion date descending.
 */
export const DEFAULT_MOCK_WATCH_HISTORY: WatchHistoryItem[] = [
  {
    movieId: 'quantum-shaman',
    duration: 8520,
    finishedAt: Date.now() - 1000 * 60 * 60 * 5 // 5 hours ago
  },
  {
    movieId: 'ulaanbaatar-neon',
    duration: 7500,
    finishedAt: Date.now() - 1000 * 60 * 60 * 28 // 1 day 4 hours ago
  },
  {
    movieId: 'free-pilot-ai-origins',
    duration: 2700,
    finishedAt: Date.now() - 1000 * 60 * 60 * 72 // 3 days ago
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

  // If movie is essentially completed (>= 96%), record in Watch History and remove from Continue Watching
  if (percentage >= 96) {
    recordFinishedMovie(
      {
        movieId: entry.movieId,
        duration: entry.duration
      },
      storage
    );
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
 * Get all finished movies in Watch History, sorted by finishedAt date descending.
 */
export function getWatchHistoryList(
  storage?: Storage,
  initializeIfEmpty: boolean = true
): WatchHistoryItem[] {
  const s = getSafeStorage(storage);
  if (!s) {
    return initializeIfEmpty ? [...DEFAULT_MOCK_WATCH_HISTORY].sort((a, b) => b.finishedAt - a.finishedAt) : [];
  }

  try {
    const raw = s.getItem(WATCH_HISTORY_STORAGE_KEY);
    if (!raw) {
      if (initializeIfEmpty) {
        const initial = [...DEFAULT_MOCK_WATCH_HISTORY].sort((a, b) => b.finishedAt - a.finishedAt);
        s.setItem(WATCH_HISTORY_STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const validItems: WatchHistoryItem[] = parsed
      .filter((item): item is WatchHistoryItem => {
        return (
          item &&
          typeof item.movieId === 'string' &&
          item.movieId.trim().length > 0 &&
          typeof item.finishedAt === 'number'
        );
      })
      .map((item) => ({
        movieId: item.movieId,
        duration: typeof item.duration === 'number' && item.duration > 0 ? item.duration : 7200,
        finishedAt: item.finishedAt
      }))
      .sort((a, b) => b.finishedAt - a.finishedAt);

    return validItems.slice(0, MAX_WATCH_HISTORY);
  } catch {
    return [];
  }
}

/**
 * Record a movie as finished watching, sorted by completion date (finishedAt descending).
 */
export function recordFinishedMovie(
  entry: { movieId: string; duration?: number; finishedAt?: number },
  storage?: Storage
): WatchHistoryItem[] {
  if (!entry.movieId) {
    return getWatchHistoryList(storage, false);
  }

  const list = getWatchHistoryList(storage, false);
  const newItem: WatchHistoryItem = {
    movieId: entry.movieId,
    duration: entry.duration && entry.duration > 0 ? entry.duration : 7200,
    finishedAt: entry.finishedAt ?? Date.now()
  };

  const filtered = list.filter((item) => item.movieId !== entry.movieId);
  const updatedList = [newItem, ...filtered]
    .sort((a, b) => b.finishedAt - a.finishedAt)
    .slice(0, MAX_WATCH_HISTORY);

  const s = getSafeStorage(storage);
  if (s) {
    try {
      s.setItem(WATCH_HISTORY_STORAGE_KEY, JSON.stringify(updatedList));
    } catch {
      // Ignore quota errors
    }
  }

  return updatedList;
}

/**
 * Remove a single movie from Watch History.
 */
export function removeWatchHistoryItem(
  movieId: string,
  storage?: Storage
): WatchHistoryItem[] {
  const list = getWatchHistoryList(storage, false);
  const updatedList = list.filter((item) => item.movieId !== movieId);

  const s = getSafeStorage(storage);
  if (s) {
    try {
      s.setItem(WATCH_HISTORY_STORAGE_KEY, JSON.stringify(updatedList));
    } catch {
      // Ignore
    }
  }

  return updatedList;
}

/**
 * Clear all Watch History records.
 */
export function clearWatchHistory(storage?: Storage): void {
  const s = getSafeStorage(storage);
  if (s) {
    try {
      s.setItem(WATCH_HISTORY_STORAGE_KEY, JSON.stringify([]));
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
