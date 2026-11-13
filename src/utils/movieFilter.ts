import { Movie } from '../data/movies.js';

/**
 * Filter movies by title (Mongolian or English), genre, tags, or director in real-time.
 */
export function filterMovies(
  movies: Movie[],
  query: string,
  selectedGenre: string = 'all'
): Movie[] {
  let result = movies;

  // 1. Filter by specific category / genre if provided and not 'all'
  if (selectedGenre && selectedGenre !== 'all') {
    const genreLower = selectedGenre.toLowerCase();
    result = result.filter(
      (m) =>
        m.genreMn.toLowerCase().includes(genreLower) ||
        m.tags.some((t) => t.toLowerCase().includes(genreLower))
    );
  }

  // 2. Filter by search query text
  const cleanQuery = query ? query.trim().toLowerCase() : '';
  if (!cleanQuery) {
    return result;
  }

  return result.filter((movie) => {
    const titleMn = movie.titleMn.toLowerCase();
    const titleEn = movie.titleEn.toLowerCase();
    const genreMn = movie.genreMn.toLowerCase();
    const directorMn = movie.directorMn.toLowerCase();
    const tags = movie.tags.map((t) => t.toLowerCase());
    const quality = movie.quality.toLowerCase();

    return (
      titleMn.includes(cleanQuery) ||
      titleEn.includes(cleanQuery) ||
      genreMn.includes(cleanQuery) ||
      directorMn.includes(cleanQuery) ||
      tags.some((t) => t.includes(cleanQuery)) ||
      quality.includes(cleanQuery)
    );
  });
}

/**
 * Extract unique primary genres for quick category filter chips.
 */
export function extractGenres(movies: Movie[]): string[] {
  const set = new Set<string>();
  set.add('all');

  const popularPicks = ['Киберпанк', 'Уран Зөгнөлт', 'Триллер', 'Нео-Нуар', 'Хөгжимт / Анимаци', 'Детектив', 'Баримтат'];
  for (const p of popularPicks) {
    set.add(p);
  }

  return Array.from(set);
}

/**
 * Safely escape special characters in a string for use in a RegExp.
 */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Rank and return real-time movie title suggestions matching a partial user query.
 * Prioritizes prefix matches on Mongolian or English titles, followed by substring title matches,
 * and then genre/director matches.
 */
export function getMovieTitleSuggestions(
  movies: Movie[],
  query: string,
  limit: number = 6
): Movie[] {
  const cleanQuery = query ? query.trim().toLowerCase() : '';
  if (!cleanQuery || limit <= 0) {
    return [];
  }

  const scored: Array<{ movie: Movie; score: number }> = [];

  for (const movie of movies) {
    if ((movie as any).published === false) continue;

    const titleMn = (movie.titleMn || (typeof movie.title === 'object' ? movie.title?.mn : movie.title) || '').toLowerCase();
    const titleEn = (movie.titleEn || (typeof movie.title === 'object' ? movie.title?.en : '') || '').toLowerCase();
    const directorMn = (movie.directorMn || (typeof movie.director === 'object' ? movie.director?.mn : movie.director) || '').toLowerCase();
    const genreMn = (movie.genreMn || (typeof movie.genre === 'object' ? movie.genre?.mn : movie.genre) || '').toLowerCase();
    const tags = Array.isArray(movie.tags) ? movie.tags.map((t) => String(t).toLowerCase()) : [];

    let score = 0;

    if (titleMn === cleanQuery || titleEn === cleanQuery) {
      score = 100;
    } else if (titleMn.startsWith(cleanQuery) || titleEn.startsWith(cleanQuery)) {
      score = 85;
    } else if (titleMn.includes(cleanQuery) || titleEn.includes(cleanQuery)) {
      score = 70;
    } else if (directorMn.includes(cleanQuery)) {
      score = 40;
    } else if (genreMn.includes(cleanQuery) || tags.some((t) => t.includes(cleanQuery))) {
      score = 30;
    }

    if (score > 0) {
      scored.push({ movie, score });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return parseFloat(b.movie.rating || '0') - parseFloat(a.movie.rating || '0');
  });

  return scored.slice(0, limit).map((item) => item.movie);
}

/**
 * Split text into segments so matching query substrings can be highlighted in the UI.
 */
export function splitHighlightText(
  text: string,
  query: string
): Array<{ text: string; match: boolean }> {
  if (!text) return [];
  const cleanQuery = query ? query.trim() : '';
  if (!cleanQuery) {
    return [{ text, match: false }];
  }

  const escaped = escapeRegExp(cleanQuery);
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex).filter((part) => part.length > 0);

  return parts.map((part) => ({
    text: part,
    match: part.toLowerCase() === cleanQuery.toLowerCase()
  }));
}

