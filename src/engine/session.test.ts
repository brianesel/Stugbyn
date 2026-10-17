import { seeded } from './random';
import { advance, answer, buildSession, createSession, current, summarise } from './session';
import type { ItemProgress, ProgressMap } from './srs';

const NOW = 1_000_000_000;
const seen = (due: number, box: ItemProgress['box'] = 2): ItemProgress => ({ box, due, seen: true, right: 1, wrong: 0 });

describe('buildSession', () => {
  const dueIds = Array.from({ length: 8 }, (_, i) => `due${i}`);
  const unseenIds = Array.from({ length: 8 }, (_, i) => `new${i}`);
  const laterIds = Array.from({ length: 3 }, (_, i) => `later${i}`);
  const progress: ProgressMap = {};
  dueIds.forEach((id, i) => (progress[id] = seen(NOW - (i + 1) * 1000)));
  laterIds.forEach((id, i) => (progress[id] = seen(NOW + (i + 1) * 1000)));
  const pool = [...laterIds, ...unseenIds, ...dueIds];

  it('takes up to 6 due (oldest first) and 4 unseen for a practice round of 10', () => {
    const ids = buildSession(pool, 10, 'practice', progress, NOW, seeded(1));
    expect(ids).toHaveLength(10);
    const due = ids.filter((id) => id.startsWith('due'));
    const fresh = ids.filter((id) => id.startsWith('new'));
    expect(due).toHaveLength(6);
    expect(fresh).toHaveLength(4);
    // oldest-due are due7..due2
    expect(due.sort()).toEqual(['due2', 'due3', 'due4', 'due5', 'due6', 'due7']);
  });

  it('fills with more due, then unseen, then the soonest upcoming', () => {
    const p: ProgressMap = { a: seen(NOW - 1), b: seen(NOW + 5), c: seen(NOW + 1) };
    const ids = buildSession(['a', 'b', 'c', 'n1'], 3, 'practice', p, NOW, seeded(2));
    expect(ids.sort()).toEqual(['a', 'c', 'n1']);
  });

  it('daily review only uses due items, up to the size', () => {
    const ids = buildSession(pool, 15, 'review', progress, NOW, seeded(3));
    expect(ids.sort()).toEqual([...dueIds].sort());
  });

  it('never repeats an item', () => {
    const ids = buildSession(pool, 19, 'practice', progress, NOW, seeded(4));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('session runner', () => {
  it('re-queues a wrong item once, 3–4 positions later', () => {
    let s = createSession(['a', 'b', 'c', 'd', 'e', 'f'], 'practice');
    s = answer(s, false, () => 0); // a wrong → inserted at pos 3
    expect(s.queue.map((q) => q.itemId)).toEqual(['a', 'b', 'c', 'a', 'd', 'e', 'f']);
    s = advance(s);
    s = answer(s, true, () => 0);
    s = advance(s);
    s = answer(s, true, () => 0);
    s = advance(s);
    expect(current(s)).toEqual({ itemId: 'a', retry: true });
    s = answer(s, false, () => 0); // wrong again: not re-queued a second time
    expect(s.queue.filter((q) => q.itemId === 'a')).toHaveLength(2);
  });

  it('uses position +4 when the rng says so', () => {
    const s = answer(createSession(['a', 'b', 'c', 'd', 'e', 'f'], 'practice'), false, () => 0.9);
    expect(s.queue[4]).toEqual({ itemId: 'a', retry: true });
  });

  it('appends at the end when the queue is short', () => {
    const s = answer(createSession(['a', 'b'], 'practice'), false, () => 0);
    expect(s.queue.map((q) => q.itemId)).toEqual(['a', 'b', 'a']);
  });

  it('summarises score from first attempts and XP from all correct answers', () => {
    let s = createSession(['a', 'b'], 'practice');
    s = advance(answer(s, false, () => 0)); // a wrong
    s = advance(answer(s, true, () => 0)); // b right
    s = advance(answer(s, true, () => 0)); // a retry right
    expect(s.finished).toBe(true);
    expect(summarise(s)).toMatchObject({ score: 1, total: 2, xp: 20, missed: ['a'], won: true });
  });

  it('ends a boss battle when lives run out', () => {
    let s = createSession(['a', 'b', 'c', 'd', 'e'], 'boss');
    expect(s.lives).toBe(3);
    for (let i = 0; i < 3; i++) s = advance(answer(s, false, () => 0));
    expect(s.finished).toBe(true);
    expect(summarise(s).won).toBe(false);
  });
});
