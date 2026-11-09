import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  RECENT_SEARCHES_STORAGE_KEY,
  MAX_RECENT_SEARCHES
} from './recentSearches.js';

class MockStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

test('recentSearches - returns empty array when storage is empty', () => {
  const storage = new MockStorage();
  const searches = getRecentSearches(storage);
  assert.deepEqual(searches, []);
});

test('recentSearches - adds new search query and persists in storage', () => {
  const storage = new MockStorage();
  const result = addRecentSearch('Cyberpunk 2099', storage);
  assert.deepEqual(result, ['Cyberpunk 2099']);
  assert.deepEqual(getRecentSearches(storage), ['Cyberpunk 2099']);
});

test('recentSearches - ignores empty or whitespace-only queries', () => {
  const storage = new MockStorage();
  addRecentSearch('Nomad', storage);
  const result = addRecentSearch('   ', storage);
  assert.deepEqual(result, ['Nomad']);
  assert.deepEqual(addRecentSearch('', storage), ['Nomad']);
});

test('recentSearches - maintains at most 5 recent queries (FIFO / last 5)', () => {
  const storage = new MockStorage();
  addRecentSearch('Search 1', storage);
  addRecentSearch('Search 2', storage);
  addRecentSearch('Search 3', storage);
  addRecentSearch('Search 4', storage);
  addRecentSearch('Search 5', storage);

  let current = getRecentSearches(storage);
  assert.equal(current.length, 5);
  assert.deepEqual(current, ['Search 5', 'Search 4', 'Search 3', 'Search 2', 'Search 1']);

  // Adding 6th search drops the oldest ('Search 1')
  const after6th = addRecentSearch('Search 6', storage);
  assert.equal(after6th.length, MAX_RECENT_SEARCHES);
  assert.deepEqual(after6th, ['Search 6', 'Search 5', 'Search 4', 'Search 3', 'Search 2']);
  assert.ok(!after6th.includes('Search 1'));
});

test('recentSearches - deduplicates and bumps existing query to the top', () => {
  const storage = new MockStorage();
  addRecentSearch('Avatar', storage);
  addRecentSearch('Matrix', storage);
  addRecentSearch('Interstellar', storage);

  assert.deepEqual(getRecentSearches(storage), ['Interstellar', 'Matrix', 'Avatar']);

  // Re-searching 'Avatar' moves it to index 0 without duplicating
  const updated = addRecentSearch('avatar', storage);
  assert.deepEqual(updated, ['avatar', 'Interstellar', 'Matrix']);
  assert.equal(updated.length, 3);
});

test('recentSearches - removes a single query correctly', () => {
  const storage = new MockStorage();
  addRecentSearch('Action', storage);
  addRecentSearch('Sci-Fi', storage);
  addRecentSearch('Drama', storage);

  const afterRemove = removeRecentSearch('Sci-Fi', storage);
  assert.deepEqual(afterRemove, ['Drama', 'Action']);
  assert.deepEqual(getRecentSearches(storage), ['Drama', 'Action']);
});

test('recentSearches - clears all queries from storage', () => {
  const storage = new MockStorage();
  addRecentSearch('Q1', storage);
  addRecentSearch('Q2', storage);
  assert.equal(getRecentSearches(storage).length, 2);

  const cleared = clearRecentSearches(storage);
  assert.deepEqual(cleared, []);
  assert.deepEqual(getRecentSearches(storage), []);
  assert.equal(storage.getItem(RECENT_SEARCHES_STORAGE_KEY), null);
});

test('recentSearches - handles corrupt JSON gracefully', () => {
  const storage = new MockStorage();
  storage.setItem(RECENT_SEARCHES_STORAGE_KEY, '{invalid json]');
  assert.deepEqual(getRecentSearches(storage), []);
});
