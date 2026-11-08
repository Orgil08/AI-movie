import test from 'node:test';
import assert from 'node:assert/strict';
import { getPageMetadata } from './seo.js';
import { MOVIES } from '../data/movies.js';

test('SEO - Returns localized homepage metadata for Mongolian and English', () => {
  const mnMeta = getPageMetadata('mn', '/', { baseUrl: 'https://aimovie.mn' });
  assert.match(mnMeta.title, /SODON AI MOVIE/);
  assert.match(mnMeta.description, /Монголын анхны/);
  assert.equal(mnMeta.canonicalUrl, 'https://aimovie.mn/mn');
  assert.equal(mnMeta.alternateUrls.mn, 'https://aimovie.mn/mn');
  assert.equal(mnMeta.alternateUrls.en, 'https://aimovie.mn/en');
  assert.equal(mnMeta.jsonLd['@type'], 'WebApplication');

  const enMeta = getPageMetadata('en', '/', { baseUrl: 'https://aimovie.mn' });
  assert.match(enMeta.title, /Next-Gen/);
  assert.match(enMeta.description, /generative AI movies/);
  assert.equal(enMeta.canonicalUrl, 'https://aimovie.mn/en');
  assert.equal(enMeta.alternateUrls.mn, 'https://aimovie.mn/mn');
  assert.equal(enMeta.alternateUrls.en, 'https://aimovie.mn/en');
});

test('SEO - Returns localized metadata for Movies catalogue and Pricing pages', () => {
  // Movies page
  const mnMovies = getPageMetadata('mn', '/movies');
  assert.match(mnMovies.title, /Бүх Киноны Сан/);
  assert.match(mnMovies.description, /генератив AI-аар бүтээгдсэн/);

  const enMovies = getPageMetadata('en', '/en/movies');
  assert.match(enMovies.title, /Movie Catalogue/);
  assert.match(enMovies.description, /complete library/);

  // Pricing page
  const mnPricing = getPageMetadata('mn', '/pricing');
  assert.match(mnPricing.title, /Үнийн Багц/);
  assert.match(mnPricing.description, /14,900₮/);

  const enPricing = getPageMetadata('en', '/en/pricing');
  assert.match(enPricing.title, /Pricing & Plans/);
  assert.match(enPricing.description, /MNT 14,900/);
});

test('SEO - Interpolates movie variables for movie detail pages and generates Schema.org Movie', () => {
  const nomadMovie = MOVIES.find((m) => m.id === 'ai-nomad-2099')!;
  assert.ok(nomadMovie);

  // Mongolian Movie Detail
  const mnMovieMeta = getPageMetadata('mn', `/movie/${nomadMovie.id}`, { movie: nomadMovie });
  assert.match(mnMovieMeta.title, /Нүүдэлчин 2099/);
  assert.match(mnMovieMeta.title, /SODON AI MOVIE/);
  assert.doesNotMatch(mnMovieMeta.title, /\{title\}/);
  assert.equal(mnMovieMeta.ogType, 'video.movie');
  assert.equal(mnMovieMeta.jsonLd['@type'], 'Movie');
  assert.equal(mnMovieMeta.jsonLd.name, nomadMovie.titleMn);

  // English Movie Detail
  const enMovieMeta = getPageMetadata('en', `/en/movie/${nomadMovie.id}`, { movie: nomadMovie });
  assert.match(enMovieMeta.title, /Nomad 2099/);
  assert.match(enMovieMeta.title, /SODON AI MOVIE/);
  assert.doesNotMatch(enMovieMeta.title, /\{title\}/);
  assert.equal(enMovieMeta.jsonLd['@type'], 'Movie');
  assert.equal(enMovieMeta.jsonLd.name, nomadMovie.titleEn);
});

test('SEO - Generates unique metadata for Account, Subscription, Checkout and Payment History', () => {
  const checkoutMeta = getPageMetadata('mn', '/checkout/AIMOV-1234');
  assert.match(checkoutMeta.title, /Төлбөр Төлөх/);

  const subMeta = getPageMetadata('mn', '/account/subscription');
  assert.match(subMeta.title, /Миний Гишүүнчлэл/);

  const payMeta = getPageMetadata('en', '/account/payments');
  assert.match(payMeta.title, /Payment History/);
});
