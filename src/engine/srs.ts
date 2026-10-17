/** Spaced repetition: a six-box Leitner system behind a Scheduler interface (swappable for FSRS later). */

export type Box = 0 | 1 | 2 | 3 | 4 | 5;

export type ItemProgress = {
  box: Box;
  /** Epoch ms when the item is next due. */
  due: number;
  seen: boolean;
  right: number;
  wrong: number;
  lastAnswer?: number;
};

export type ProgressMap = Record<string, ItemProgress | undefined>;

export interface Scheduler {
  review(prev: ItemProgress | undefined, correct: boolean, now: number): ItemProgress;
}

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

/** Box 0 = now, 1 = 10 min, 2 = 1 day, 3 = 3 days, 4 = 7 days, 5 = 16 days. */
export const INTERVALS: Record<Box, number> = { 0: 0, 1: 10 * MIN, 2: DAY, 3: 3 * DAY, 4: 7 * DAY, 5: 16 * DAY };

export const MASTERED_BOX = 3;

export const leitner: Scheduler = {
  review(prev, correct, now) {
    const box = prev?.box ?? 0;
    const next: Box = correct ? (Math.min(box + 1, 5) as Box) : box === 0 ? 0 : 1;
    return {
      box: next,
      due: now + INTERVALS[next],
      seen: true,
      right: (prev?.right ?? 0) + (correct ? 1 : 0),
      wrong: (prev?.wrong ?? 0) + (correct ? 0 : 1),
      lastAnswer: now,
    };
  },
};

export const isSeen = (p: ItemProgress | undefined): p is ItemProgress => Boolean(p?.seen);
export const isDue = (p: ItemProgress | undefined, now: number): boolean => isSeen(p) && p.due <= now;
export const isMastered = (p: ItemProgress | undefined): boolean => (p?.box ?? 0) >= MASTERED_BOX;

/** Average box of the items divided by 5, in 0..1. */
export function mastery(ids: string[], progress: ProgressMap): number {
  if (ids.length === 0) return 0;
  const sum = ids.reduce((s, id) => s + (progress[id]?.box ?? 0), 0);
  return sum / (ids.length * 5);
}

export function countDue(ids: Iterable<string>, progress: ProgressMap, now: number): number {
  let n = 0;
  for (const id of ids) if (isDue(progress[id], now)) n++;
  return n;
}
