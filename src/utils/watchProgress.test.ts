import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getWatchProgressList,
  getWatchProgressForMovie,
  saveWatchProgress,
  removeWatchProgress,
  clearAllWatchProgress,
  formatRemainingTime,
  formatTimestamp,
  WATCH_PROGRESS_STORAGE_KEY,
  DEFAULT_MOCK_WATCH_PROGRESS
} from './watchProgress.js';

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

test('watchProgress - initializes default mock list when storage is empty and initializeIfEmpty is true', () => {
  const storage = new MockStorage();
  const list = getWatchProgressList(storage, true);
  assert.equal(list.length, DEFAULT_MOCK_WATCH_PROGRESS.length);
  assert.equal(list[0].movieId, 'ai-nomad-2099');
  assert.ok(storage.getItem(WATCH_PROGRESS_STORAGE_KEY));
});

test('watchProgress - returns empty array when initializeIfEmpty is false and storage is empty', () => {
  const storage = new MockStorage();
  const list = getWatchProgressList(storage, false);
  assert.deepEqual(list, []);
});

test('watchProgress - saves watch progress, computes percentage, and puts movie at top', () => {
  const storage = new MockStorage();
  // Start with empty
  storage.setItem(WATCH_PROGRESS_STORAGE_KEY, JSON.stringify([]));

  const updated = saveWatchProgress(
    {
      movieId: 'quantum-shaman',
      currentTime: 4260, // half of 8520s
      duration: 8520
    },
    storage
  );

  assert.equal(updated.length, 1);
  assert.equal(updated[0].movieId, 'quantum-shaman');
  assert.equal(updated[0].percentage, 50);
  assert.equal(updated[0].currentTime, 4260);

  // Retrieve single movie progress
  const single = getWatchProgressForMovie('quantum-shaman', storage);
  assert.ok(single);
  assert.equal(single.percentage, 50);
});

test('watchProgress - updating progress bumps movie to the top without duplicates', () => {
  const storage = new MockStorage();
  saveWatchProgress({ movieId: 'm1', currentTime: 100, duration: 1000 }, storage);
  saveWatchProgress({ movieId: 'm2', currentTime: 200, duration: 1000 }, storage);

  let list = getWatchProgressList(storage, false);
  assert.equal(list[0].movieId, 'm2');
  assert.equal(list[1].movieId, 'm1');

  // Update m1
  list = saveWatchProgress({ movieId: 'm1', currentTime: 500, duration: 1000 }, storage);
  assert.equal(list[0].movieId, 'm1');
  assert.equal(list[0].percentage, 50);
  assert.equal(list.length, 2);
});

test('watchProgress - removes movie if completion percentage >= 96%', () => {
  const storage = new MockStorage();
  saveWatchProgress({ movieId: 'm1', currentTime: 500, duration: 1000 }, storage);
  assert.equal(getWatchProgressList(storage, false).length, 1);

  // User watches to 98%
  const updated = saveWatchProgress({ movieId: 'm1', currentTime: 980, duration: 1000 }, storage);
  assert.equal(updated.length, 0);
  assert.equal(getWatchProgressForMovie('m1', storage), null);
});

test('watchProgress - removes specific movie manually', () => {
  const storage = new MockStorage();
  saveWatchProgress({ movieId: 'm1', currentTime: 100, duration: 1000 }, storage);
  saveWatchProgress({ movieId: 'm2', currentTime: 200, duration: 1000 }, storage);

  const afterRemove = removeWatchProgress('m1', storage);
  assert.equal(afterRemove.length, 1);
  assert.equal(afterRemove[0].movieId, 'm2');
  assert.equal(getWatchProgressForMovie('m1', storage), null);
});

test('watchProgress - clears all records from storage', () => {
  const storage = new MockStorage();
  saveWatchProgress({ movieId: 'm1', currentTime: 100, duration: 1000 }, storage);
  clearAllWatchProgress(storage);
  assert.equal(getWatchProgressList(storage, false).length, 0);
});

test('watchProgress - formats remaining time for mn and en correctly', () => {
  // 1 hour and 14 mins remaining (4440 seconds remaining)
  const duration = 7200;
  const currentTime = 7200 - 4440; // 2760
  assert.equal(formatRemainingTime(currentTime, duration, 'en'), '1h 14m left');
  assert.equal(formatRemainingTime(currentTime, duration, 'mn'), '1ц 14м үлдсэн');

  // 25 minutes remaining (1500 seconds)
  const shortRemainingCurrent = 7200 - 1500;
  assert.equal(formatRemainingTime(shortRemainingCurrent, duration, 'en'), '25m left');
  assert.equal(formatRemainingTime(shortRemainingCurrent, duration, 'mn'), '25 мин үлдсэн');
});

test('watchProgress - formats timestamp into MM:SS and HH:MM:SS', () => {
  assert.equal(formatTimestamp(75), '1:15');
  assert.equal(formatTimestamp(3665), '1:01:05');
});
