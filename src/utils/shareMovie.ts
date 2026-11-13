import { Movie } from '../data/movies.js';
import { Locale } from '../i18n/types.js';
import { buildLocalizedPath } from '../i18n/routing.js';

/**
 * Builds a direct, shareable URL for a specific movie with the active locale prefix.
 * Example: https://example.com/mn/movie/golden-horde-2026
 */
export function buildMovieShareUrl(
  movie: Pick<Movie, 'id' | 'slug'>,
  locale: Locale = 'mn',
  origin?: string
): string {
  const rawIdentifier = (movie.slug || movie.id || '').trim();
  const safeIdentifier = encodeURIComponent(rawIdentifier);
  const localizedPath = buildLocalizedPath(`/movie/${safeIdentifier}`, locale);

  const resolvedOrigin =
    origin !== undefined
      ? origin.replace(/\/+$/, '')
      : typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin.replace(/\/+$/, '')
      : '';

  return `${resolvedOrigin}${localizedPath}`;
}

/**
 * Copies text to the user's clipboard using the modern Clipboard API
 * with an automatic fallback for iframe / legacy browser environments.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to textarea fallback if Clipboard API is blocked by iframe permissions
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textArea);
      return copied;
    } catch {
      return false;
    }
  }

  return false;
}
