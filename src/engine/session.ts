import { shuffle, type Rng } from './random';
import { isDue, isSeen, type ProgressMap } from './srs';

export type Mode = 'practice' | 'boss' | 'review';

export const SESSION_SIZE: Record<Mode, number> = { practice: 10, boss: 10, review: 15 };
export const XP_PER_CORRECT: Record<Mode, number> = { practice: 10, boss: 20, review: 10 };

/**
 * Picks the items for a session.
 * Practice/boss: up to 6 due items (oldest due first), up to 4 unseen, then fill with more due,
 * more unseen, then the soonest upcoming. Review: only due items. The result is shuffled.
 */
export function buildSession(
  pool: readonly string[],
  size: number,
  mode: Mode,
  progress: ProgressMap,
  now: number,
  rng: Rng,
): string[] {
  const due = pool.filter((id) => isDue(progress[id], now)).sort((a, b) => progress[a]!.due - progress[b]!.due);
  if (mode === 'review') return shuffle(due.slice(0, size), rng);

  // Unseen items are drawn at random so one session doesn’t drill five forms of the same word.
  const unseen = shuffle(
    pool.filter((id) => !isSeen(progress[id])),
    rng,
  );
  const upcoming = pool
    .filter((id) => isSeen(progress[id]) && !isDue(progress[id], now))
    .sort((a, b) => progress[a]!.due - progress[b]!.due);

  const picked: string[] = [...due.slice(0, 6), ...unseen.slice(0, 4)];
  const fill = (source: string[]) => {
    for (const id of source) {
      if (picked.length >= size) return;
      if (!picked.includes(id)) picked.push(id);
    }
  };
  fill(due);
  fill(unseen);
  fill(upcoming);
  return shuffle(picked.slice(0, size), rng);
}

export type QueueEntry = { itemId: string; retry: boolean };
export type AnswerRecord = { itemId: string; correct: boolean; retry: boolean };

export type SessionState = {
  mode: Mode;
  queue: QueueEntry[];
  pos: number;
  answers: AnswerRecord[];
  /** Ids already re-queued once. */
  requeued: string[];
  lives: number | null;
  finished: boolean;
};

export function createSession(itemIds: string[], mode: Mode, lives: number | null = mode === 'boss' ? 3 : null): SessionState {
  return {
    mode,
    queue: itemIds.map((itemId) => ({ itemId, retry: false })),
    pos: 0,
    answers: [],
    requeued: [],
    lives,
    finished: itemIds.length === 0,
  };
}

export const current = (s: SessionState): QueueEntry | undefined => s.queue[s.pos];

/** Records the answer to the current item. A wrong item is re-queued once, 3–4 positions later. */
export function answer(s: SessionState, correct: boolean, rng: Rng): SessionState {
  const entry = current(s);
  if (!entry || s.finished) return s;
  const queue = [...s.queue];
  const requeued = [...s.requeued];
  if (!correct && !requeued.includes(entry.itemId)) {
    const at = Math.min(s.pos + 3 + (rng() < 0.5 ? 0 : 1), queue.length);
    queue.splice(at, 0, { itemId: entry.itemId, retry: true });
    requeued.push(entry.itemId);
  }
  const lives = s.lives !== null && !correct ? s.lives - 1 : s.lives;
  return {
    ...s,
    queue,
    requeued,
    lives,
    answers: [...s.answers, { itemId: entry.itemId, correct, retry: entry.retry }],
  };
}

/** Moves to the next item after feedback. */
export function advance(s: SessionState): SessionState {
  const pos = s.pos + 1;
  const outOfLives = s.lives !== null && s.lives <= 0;
  return { ...s, pos, finished: outOfLives || pos >= s.queue.length };
}

export type SessionSummary = {
  mode: Mode;
  /** First attempts answered correctly. */
  score: number;
  /** Distinct items in the session. */
  total: number;
  xp: number;
  missed: string[];
  won: boolean;
};

export function summarise(s: SessionState): SessionSummary {
  const firsts = s.answers.filter((a) => !a.retry);
  const total = new Set(s.queue.map((q) => q.itemId)).size;
  const score = firsts.filter((a) => a.correct).length;
  const xp = s.answers.filter((a) => a.correct).length * XP_PER_CORRECT[s.mode];
  const missed = [...new Set(s.answers.filter((a) => !a.correct).map((a) => a.itemId))];
  const won = s.lives === null ? true : s.lives > 0 && s.pos >= s.queue.length;
  return { mode: s.mode, score, total, xp, missed, won };
}
