import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMyListIds,
  toggleMovieInMyList,
  createMyListToast,
  DEFAULT_MY_LIST_IDS
} from './myList.js';
import { Movie } from '../data/movies.js';

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    }
  };
}

const sampleMovie: Movie = {
  id: 'golden-horde-2026',
  titleMn: 'Том хүчтэй туулай',
  titleEn: 'Big buck bunny',
  descriptionMn: 'Богино хэмжээний кино',
  year: 2026,
  duration: '10m',
  genreMn: 'Sci-Fi',
  rating: '9.0',
  quality: '4K HDR',
  isPremium: true,
  minPlan: 'basic',
  directorMn: 'Sodon AI',
  bannerUrl: '/poster.jpg',
  posterUrl: '/poster.jpg',
  trailerUrl: '',
  videoSource: '',
  tags: ['Sci-Fi']
};

describe('myList & Toast Notification Logic', () => {
  it('initializes default My List IDs when storage is empty', () => {
    const storage = createMockStorage();
    const ids = getMyListIds(storage, true);
    assert.deepEqual(ids, DEFAULT_MY_LIST_IDS);
  });

  it('adds a movie to My List and returns an added toast notification in English and Mongolian', () => {
    const storage = createMockStorage();
    const initial: string[] = [];

    const resultEn = toggleMovieInMyList(initial, sampleMovie, 'en', storage);
    assert.equal(resultEn.action, 'added');
    assert.ok(resultEn.updatedIds.includes('golden-horde-2026'));
    assert.equal(resultEn.toast.title, 'Added to My List');
    assert.ok(resultEn.toast.message.includes('Big buck bunny'));

    const persisted = getMyListIds(storage, false);
    assert.deepEqual(persisted, ['golden-horde-2026']);
  });

  it('removes an existing movie from My List and returns a removed toast notification', () => {
    const storage = createMockStorage();
    const initial = ['golden-horde-2026', 'ai-nomad-2099'];

    const resultMn = toggleMovieInMyList(initial, sampleMovie, 'mn', storage);
    assert.equal(resultMn.action, 'removed');
    assert.ok(!resultMn.updatedIds.includes('golden-horde-2026'));
    assert.equal(resultMn.toast.title, 'Жагсаалтаас хасагдлаа');
    assert.ok(resultMn.toast.message.includes('Том хүчтэй туулай'));

    const persisted = getMyListIds(storage, false);
    assert.deepEqual(persisted, ['ai-nomad-2099']);
  });

  it('createMyListToast generates distinct IDs and preserves posterUrl', () => {
    const toast1 = createMyListToast(sampleMovie, 'added', 'en');
    const toast2 = createMyListToast(sampleMovie, 'removed', 'en');
    assert.notEqual(toast1.id, toast2.id);
    assert.equal(toast1.posterUrl, '/poster.jpg');
  });
});
