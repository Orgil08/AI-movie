import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAdultRestrictedMovie,
  filterMoviesForAgeGate,
  isValidPosterUrl,
  resolveSafePosterUrl,
  filterOriginalsMovies,
  filterHotPlusMovies,
  FALLBACK_POSTER_ASSETS
} from './ageGateAndPosters.js';

test('isAdultRestrictedMovie correctly identifies 18+ movies while keeping 13+/16+ unrestricted', () => {
  assert.equal(isAdultRestrictedMovie(null), false);
  assert.equal(isAdultRestrictedMovie({ id: 'm1', ageRating: '13+' }), false);
  assert.equal(isAdultRestrictedMovie({ id: 'm2', ageRating: '16+' }), false);
  assert.equal(isAdultRestrictedMovie({ id: 'm3', ageRating: '18+' }), true);
  assert.equal(isAdultRestrictedMovie({ id: 'm4', isAdult: true, ageRating: '16+' }), true);
  assert.equal(isAdultRestrictedMovie({ id: 'm5', tags: ['Драм', '18+'] }), true);
});

test('filterMoviesForAgeGate hides 18+ movies from unverified guests and shows them when verified or admin', () => {
  const sample = [
    { id: 'normal-1', ageRating: '13+' },
    { id: 'series-16', ageRating: '16+' },
    { id: 'adult-18', ageRating: '18+' }
  ];

  const unverified = filterMoviesForAgeGate(sample, false, 'user');
  assert.deepEqual(
    unverified.map((m) => m.id),
    ['normal-1', 'series-16']
  );

  const verified = filterMoviesForAgeGate(sample, true, 'user');
  assert.deepEqual(
    verified.map((m) => m.id),
    ['normal-1', 'series-16', 'adult-18']
  );

  const asAdmin = filterMoviesForAgeGate(sample, false, 'admin');
  assert.deepEqual(
    asAdmin.map((m) => m.id),
    ['normal-1', 'series-16', 'adult-18']
  );
});

test('isValidPosterUrl and resolveSafePosterUrl replace missing or invalid URLs with local artwork', () => {
  assert.equal(isValidPosterUrl(''), false);
  assert.equal(isValidPosterUrl(undefined), false);
  assert.equal(isValidPosterUrl('null'), false);
  assert.equal(isValidPosterUrl('broken-relative-string'), false);
  assert.equal(
    isValidPosterUrl('/src/assets/images/poster_quantum_shaman_1794122760152.jpg'),
    true
  );
  assert.equal(isValidPosterUrl('https://images.unsplash.com/photo-12345?w=800'), true);

  const fallback = resolveSafePosterUrl('', 'future-loan-movie');
  assert.ok(FALLBACK_POSTER_ASSETS.includes(fallback as any));

  const valid = '/src/assets/images/hero_nomad_2099_1794122759432.jpg';
  assert.equal(resolveSafePosterUrl(valid, 'any'), valid);
});

test('filterOriginalsMovies and filterHotPlusMovies filter by type, genre, and adult priority', () => {
  const catalog = [
    {
      id: 'orig-series',
      titleMn: 'Уй гашуу дарагдсан гэрээ',
      type: 'series',
      isOriginal: true,
      ageRating: '16+',
      genreMn: 'Драм'
    },
    {
      id: 'orig-movie',
      titleMn: 'Нүүдэлчин 2099',
      type: 'movie',
      featured: true,
      ageRating: '13+',
      genreMn: 'AI Sci-Fi'
    },
    {
      id: 'hot-adult',
      titleMn: 'Улаан Хамба: Шөнийн Нууц',
      type: 'movie',
      ageRating: '18+',
      trending: true,
      genreMn: 'Мистик • Триллер'
    }
  ];

  const allOriginals = filterOriginalsMovies(catalog, 'all');
  assert.deepEqual(
    allOriginals.map((m) => m.id),
    ['orig-series', 'orig-movie']
  );

  const seriesOriginals = filterOriginalsMovies(catalog, 'series');
  assert.deepEqual(
    seriesOriginals.map((m) => m.id),
    ['orig-series']
  );

  const hotAll = filterHotPlusMovies(catalog, { contentType: 'all' });
  assert.equal(hotAll[0]?.id, 'hot-adult');
});
