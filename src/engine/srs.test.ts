import { INTERVALS, countDue, isDue, isMastered, leitner, mastery, type ItemProgress } from './srs';

const NOW = Date.UTC(2026, 9, 17, 12);
const MIN = 60_000;
const DAY = 24 * 60 * MIN;

describe('leitner scheduler', () => {
  it('uses the spec intervals', () => {
    expect(INTERVALS).toEqual({ 0: 0, 1: 10 * MIN, 2: DAY, 3: 3 * DAY, 4: 7 * DAY, 5: 16 * DAY });
  });

  it('moves a new item from box 0 to box 1 on a correct answer, due in 10 minutes', () => {
    const p = leitner.review(undefined, true, NOW);
    expect(p).toEqual({ box: 1, due: NOW + 10 * MIN, seen: true, right: 1, wrong: 0, lastAnswer: NOW });
  });

  it('keeps a wrong box-0 item in box 0, due now', () => {
    const p = leitner.review(undefined, false, NOW);
    expect(p.box).toBe(0);
    expect(p.due).toBe(NOW);
    expect(p.wrong).toBe(1);
  });

  it('drops any higher box to box 1 on a wrong answer', () => {
    const prev: ItemProgress = { box: 4, due: NOW, seen: true, right: 4, wrong: 0 };
    const p = leitner.review(prev, false, NOW);
    expect(p.box).toBe(1);
    expect(p.due).toBe(NOW + 10 * MIN);
    expect(p.right).toBe(4);
  });

  it('caps at box 5 with a 16-day interval', () => {
    const prev: ItemProgress = { box: 5, due: NOW, seen: true, right: 9, wrong: 0 };
    const p = leitner.review(prev, true, NOW);
    expect(p.box).toBe(5);
    expect(p.due).toBe(NOW + 16 * DAY);
  });

  it('counts box 3 and above as mastered', () => {
    expect(isMastered({ box: 2, due: 0, seen: true, right: 2, wrong: 0 })).toBe(false);
    expect(isMastered({ box: 3, due: 0, seen: true, right: 3, wrong: 0 })).toBe(true);
    expect(isMastered(undefined)).toBe(false);
  });

  it('computes region mastery as average box / 5', () => {
    const progress = { a: { box: 5, due: 0, seen: true, right: 5, wrong: 0 } as ItemProgress };
    expect(mastery(['a', 'b'], progress)).toBe(0.5);
    expect(mastery([], progress)).toBe(0);
  });

  it('only counts seen items whose due time has passed as due (fake timers)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const p = leitner.review(undefined, true, Date.now());
    expect(isDue(p, Date.now())).toBe(false);
    vi.advanceTimersByTime(10 * MIN);
    expect(isDue(p, Date.now())).toBe(true);
    expect(countDue(['x', 'y'], { x: p }, Date.now())).toBe(1);
    vi.useRealTimers();
  });
});
