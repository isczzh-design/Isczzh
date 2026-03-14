import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accuracy,
  addDays,
  advanceAfterCycle,
  createWordProgress,
  markModeResult,
  pickTodayQueue,
  tokenizeSentence
} from '../src/appLogic.js';

test('first cycle completion schedules day-1 review', () => {
  const p = createWordProgress('w1');
  const today = '2026-01-01';

  advanceAfterCycle(p, today);

  assert.equal(p.stage, 0);
  assert.equal(p.dueDate, addDays(today, 1));
});

test('later cycles follow 2/4/... day intervals', () => {
  const p = createWordProgress('w2');
  p.stage = 0;

  advanceAfterCycle(p, '2026-01-02');
  assert.equal(p.stage, 1);
  assert.equal(p.dueDate, '2026-01-04');
});

test('word advances only after both modes are correct', () => {
  const p = createWordProgress('w3');
  const today = '2026-01-01';

  let result = markModeResult(p, 'meaning', true, today);
  assert.equal(result.finishedCycle, false);

  result = markModeResult(p, 'cloze', true, today);
  assert.equal(result.finishedCycle, true);
  assert.equal(p.stage, 0);
});

test('queue prioritizes due reviews and keeps fresh words', () => {
  const words = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const map = {
    a: {
      ...createWordProgress('a'),
      stage: 0,
      dueDate: '2026-01-01'
    },
    b: createWordProgress('b'),
    c: {
      ...createWordProgress('c'),
      stage: 0,
      dueDate: '2026-01-03'
    }
  };

  const q = pickTodayQueue(words, map, '2026-01-02');
  assert.deepEqual(q.review.map((w) => w.id), ['a']);
  assert.deepEqual(q.fresh.map((w) => w.id), ['b']);
});

test('accuracy reflects wrong answers', () => {
  const map = {
    a: { attempts: 10, wrong: 2 },
    b: { attempts: 5, wrong: 1 }
  };

  const stats = accuracy(map);
  assert.equal(stats.attempts, 15);
  assert.equal(stats.wrong, 3);
  assert.equal(stats.accuracy, 80);
});

test('tokenizeSentence splits words and punctuation', () => {
  const parts = tokenizeSentence('Hello, world!');
  assert.deepEqual(parts, ['Hello', ', ', 'world', '!']);
});
