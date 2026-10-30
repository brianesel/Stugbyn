/** Flashcard scheduling. Each vocab word has one card, stored in progress as `<entry id>:card`. */
import { isDue, isSeen, type ProgressMap } from './srs';

export const cardId = (entryId: string) => `${entryId}:card`;

export const CARD_XP = 5;
export const CARD_ROUND = 15;

/**
 * Picks the cards for a round: due cards first (oldest first), then new words in the order given
 * (file order = the order they were taught), up to `size`.
 */
export function pickCards(entryIds: readonly string[], progress: ProgressMap, now: number, size = CARD_ROUND): string[] {
  const due = entryIds
    .filter((id) => isDue(progress[cardId(id)], now))
    .sort((a, b) => progress[cardId(a)]!.due - progress[cardId(b)]!.due);
  const fresh = entryIds.filter((id) => !isSeen(progress[cardId(id)]));
  return [...due, ...fresh].slice(0, size);
}

export function countCards(entryIds: readonly string[], progress: ProgressMap, now: number) {
  let due = 0;
  let fresh = 0;
  for (const id of entryIds) {
    const p = progress[cardId(id)];
    if (!isSeen(p)) fresh++;
    else if (isDue(p, now)) due++;
  }
  return { due, fresh };
}

export type CardQueue = { queue: { id: string; retry: boolean }[]; pos: number; known: number; again: number };

export const startCards = (ids: string[]): CardQueue => ({ queue: ids.map((id) => ({ id, retry: false })), pos: 0, known: 0, again: 0 });

/** Rates the current card. “Again” brings it back once, three cards later. */
export function rateCard(q: CardQueue, gotIt: boolean): CardQueue {
  const entry = q.queue[q.pos];
  if (!entry) return q;
  const queue = [...q.queue];
  if (!gotIt && !entry.retry) queue.splice(Math.min(q.pos + 3, queue.length), 0, { id: entry.id, retry: true });
  return {
    queue,
    pos: q.pos + 1,
    known: q.known + (gotIt && !entry.retry ? 1 : 0),
    again: q.again + (!gotIt && !entry.retry ? 1 : 0),
  };
}

export const cardsDone = (q: CardQueue) => q.pos >= q.queue.length;
