import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OrderItem } from '../content/schemas';
import { shuffle } from '../engine/random';
import type { ExerciseProps } from './types';
import { useNumberKeys } from './useNumberKeys';

/** Splits the sentence into word tiles, dropping the final punctuation. */
export function orderTiles(sentence: string): string[] {
  return sentence
    .trim()
    .replace(/[.!?…]+$/u, '')
    .split(/\s+/)
    .filter(Boolean);
}

/** Tap tiles to build the sentence; tap a placed tile to return it. */
export function OrderExercise({ item, result, onAnswer }: ExerciseProps<OrderItem>) {
  const tiles = useMemo(() => {
    const words = orderTiles(item.sentence);
    let mixed = shuffle(words.map((w, i) => ({ w, i })), Math.random);
    // Never start already solved.
    for (let n = 0; n < 5 && words.length > 1 && mixed.every((t, k) => t.i === k); n++) {
      mixed = shuffle(mixed, Math.random);
    }
    return mixed;
  }, [item]);
  const [placed, setPlaced] = useState<number[]>([]);
  const available = tiles.map((_, k) => k).filter((k) => !placed.includes(k));
  const complete = placed.length === tiles.length;

  const place = useCallback((k: number) => !result && setPlaced((p) => (p.includes(k) ? p : [...p, k])), [result]);
  const unplace = (k: number) => !result && setPlaced((p) => p.filter((x) => x !== k));
  const submit = useCallback(() => {
    if (!result && complete) onAnswer(placed.map((k) => tiles[k].w).join(' '));
  }, [result, complete, placed, tiles, onAnswer]);

  useNumberKeys(Math.min(9, available.length), !result, (n) => place(available[n]));

  useEffect(() => {
    if (result) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        setPlaced((p) => p.slice(0, -1));
      } else if (e.key === 'Enter' && (e.target as HTMLElement)?.tagName !== 'BUTTON') {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [result, submit]);

  const state = !result ? '' : result.correct ? 'correct' : 'wrong';

  return (
    <div className="order">
      <div className={`order-line ${state}`} aria-label="Your sentence" role="group">
        {placed.length === 0 && <span className="muted small">Tap the words in order</span>}
        {placed.map((k) => (
          <button key={k} type="button" className="tile placed" onClick={() => unplace(k)} disabled={Boolean(result)} lang="sv">
            {tiles[k].w}
          </button>
        ))}
      </div>
      <div className="tiles" role="group" aria-label="Words">
        {tiles.map((t, k) =>
          placed.includes(k) ? (
            <span key={k} className="tile ghost" aria-hidden="true">
              {t.w}
            </span>
          ) : (
            <button key={k} type="button" className="tile" onClick={() => place(k)} disabled={Boolean(result)} lang="sv">
              <span className="sr-only">{available.indexOf(k) + 1 <= 9 ? `${available.indexOf(k) + 1}: ` : ''}</span>
              {t.w}
            </button>
          ),
        )}
      </div>
      {!result && (
        <button type="button" className="btn btn-primary btn-block" disabled={!complete} onClick={submit}>
          Check
        </button>
      )}
    </div>
  );
}
