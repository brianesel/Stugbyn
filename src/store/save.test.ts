import { migrateItemIds } from '../content/migrations';
import {
  applyAnswer,
  applySessionComplete,
  currentStreak,
  dayKey,
  defaultSave,
  mergeSaves,
  normaliseSave,
  type SaveData,
} from './save';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

describe('streak', () => {
  const play = (save: SaveData, t: number) => applySessionComplete(save, t);

  it('counts consecutive days and ignores a second session on the same day', () => {
    let s = defaultSave(1, at(2026, 10, 12));
    s = play(s, at(2026, 10, 12));
    s = play(s, at(2026, 10, 12, 18));
    s = play(s, at(2026, 10, 13));
    expect(s.streak.count).toBe(2);
    expect(currentStreak(s, at(2026, 10, 14))).toBe(2);
  });

  it('allows one free lagom day per week', () => {
    let s = defaultSave(1, at(2026, 10, 12));
    s = play(s, at(2026, 10, 12)); // Mon
    s = play(s, at(2026, 10, 14)); // Wed, Tue missed → lagom day
    expect(s.streak.count).toBe(2);
    s = play(s, at(2026, 10, 16)); // Fri, Thu missed → lagom already used this week
    expect(s.streak.count).toBe(1);
  });

  it('resets after two missed days', () => {
    let s = play(defaultSave(1, 0), at(2026, 10, 12));
    s = play(s, at(2026, 10, 15));
    expect(s.streak.count).toBe(1);
    expect(currentStreak(s, at(2026, 10, 20))).toBe(0);
  });
});

describe('answers and XP', () => {
  it('updates SRS and XP, and resets daily XP on a new day', () => {
    let s = defaultSave(1, at(2026, 10, 12));
    s = applyAnswer(s, 'x', true, 10, at(2026, 10, 12), true);
    expect(s.items.x.box).toBe(1);
    expect(s.daily).toEqual({ date: dayKey(at(2026, 10, 12)), xp: 10 });
    s = applyAnswer(s, 'x', true, 10, at(2026, 10, 13), false);
    expect(s.items.x.box).toBe(1); // retry: no SRS change
    expect(s.xp).toBe(20);
    expect(s.daily.xp).toBe(10);
  });
});

describe('loading old saves', () => {
  it('keeps unknown ids and fills missing fields', () => {
    const s = normaliseSave({ items: { 'gone:item': { box: 2, due: 5, seen: true, right: 2, wrong: 0 } } }, 3, 0);
    expect(s.items['gone:item'].box).toBe(2);
    expect(s.settings.dailyGoal).toBe(50);
    expect(s.contentVersion).toBe(3);
  });

  it('ignores garbage', () => {
    expect(normaliseSave('nope', 1, 0).items).toEqual({});
    expect(normaliseSave({ items: { a: 'x' } }, 1, 0).items).toEqual({});
  });

  it('migrates renamed ids with progress intact', () => {
    const items = { 'nouns:plural:bil': { box: 4 }, other: { box: 1 } };
    const out = migrateItemIds(items, { 'nouns:plural:bil': 'nouns:pl:bil' });
    expect(out).toEqual({ 'nouns:pl:bil': { box: 4 }, other: { box: 1 } });
  });

  it('follows rename chains and never overwrites newer progress', () => {
    expect(migrateItemIds({ a: 1 }, { a: 'b', b: 'c' })).toEqual({ c: 1 });
    expect(migrateItemIds({ a: 1, b: 2 }, { a: 'b' })).toEqual({ b: 2 });
  });
});

describe('import merge', () => {
  it('keeps the record with the later lastAnswer per item', () => {
    const a = defaultSave(1, 100);
    a.items = { x: { box: 1, due: 0, seen: true, right: 1, wrong: 0, lastAnswer: 50 }, y: { box: 3, due: 0, seen: true, right: 3, wrong: 0, lastAnswer: 90 } };
    const b = defaultSave(1, 50);
    b.items = { x: { box: 4, due: 0, seen: true, right: 4, wrong: 0, lastAnswer: 80 }, y: { box: 1, due: 0, seen: true, right: 1, wrong: 1, lastAnswer: 10 }, z: { box: 2, due: 0, seen: true, right: 2, wrong: 0, lastAnswer: 1 } };
    const m = mergeSaves(a, b);
    expect(m.items.x.box).toBe(4);
    expect(m.items.y.box).toBe(3);
    expect(m.items.z.box).toBe(2);
  });
});

describe('boss wins', () => {
  it('adds 50 XP and keeps the first win time', async () => {
    const { applyBossWin } = await import('./save');
    let s = defaultSave(1, 0);
    s = applyBossWin(s, 'substantiv', 1000);
    expect(s.xp).toBe(50);
    expect(s.bosses).toEqual({ substantiv: 1000 });
    s = applyBossWin(s, 'substantiv', 2000);
    expect(s.bosses.substantiv).toBe(1000);
    expect(s.xp).toBe(100);
  });
});
