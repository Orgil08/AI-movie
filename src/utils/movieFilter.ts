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
