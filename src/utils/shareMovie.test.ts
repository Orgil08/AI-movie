import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildMovieShareUrl } from './shareMovie.js';

describe('shareMovie utility', () => {
  it('builds a localized direct movie URL using slug when available', () => {
    const urlMn = buildMovieShareUrl(
      { id: 'movie_123', slug: 'golden-horde-2026' },
      'mn',
      'http://localhost:3000'
    );
    assert.equal(urlMn, 'http://localhost:3000/mn/movie/golden-horde-2026');

    const urlEn = buildMovieShareUrl(
      { id: 'movie_123', slug: 'golden-horde-2026' },
      'en',
      'http://localhost:3000/'
    );
    assert.equal(urlEn, 'http://localhost:3000/en/movie/golden-horde-2026');
  });

  it('falls back to movie id when slug is undefined or empty', () => {
    const url = buildMovieShareUrl(
      { id: 'ai-nomad-2099' },
      'mn',
      'https://sodon.mn'
    );
    assert.equal(url, 'https://sodon.mn/mn/movie/ai-nomad-2099');
  });

  it('URL-encodes special characters in movie identifiers', () => {
    const url = buildMovieShareUrl(
      { id: 'movie with spaces' },
      'en',
      'http://localhost:3000'
    );
    assert.equal(url, 'http://localhost:3000/en/movie/movie%20with%20spaces');
  });
});
