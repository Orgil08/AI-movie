/**
 * Utility functions for managing Recent Searches in localStorage.
 * Stores up to MAX_RECENT_SEARCHES (5) queries.
 */

export const RECENT_SEARCHES_STORAGE_KEY = 'sodon_recent_searches';
export const MAX_RECENT_SEARCHES = 5;

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
 * Retrieve the list of recent search queries (up to 5), most recent first.
 */
export function getRecentSearches(storage?: Storage): string[] {
  const s = getSafeStorage(storage);
  if (!s) return [];

  try {
    const raw = s.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const result: string[] = [];
    const seen = new Set<string>();

    for (const item of parsed) {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed && !seen.has(trimmed.toLowerCase())) {
          seen.add(trimmed.toLowerCase());
          result.push(trimmed);
          if (result.length >= MAX_RECENT_SEARCHES) break;
        }
      }
    }

    return result;
  } catch {
    return [];
  }
}

/**
 * Add a query to the top of recent searches.
 * Deduplicates case-insensitively, trims whitespace, limits to 5 items, and persists to localStorage.
 */
export function addRecentSearch(query: string, storage?: Storage): string[] {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return getRecentSearches(storage);
  }

  const current = getRecentSearches(storage);
  const normalizedLower = trimmed.toLowerCase();

  // Filter out existing occurrence if any
  const filtered = current.filter((item) => item.toLowerCase() !== normalizedLower);

  // Prepend to top
  const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);

  const s = getSafeStorage(storage);
  if (s) {
    try {
      s.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors (e.g. quota, private browsing)
    }
  }

  return updated;
}

/**
 * Remove a specific search query from history.
 */
export function removeRecentSearch(queryToRemove: string, storage?: Storage): string[] {
  const targetLower = (queryToRemove || '').trim().toLowerCase();
  if (!targetLower) return getRecentSearches(storage);

  const current = getRecentSearches(storage);
  const updated = current.filter((item) => item.toLowerCase() !== targetLower);

  const s = getSafeStorage(storage);
  if (s) {
    try {
      s.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }

  return updated;
}

/**
 * Clear all recent searches from storage.
 */
export function clearRecentSearches(storage?: Storage): string[] {
  const s = getSafeStorage(storage);
  if (s) {
    try {
      s.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
  return [];
}
