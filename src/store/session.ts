import { create } from 'zustand';
import { library } from '../content/load';
import type { Item } from '../content/schemas';
import { grade, type Answer, type GradeResult } from '../engine/grading';
import {
  advance,
  answer,
  buildSession,
  createSession,
  current,
  SESSION_SIZE,
  summarise,
  XP_PER_CORRECT,
  type Mode,
  type SessionState,
  type SessionSummary,
} from '../engine/session';
import { PLAYABLE_KINDS } from '../exercises/kinds';
import { useProgress } from './progress';
import { BOSS_WIN_XP } from './save';

export type SessionKey = { mode: Mode; regionId: string | null };

type SessionStore = {
  key: SessionKey | null;
  state: SessionState | null;
  result: GradeResult | null;
  summary: (SessionSummary & SessionKey & { bossXp: number }) | null;
  start(mode: Mode, regionId: string | null): void;
  submit(answer: Answer): void;
  next(): void;
  quit(): void;
};

const playable = (items: Item[]) => items.filter((i) => PLAYABLE_KINDS.has(i.kind));
/** Items of a grammar region, or of a word deck (pseudo-region id `deck:<theme>`). */
const regionItems = (regionId: string) =>
  (regionId.startsWith('deck:')
    ? library.decks.find((d) => d.id === regionId)?.items
    : library.regions.find((r) => r.id === regionId)?.items) ?? [];

/**
 * Item ids for a region and mode. Practice: everything not marked boss (also what mastery counts).
 * Boss: the boss items. Review (regionId null): every playable item in the library.
 */
export function poolFor(regionId: string | null, mode: Mode = 'practice'): string[] {
  const items = regionId ? playable(regionItems(regionId)) : playable([...library.items.values()]);
  if (!regionId) return items.map((i) => i.id);
  return items.filter((i) => Boolean(i.boss) === (mode === 'boss')).map((i) => i.id);
}

function pickItems(mode: Mode, regionId: string | null): string[] {
  const progress = useProgress.getState().save.items;
  const now = Date.now();
  const size = SESSION_SIZE[mode];
  const ids = buildSession(poolFor(regionId, mode), size, mode, progress, now, Math.random);
  // Regions with fewer than 10 boss items top up with practice items.
  if (mode === 'boss' && ids.length < size) {
    ids.push(...buildSession(poolFor(regionId, 'practice'), size - ids.length, 'practice', progress, now, Math.random));
  }
  return ids;
}

export const useSession = create<SessionStore>((setState, getState) => ({
  key: null,
  state: null,
  result: null,
  summary: null,

  start(mode, regionId) {
    setState({ key: { mode, regionId }, state: createSession(pickItems(mode, regionId), mode), result: null, summary: null });
  },

  submit(given) {
    const { state, result } = getState();
    if (!state || result) return;
    const entry = current(state);
    const item = entry && library.items.get(entry.itemId);
    if (!entry || !item) return;
    const graded = grade(item, given);
    // Only the first attempt moves the item between boxes; retries are in-session practice.
    useProgress
      .getState()
      .recordAnswer(item.id, graded.correct, graded.correct ? XP_PER_CORRECT[state.mode] : 0, !entry.retry);
    setState({ state: answer(state, graded.correct, Math.random), result: graded });
  },

  next() {
    const { state, key } = getState();
    if (!state || !key) return;
    const moved = advance(state);
    if (!moved.finished) {
      setState({ state: moved, result: null });
      return;
    }
    const summary = summarise(moved);
    const progress = useProgress.getState();
    progress.completeSession();
    const bossWon = moved.mode === 'boss' && summary.won && key.regionId;
    if (bossWon) progress.winBoss(key.regionId!);
    setState({ state: moved, result: null, summary: { ...summary, ...key, bossXp: bossWon ? BOSS_WIN_XP : 0 } });
  },

  quit() {
    setState({ key: null, state: null, result: null });
  },
}));
