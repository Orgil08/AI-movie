import { useEffect, useMemo } from 'react';
import { useLocale } from './I18nContext.js';
import { getPageMetadata, PageMetadata } from './seo.js';
import { Movie } from '../data/movies.js';
import { Locale } from './types.js';

export interface UseLocalizedMetadataOptions {
  currentTab?: string;
  selectedMovie?: Movie | null;
  orderNumber?: string;
  pathname?: string;
  title?: string;
  description?: string;
  keywords?: string;
  locale?: Locale;
  baseUrl?: string;
}

/**
 * Maps the current application state or navigation tab to a standardized URL pathname
 */
export function resolveMetadataPath(
  currentTab?: string,
  selectedMovie?: Movie | null,
  orderNumber?: string,
  explicitPathname?: string
): string {
  if (explicitPathname) {
    return explicitPathname;
  }
  if (selectedMovie) {
    return `/movie/${selectedMovie.id}`;
  }
  if (currentTab === 'movies') {
    return '/movies';
  }
  if (currentTab === 'pricing') {
    return '/pricing';
  }
  if (currentTab === 'checkout') {
    return orderNumber ? `/checkout/${orderNumber}` : '/checkout';
  }
  if (currentTab === 'subscription') {
    return '/account/subscription';
  }
  if (currentTab === 'payments') {
    return '/account/payments';
  }
  if (currentTab === 'account') {
    return '/account';
  }
  if (currentTab === 'login') {
    return '/login';
  }
  if (currentTab === 'register') {
    return '/register';
  }
  if (currentTab === 'admin') {
    return '/admin';
  }
  if (currentTab === 'payment-success') {
    return '/payment/success';
  }
  if (currentTab === 'payment-cancel') {
    return '/payment/cancel';
  }
  if (currentTab === 'home') {
    return '/';
  }
  if (typeof window !== 'undefined') {
    return window.location.pathname;
  }
  return '/';
}

/**
 * Updates DOM document head elements: title, meta description, keywords, OpenGraph, Twitter, canonical, JSON-LD
 */
export function applyHeadMetadata(metadata: PageMetadata): void {
  if (typeof document === 'undefined') return;

  // 1. Document Title
  document.title = metadata.title;

  // 2. Helper to set or create meta tags
  const setMetaTag = (selector: string, attrName: string, attrValue: string, content: string) => {
    let tag = document.querySelector(selector);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(attrName, attrValue);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  // 3. Helper to set or create link tags
  const setLinkTag = (rel: string, href: string, hreflang?: string) => {
    const selector = hreflang
      ? `link[rel="${rel}"][hreflang="${hreflang}"]`
      : `link[rel="${rel}"]`;
    let tag = document.querySelector(selector) as HTMLLinkElement | null;
    if (!tag) {
      tag = document.createElement('link');
      tag.rel = rel;
      if (hreflang) tag.hreflang = hreflang;
      document.head.appendChild(tag);
    }
    tag.href = href;
  };

  // Primary Meta Tags
  setMetaTag('meta[name="description"]', 'name', 'description', metadata.description);
  if (metadata.keywords) {
    setMetaTag('meta[name="keywords"]', 'name', 'keywords', metadata.keywords);
  }

  // OpenGraph Tags
  setMetaTag('meta[property="og:title"]', 'property', 'og:title', metadata.ogTitle);
  setMetaTag('meta[property="og:description"]', 'property', 'og:description', metadata.ogDescription);
  setMetaTag('meta[property="og:type"]', 'property', 'og:type', metadata.ogType);
  setMetaTag('meta[property="og:url"]', 'property', 'og:url', metadata.canonicalUrl);
  setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', 'SODON AI MOVIE');

  // Twitter Cards
  setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', metadata.ogTitle);
  setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', metadata.ogDescription);

  // Canonical & Multilingual Alternate Links
  setLinkTag('canonical', metadata.canonicalUrl);
  setLinkTag('alternate', metadata.alternateUrls.mn, 'mn');
  setLinkTag('alternate', metadata.alternateUrls.en, 'en');
  setLinkTag('alternate', metadata.alternateUrls['x-default'], 'x-default');

  // Schema.org Structured Data (JSON-LD)
  let jsonLdScript = document.getElementById('seo-json-ld') as HTMLScriptElement | null;
  if (!jsonLdScript) {
    jsonLdScript = document.createElement('script');
    jsonLdScript.id = 'seo-json-ld';
    jsonLdScript.type = 'application/ld+json';
    document.head.appendChild(jsonLdScript);
  }
  jsonLdScript.textContent = JSON.stringify(metadata.jsonLd);
}

/**
 * Custom React Hook: useLocalizedMetadata
 * Automatically updates document.title, meta description, and OpenGraph metadata
 * based on current active locale and content options provided to SEOHead.
 */
export function useLocalizedMetadata(options: UseLocalizedMetadataOptions = {}): PageMetadata {
  let contextLocale: Locale | undefined;
  try {
    const context = useLocale();
    contextLocale = context?.locale;
  } catch {
    // Graceful fallback when outside I18nProvider
    contextLocale = undefined;
  }

  const activeLocale: Locale = options.locale || contextLocale || 'mn';

  const metadata = useMemo(() => {
    const pathname = resolveMetadataPath(
      options.currentTab,
      options.selectedMovie,
      options.orderNumber,
      options.pathname
    );
    const baseUrl = options.baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    const meta = getPageMetadata(activeLocale, pathname, {
      movie: options.selectedMovie,
      orderNumber: options.orderNumber,
      baseUrl
    });

    // Custom overrides if explicitly provided
    if (options.title) {
      meta.title = options.title;
      meta.ogTitle = options.title;
    }
    if (options.description) {
      meta.description = options.description;
      meta.ogDescription = options.description;
    }
    if (options.keywords) {
      meta.keywords = options.keywords;
    }

    return meta;
  }, [
    activeLocale,
    options.currentTab,
    options.selectedMovie,
    options.orderNumber,
    options.pathname,
    options.title,
    options.description,
    options.keywords,
    options.baseUrl
  ]);

  useEffect(() => {
    applyHeadMetadata(metadata);
  }, [metadata]);

  return metadata;
}

export default useLocalizedMetadata;
