import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * A localStorage stand-in with a hard budget, so the quota paths that only fire
 * on a real, full browser profile can be exercised deterministically.
 */
class BudgetStorage {
  constructor(budget) {
    this.budget = budget;
    this.map = new Map();
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    const next = new Map(this.map);
    next.set(key, String(value));
    let used = 0;
    for (const [k, v] of next) used += k.length + v.length;
    if (used > this.budget) {
      const error = new Error('QuotaExceededError');
      error.name = 'QuotaExceededError';
      throw error;
    }
    this.map = next;
  }

  removeItem(key) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }
}

const { savePublished, loadPublished, saveProject, withoutPosters, MAX_PUBLISHED_CUTS } = await import(
  '../src/storage.js'
);

const cut = (id, posterLength = 0) => ({
  id,
  title: `cut ${id}`,
  handle: '@you',
  caption: '',
  duration: 12,
  createdAt: 1,
  poster: posterLength ? `data:image/jpeg;base64,${'x'.repeat(posterLength)}` : null,
});

test('the feed keeps the newest cuts and caps the list', () => {
  globalThis.localStorage = new BudgetStorage(1_000_000);
  const cuts = Array.from({ length: MAX_PUBLISHED_CUTS + 10 }, (_, i) => cut(`c${i}`));
  const saved = savePublished(cuts);

  assert.equal(saved.status, 'saved');
  assert.equal(saved.cuts.length, MAX_PUBLISHED_CUTS);
  assert.equal(saved.cuts[0].id, 'c0', 'newest cut stays first');
  assert.equal(loadPublished().length, MAX_PUBLISHED_CUTS);
});

test('a tight budget keeps every cut and gives up the posters', () => {
  globalThis.localStorage = new BudgetStorage(6_000);
  const cuts = [cut('a', 3_000), cut('b', 3_000)];

  const saved = savePublished(cuts);

  assert.equal(saved.status, 'without-posters');
  assert.equal(saved.cuts.length, 2, 'cuts survive');
  assert.equal(saved.cuts[0].poster, null);
  assert.equal(saved.cuts[1].poster, null);
  const stored = loadPublished();
  assert.equal(stored.length, 2);
  assert.equal(stored.some((entry) => entry.poster), false);
});

test('a full profile still saves the edit by trading poster space', () => {
  globalThis.localStorage = new BudgetStorage(12_000);
  assert.equal(savePublished([cut('a', 4_000), cut('b', 4_000)]).status, 'saved');

  const project = { id: 'p', name: 'cut', tracks: [], pad: 'y'.repeat(9_000) };
  const status = saveProject(project);

  assert.equal(status, 'trimmed');
  assert.equal(loadPublished().some((entry) => entry.poster), false);
  assert.equal(globalThis.localStorage.getItem('tgg-studio:project:v1'), JSON.stringify(project));
});

test('an impossible save reports failure instead of pretending', () => {
  globalThis.localStorage = new BudgetStorage(40);
  const status = saveProject({ id: 'p', name: 'cut', tracks: [], pad: 'y'.repeat(500) });
  assert.equal(status, 'failed');
});

test('withoutPosters keeps only the newest posters asked for', () => {
  const list = [cut('a', 10), cut('b', 10), cut('c', 10)];
  const trimmed = withoutPosters(list, 1);
  assert.notEqual(trimmed[0].poster, null);
  assert.equal(trimmed[1].poster, null);
  assert.equal(trimmed[2].poster, null);
  assert.equal(list[1].poster === null, false, 'the input list is left alone');
});
