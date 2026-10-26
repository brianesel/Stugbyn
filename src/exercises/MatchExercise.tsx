import { useEffect, useMemo, useState } from 'react';
import type { Item } from '../content/schemas';
import { shuffle } from '../engine/random';
import type { ExerciseProps } from './types';

type MatchItem = Extract<Item, { kind: 'match' }>;

/** Tap a Swedish card, then its English partner. Correct only if every pair was found without a wrong guess. */
export function MatchExercise({ item, result, onAnswer }: ExerciseProps<MatchItem>) {
  const left = useMemo(() => shuffle(item.pairs.map((p, i) => ({ text: p[0], i })), Math.random), [item]);
  const right = useMemo(() => shuffle(item.pairs.map((p, i) => ({ text: p[1], i })), Math.random), [item]);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (result) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [result]);

  const tryPair = (rightIndex: number) => {
    if (picked === null || result) return;
    if (picked === rightIndex) {
      const next = [...done, picked];
      setDone(next);
      setPicked(null);
      if (next.length === item.pairs.length) onAnswer(mistakes === 0);
    } else {
      setMistakes((m) => m + 1);
      setWrong(rightIndex);
      setTimeout(() => setWrong(null), 500);
    }
  };

  const cls = (i: number, side: 'l' | 'r') =>
    `option match-card${done.includes(i) ? ' correct' : ''}${side === 'l' && picked === i ? ' picked' : ''}${side === 'r' && wrong === i ? ' wrong' : ''}`;

  return (
    <div className="stack" style={{ gap: 10 }}>
      <p className="small muted" style={{ margin: 0 }} aria-live="off">
        {done.length}/{item.pairs.length} pairs · {seconds}s{mistakes ? ` · ${mistakes} wrong` : ''}
      </p>
      <div className="match-grid">
        <div className="options" role="group" aria-label="Swedish">
          {left.map(({ text, i }) => (
            <button key={i} type="button" className={cls(i, 'l')} disabled={done.includes(i) || Boolean(result)} aria-pressed={picked === i} onClick={() => setPicked(i)} lang="sv">
              {text}
            </button>
          ))}
        </div>
        <div className="options" role="group" aria-label="English">
          {right.map(({ text, i }) => (
            <button key={i} type="button" className={cls(i, 'r')} disabled={done.includes(i) || Boolean(result)} onClick={() => tryPair(i)}>
              {text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
