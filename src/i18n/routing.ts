import { defineRouting } from 'next-intl/routing';
import { Locale, DEFAULT_LOCALE, LOCALES } from './types.js';

/**
 * next-intl routing configuration
 * Configures supported locales ('mn', 'en') with Mongolian ('mn') as default.
 * Enforces 'always' prefix for unambiguous locale routing.
 */
export const routing = defineRouting({
  locales: ['mn', 'en'],
  defaultLocale: 'mn',
  localePrefix: 'always'
});

export type AppLocale = (typeof routing.locales)[number];

/**
 * Middleware matcher pattern for internationalized routes
 */
export const I18N_MIDDLEWARE_CONFIG = {
  matcher: ['/', '/(mn|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};

/**
 * Extracts locale ('mn' or 'en') from pathname segment.
 * Returns null if pathname does not start with a supported locale.
 */
export function getLocaleFromPath(pathname: string): Locale | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    const first = segments[0].toLowerCase();
    if (first === 'mn' || first === 'en') {
      return first as Locale;
    }
  }
  return null;
}

/**
 * Strips the leading locale prefix (/mn or /en) from pathname.
 * Returns the clean path (e.g. '/mn/movies' -> '/movies').
 */
export function stripLocaleFromPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && (segments[0] === 'mn' || segments[0] === 'en')) {
    const rest = segments.slice(1).join('/');
    return rest ? `/${rest}` : '/';
  }
  return pathname || '/';
}

/**
 * Builds a localized path with the specified target locale prefix.
 * Example: buildLocalizedPath('/movies', 'mn') -> '/mn/movies'
 */
export function buildLocalizedPath(cleanPath: string, targetLocale: Locale): string {
  const stripped = stripLocaleFromPath(cleanPath);
  if (stripped === '/' || stripped === '') {
    return `/${targetLocale}`;
  }
  return `/${targetLocale}${stripped.startsWith('/') ? stripped : '/' + stripped}`;
}

/**
 * Switches the locale of the current browser URL while preserving
 * path parameters, search query strings, and hash fragments.
 */
export function switchLocaleInCurrentUrl(newLocale: Locale): string {
  const { pathname, search, hash } = window.location;
  const newPath = buildLocalizedPath(pathname, newLocale);
  return `${newPath}${search}${hash}`;
}

/**
 * Detects visitor language preference from cookies, localStorage, or browser settings.
 * Defaults to 'mn' (Mongolian).
 */
export function detectBrowserLocale(): Locale {
  try {
    const cookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('NEXT_LOCALE=') || row.startsWith('ai_movie_locale='));
    if (cookie) {
      const val = cookie.split('=')[1]?.toLowerCase();
      if (val === 'mn' || val === 'en') return val as Locale;
    }

    const saved = localStorage.getItem('ai_movie_locale');
    if (saved === 'mn' || saved === 'en') return saved as Locale;

    if (typeof navigator !== 'undefined' && navigator.language) {
      const lang = navigator.language.toLowerCase();
      if (lang.startsWith('en')) return 'en';
      if (lang.startsWith('mn')) return 'mn';
    }
  } catch (e) {
    // Ignore access errors in SSR/sandboxes
  }
  return DEFAULT_LOCALE;
}
