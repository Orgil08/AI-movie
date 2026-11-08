import test from 'node:test';
import assert from 'node:assert/strict';
import { getLocaleFromPath, stripLocaleFromPath, buildLocalizedPath } from './routing.js';
import { formatCurrency, formatDate } from './types.js';
import { getLocalizedMovieText } from '../data/movies.js';
import mnDict from '../../messages/mn.json';
import enDict from '../../messages/en.json';

test('i18n - Routing extracts locale from URL paths', () => {
  assert.equal(getLocaleFromPath('/mn'), 'mn');
  assert.equal(getLocaleFromPath('/en'), 'en');
  assert.equal(getLocaleFromPath('/mn/movies'), 'mn');
  assert.equal(getLocaleFromPath('/en/pricing'), 'en');
  assert.equal(getLocaleFromPath('/en/movie/ai-nomad-2099'), 'en');
  assert.equal(getLocaleFromPath('/api/payments'), null);
  assert.equal(getLocaleFromPath('/'), null);
});

test('i18n - Routing strips locale correctly while preserving subpaths', () => {
  assert.equal(stripLocaleFromPath('/mn/movies'), '/movies');
  assert.equal(stripLocaleFromPath('/en/pricing'), '/pricing');
  assert.equal(stripLocaleFromPath('/en/movie/ai-nomad-2099'), '/movie/ai-nomad-2099');
  assert.equal(stripLocaleFromPath('/mn'), '/');
  assert.equal(stripLocaleFromPath('/pricing'), '/pricing');
});

test('i18n - Routing builds localized paths for target locales', () => {
  assert.equal(buildLocalizedPath('/movies', 'mn'), '/mn/movies');
  assert.equal(buildLocalizedPath('/movies', 'en'), '/en/movies');
  assert.equal(buildLocalizedPath('/mn/pricing', 'en'), '/en/pricing');
  assert.equal(buildLocalizedPath('/', 'mn'), '/mn');
  assert.equal(buildLocalizedPath('/', 'en'), '/en');
});

test('i18n - Currency formatting formats whole MNT integers for Mongolian and English', () => {
  assert.equal(formatCurrency(14900, 'mn', true), '14,900 ₮ / сар');
  assert.equal(formatCurrency(14900, 'en', true), 'MNT 14,900 / month');
  assert.equal(formatCurrency(19900, 'mn', false), '19,900 ₮');
  assert.equal(formatCurrency(19900, 'en', false), 'MNT 19,900');
});

test('i18n - Date formatting formats dates correctly for mn and en', () => {
  const date = new Date(2026, 10, 8); // Nov 8, 2026
  assert.match(formatDate(date, 'mn'), /2026 оны 11 сарын 08/);
  assert.match(formatDate(date, 'en'), /Nov 8, 2026/);
});

test('i18n - Movie metadata fallback supports bilingual objects and legacy strings', () => {
  const bilingualField = {
    mn: 'Сүүлчийн дохио',
    en: 'The Last Signal'
  };

  assert.equal(getLocalizedMovieText(bilingualField, 'mn'), 'Сүүлчийн дохио');
  assert.equal(getLocalizedMovieText(bilingualField, 'en'), 'The Last Signal');

  // Fallback to alternative when one language is missing
  const onlyMn = { mn: 'Зөвхөн монгол' };
  assert.equal(getLocalizedMovieText(onlyMn, 'en'), 'Зөвхөн монгол');

  const onlyEn = { en: 'Only English' };
  assert.equal(getLocalizedMovieText(onlyEn, 'mn'), 'Only English');

  // Fallback to legacy string field
  assert.equal(getLocalizedMovieText(undefined, 'mn', 'Хуучин монгол нэр'), 'Хуучин монгол нэр');
  assert.equal(getLocalizedMovieText('Шууд текст', 'en'), 'Шууд текст');
});

test('i18n - Dictionaries contain all required translation namespaces', () => {
  const requiredNamespaces = [
    'Navigation',
    'HomePage',
    'Movies',
    'MovieDetails',
    'Player',
    'Search',
    'Auth',
    'Pricing',
    'Checkout',
    'Payment',
    'Subscription',
    'Account',
    'Admin',
    'FAQ',
    'Footer',
    'Common',
    'Errors',
    'SEO',
    'WireDocs'
  ];

  for (const ns of requiredNamespaces) {
    assert.ok(ns in mnDict, `messages/mn.json is missing namespace ${ns}`);
    assert.ok(ns in enDict, `messages/en.json is missing namespace ${ns}`);
  }
});

test('i18n - Complete key parity between Mongolian and English dictionaries', () => {
  const missingInEn: string[] = [];
  const missingInMn: string[] = [];

  function checkParity(source: any, target: any, prefix = '', missing: string[]) {
    for (const key of Object.keys(source)) {
      const currentKey = prefix ? `${prefix}.${key}` : key;
      if (!(key in target)) {
        missing.push(currentKey);
      } else if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        if (typeof target[key] !== 'object' || target[key] === null) {
          missing.push(`${currentKey} (type mismatch)`);
        } else {
          checkParity(source[key], target[key], currentKey, missing);
        }
      }
    }
  }

  checkParity(mnDict, enDict, '', missingInEn);
  checkParity(enDict, mnDict, '', missingInMn);

  assert.deepEqual(missingInEn, [], `Missing in English dictionary: ${missingInEn.join(', ')}`);
  assert.deepEqual(missingInMn, [], `Missing in Mongolian dictionary: ${missingInMn.join(', ')}`);
});

test('next-intl - routing configuration has mn and en with default mn', async () => {
  const { routing } = await import('./routing.js');
  assert.deepEqual(routing.locales, ['mn', 'en']);
  assert.equal(routing.defaultLocale, 'mn');
  assert.equal(routing.localePrefix, 'always');
});

test('next-intl - request.ts resolves messages for mn and en', async () => {
  const getRequestConfig = (await import('./request.js')).default;
  assert.equal(typeof getRequestConfig, 'function');
});
