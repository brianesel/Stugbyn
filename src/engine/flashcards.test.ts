import { cardId, cardsDone, countCards, pickCards, rateCard, startCards } from './flashcards';
import type { ItemProgress, ProgressMap } from './srs';

const NOW = 1_000_000;
const seen = (due: number): ItemProgress => ({ box: 2, due, seen: true, right: 1, wrong: 0 });

describe('flashcards', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];
  const progress: ProgressMap = { [cardId('c')]: seen(NOW - 10), [cardId('d')]: seen(NOW - 50), [cardId('e')]: seen(NOW + 99) };

  it('puts due cards first (oldest first), then new words in teaching order', () => {
    expect(pickCards(ids, progress, NOW)).toEqual(['d', 'c', 'a', 'b']);
    expect(pickCards(ids, progress, NOW, 3)).toEqual(['d', 'c', 'a']);
  });

  it('counts due and new cards', () => {
    expect(countCards(ids, progress, NOW)).toEqual({ due: 2, fresh: 2 });
  });

  it('brings an “Again” card back once, three cards later, and counts first answers only', () => {
    let q = startCards(['a', 'b', 'c', 'd']);
    q = rateCard(q, false);
    expect(q.queue.map((x) => x.id)).toEqual(['a', 'b', 'c', 'a', 'd']);
    q = rateCard(rateCard(q, true), true);
    q = rateCard(q, false); // retry of a: not re-queued again, not counted twice
    q = rateCard(q, true);
    expect(cardsDone(q)).toBe(true);
    expect({ known: q.known, again: q.again }).toEqual({ known: 3, again: 1 });
  });
});
