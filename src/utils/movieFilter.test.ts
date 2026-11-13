import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  filterMovies,
  extractGenres,
  getMovieTitleSuggestions,
  splitHighlightText
} from './movieFilter.js';
import { Movie } from '../data/movies.js';

const mockMovies: Movie[] = [
  {
    id: 'm1',
    titleMn: 'Нүүдэлчин 2099: Алтан Орд',
    titleEn: 'Nomad 2099: The Golden Horde',
    year: 2026,
    duration: '2ц 18мин',
    genreMn: 'Киберпанк / AI Уран Зөгнөлт',
    rating: '9.4',
    quality: '4K HDR',
    isPremium: true,
    minPlan: 'basic',
    descriptionMn: 'Кибер Улаанбаатар хот',
    directorMn: 'Б. Тэмүүлэн',
    bannerUrl: '',
    posterUrl: '',
    trailerUrl: '',
    videoSource: '',
    tags: ['Шинэ нээлт', '4K HDR']
  },
  {
    id: 'm2',
    titleMn: 'Гүн Сингулярит: Сүүлчийн Тархи',
    titleEn: 'Deep Singularity: The Last Mind',
    year: 2026,
    duration: '1ц 54мин',
    genreMn: 'Сэтгэл зүйн триллер / AI Sci-Fi',
    rating: '9.1',
    quality: '4K HDR',
    isPremium: true,
    minPlan: 'standard',
    descriptionMn: 'Квант AI систем',
    directorMn: 'А. Сарнай',
    bannerUrl: '',
    posterUrl: '',
    trailerUrl: '',
    videoSource: '',
    tags: ['Dolby Atmos']
  },
  {
    id: 'm3',
    titleMn: 'Неон Манан: Сүүдэрт Хот',
    titleEn: 'Neon Mist: Shadow City',
    year: 2025,
    duration: '2ц 05мин',
    genreMn: 'Нео-Нуар / Адал явдалт',
    rating: '8.9',
    quality: '1080p Full HD',
    isPremium: true,
    minPlan: 'basic',
    descriptionMn: 'Квант чип мөрдөх цагдаа',
    directorMn: 'Ч. Бат-Эрдэнэ',
    bannerUrl: '',
    posterUrl: '',
    trailerUrl: '',
    videoSource: '',
    tags: ['Хит']
  }
];

describe('MovieFilter - Real-time Search and Filtering', () => {
  it('returns all movies when query is empty and genre is all', () => {
    const res = filterMovies(mockMovies, '', 'all');
    assert.strictEqual(res.length, 3);
  });

  it('filters movies by Mongolian title', () => {
    const res = filterMovies(mockMovies, 'Нүүдэлчин');
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].id, 'm1');
  });

  it('filters movies by English title (case-insensitive)', () => {
    const res = filterMovies(mockMovies, 'deep singularity');
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].id, 'm2');
  });

  it('filters movies by genre (e.g. Триллер)', () => {
    const res = filterMovies(mockMovies, 'Триллер');
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].id, 'm2');
  });

  it('filters movies by category dropdown or genre chip', () => {
    const res = filterMovies(mockMovies, '', 'Нео-Нуар');
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].id, 'm3');
  });

  it('combines genre filter and search query correctly', () => {
    const res = filterMovies(mockMovies, '2099', 'Киберпанк');
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].id, 'm1');

    const noMatch = filterMovies(mockMovies, 'Сингулярит', 'Нео-Нуар');
    assert.strictEqual(noMatch.length, 0);
  });

  it('returns empty array when search query matches nothing', () => {
    const res = filterMovies(mockMovies, 'Үл орших кино 999');
    assert.strictEqual(res.length, 0);
  });

  it('extractGenres returns list containing all and popular categories', () => {
    const genres = extractGenres(mockMovies);
    assert.ok(genres.includes('all'));
    assert.ok(genres.includes('Киберпанк'));
  });

  it('getMovieTitleSuggestions returns ranked movie title matches and respects limit', () => {
    const emptyRes = getMovieTitleSuggestions(mockMovies, '   ');
    assert.strictEqual(emptyRes.length, 0);

    const nomadSuggestions = getMovieTitleSuggestions(mockMovies, 'Nomad');
    assert.strictEqual(nomadSuggestions.length, 1);
    assert.strictEqual(nomadSuggestions[0].id, 'm1');

    const mnSuggestions = getMovieTitleSuggestions(mockMovies, 'Сингулярит');
    assert.strictEqual(mnSuggestions.length, 1);
    assert.strictEqual(mnSuggestions[0].id, 'm2');

    const limitedSuggestions = getMovieTitleSuggestions(mockMovies, '20', 1);
    assert.strictEqual(limitedSuggestions.length, 1);
  });

  it('splitHighlightText splits matching query segments case-insensitively and handles regex special chars', () => {
    const segments = splitHighlightText('Nomad 2099: The Golden Horde', '2099');
    assert.strictEqual(segments.length, 3);
    assert.deepStrictEqual(segments[0], { text: 'Nomad ', match: false });
    assert.deepStrictEqual(segments[1], { text: '2099', match: true });
    assert.deepStrictEqual(segments[2], { text: ': The Golden Horde', match: false });

    const specialSegments = splitHighlightText('Nomad (2099) [4K+]', '(2099)');
    assert.ok(specialSegments.some((s) => s.match && s.text === '(2099)'));
  });
});

