import { Locale, DEFAULT_LOCALE } from './types.js';
import { stripLocaleFromPath, buildLocalizedPath } from './routing.js';
import { Movie, getMovieById, getLocalizedMovieText } from '../data/movies.js';
import mnMessages from '../../messages/mn.json' with { type: 'json' };
import enMessages from '../../messages/en.json' with { type: 'json' };

export interface PageMetadata {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  ogType: 'website' | 'video.movie' | 'article';
  canonicalUrl: string;
  locale: Locale;
  alternateUrls: {
    mn: string;
    en: string;
    'x-default': string;
  };
  jsonLd: Record<string, any>;
}

export interface MetadataOptions {
  movie?: Movie | null;
  orderNumber?: string;
  baseUrl?: string;
}

const MESSAGES: Record<Locale, any> = {
  mn: mnMessages,
  en: enMessages
};

/**
 * Resolves localized SEO metadata for any route or page state.
 * Works seamlessly in both server-side crawl rendering and client-side reactive updates.
 */
export function getPageMetadata(
  locale: Locale = DEFAULT_LOCALE,
  pathname: string = '/',
  options: MetadataOptions = {}
): PageMetadata {
  const activeLocale = locale === 'en' ? 'en' : 'mn';
  const dict = MESSAGES[activeLocale] || MESSAGES.mn;
  const seo = dict.SEO || {};
  const baseUrl = (options.baseUrl || '').replace(/\/$/, '');

  const cleanPath = stripLocaleFromPath(pathname.split('?')[0]);
  let routeKey = 'home';
  let movie: Movie | null = options.movie || null;

  if (cleanPath.startsWith('/movies')) {
    routeKey = 'movies';
  } else if (cleanPath.startsWith('/pricing')) {
    routeKey = 'pricing';
  } else if (cleanPath.startsWith('/checkout')) {
    routeKey = 'checkout';
  } else if (cleanPath.startsWith('/account/subscription') || cleanPath.startsWith('/subscription')) {
    routeKey = 'subscription';
  } else if (cleanPath.startsWith('/account/payments') || cleanPath.startsWith('/payments')) {
    routeKey = 'payments';
  } else if (cleanPath.startsWith('/payment/success')) {
    routeKey = 'paymentSuccess';
  } else if (cleanPath.startsWith('/payment/cancel')) {
    routeKey = 'paymentCancel';
  } else if (cleanPath.startsWith('/movie/')) {
    routeKey = 'movieDetail';
    const slug = cleanPath.replace('/movie/', '').split('/')[0];
    if (!movie && slug) {
      movie = getMovieById(slug) || null;
    }
  } else if (movie) {
    routeKey = 'movieDetail';
  }

  const routeData = seo[routeKey] || seo.home || {};
  let title = routeData.title || seo.defaultTitle || 'SODON AI MOVIE';
  let description = routeData.description || seo.defaultDescription || '';
  let keywords = routeData.keywords || '';

  // Dynamic variable replacement for movie detail
  if (routeKey === 'movieDetail' && movie) {
    const movieTitle =
      getLocalizedMovieText(movie.title, activeLocale, activeLocale === 'en' ? movie.titleEn : movie.titleMn) ||
      (activeLocale === 'en' ? movie.titleEn : movie.titleMn);
    const movieGenre =
      getLocalizedMovieText(movie.genre, activeLocale, activeLocale === 'en' ? movie.genreEn : movie.genreMn) ||
      (activeLocale === 'en' ? movie.genreEn : movie.genreMn);
    const movieSynopsis =
      getLocalizedMovieText(movie.synopsis, activeLocale, activeLocale === 'en' ? movie.descriptionEn : movie.descriptionMn) ||
      (activeLocale === 'en' ? movie.descriptionEn || movie.descriptionMn : movie.descriptionMn);

    title = title.replace(/\{title\}/g, movieTitle).replace(/\{genre\}/g, movieGenre);
    description = description
      .replace(/\{title\}/g, movieTitle)
      .replace(/\{genre\}/g, movieGenre)
      .replace(/\{synopsis\}/g, movieSynopsis);
    keywords = keywords.replace(/\{title\}/g, movieTitle).replace(/\{genre\}/g, movieGenre);
  }

  const localizedPath = buildLocalizedPath(cleanPath, activeLocale);
  const mnPath = buildLocalizedPath(cleanPath, 'mn');
  const enPath = buildLocalizedPath(cleanPath, 'en');

  const canonicalUrl = `${baseUrl}${localizedPath}`;
  const alternateUrls = {
    mn: `${baseUrl}${mnPath}`,
    en: `${baseUrl}${enPath}`,
    'x-default': `${baseUrl}${mnPath}`
  };

  // Structured Data (JSON-LD)
  let jsonLd: Record<string, any>;
  if (routeKey === 'movieDetail' && movie) {
    const movieTitle = activeLocale === 'en' ? movie.titleEn : movie.titleMn;
    const movieGenre = activeLocale === 'en' ? movie.genreEn || movie.genreMn : movie.genreMn;
    const movieDesc = activeLocale === 'en' ? movie.descriptionEn || movie.descriptionMn : movie.descriptionMn;

    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Movie',
      name: movieTitle,
      description: movieDesc,
      genre: movieGenre,
      duration: movie.duration,
      dateCreated: `${movie.year}`,
      image: movie.bannerUrl ? `${baseUrl}${movie.bannerUrl}` : undefined,
      inLanguage: activeLocale === 'mn' ? 'mn-MN' : 'en-US',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: movie.rating,
        bestRating: '10',
        worstRating: '1',
        ratingCount: 1240
      },
      offers: {
        '@type': 'Offer',
        price: movie.isPremium ? '14900' : '0',
        priceCurrency: 'MNT',
        availability: 'https://schema.org/InStock',
        seller: {
          '@type': 'Organization',
          name: 'SODON AI MOVIE'
        }
      }
    };
  } else {
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'SODON AI MOVIE',
      applicationCategory: 'EntertainmentApplication',
      operatingSystem: 'All',
      url: canonicalUrl,
      description: description,
      inLanguage: activeLocale === 'mn' ? 'mn-MN' : 'en-US',
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'MNT',
        lowPrice: '0',
        highPrice: '19900',
        offerCount: '3'
      }
    };
  }

  return {
    title,
    description,
    keywords,
    ogTitle: title,
    ogDescription: description,
    ogType: routeKey === 'movieDetail' ? 'video.movie' : 'website',
    canonicalUrl,
    locale: activeLocale,
    alternateUrls,
    jsonLd
  };
}
