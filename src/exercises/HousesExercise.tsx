import { useCallback, useState } from 'react';
import { library } from '../content/load';
import type { HousesItem } from '../content/schemas';
import type { ExerciseProps } from './types';
import { useNumberKeys } from './useNumberKeys';

const GROUPS = [1, 2, 3, 4, 5] as const;

/** Five group houses. Each shows its number and ending, so colour never carries the meaning alone. */
export function HousesExercise({ item, result, onAnswer }: ExerciseProps<HousesItem>) {
  const [chosen, setChosen] = useState<number | null>(null);
  const groups = library.nouns.groups;

  const pick = useCallback(
    (index: number) => {
      if (result) return;
      setChosen(GROUPS[index]);
      onAnswer(GROUPS[index]);
    },
    [result, onAnswer],
  );
  useNumberKeys(5, !result, pick);

  return (
    <div className="houses" role="group" aria-label="Plural groups">
      {GROUPS.map((g, i) => {
        const info = groups[String(g) as keyof typeof groups];
        const isAnswer = g === item.answer;
        const state = !result ? '' : isAnswer ? 'correct' : g === chosen ? 'wrong' : 'dim';
        return (
          <button
            key={g}
            type="button"
            className={`house g${g} ${state}${result && isAnswer && result.correct ? ' bounce' : ''}`}
            onClick={() => pick(i)}
            disabled={Boolean(result)}
            aria-label={`${info?.label ?? `Group ${g}`}: ${info?.ending ?? ''}${state === 'correct' ? ' (correct)' : state === 'wrong' ? ' (your answer)' : ''}`}
          >
            <span className="roof" aria-hidden="true" />
            <span className="body" aria-hidden="true">
              <span className="num">{g}</span>
              <span className="end" lang="sv">
                {info?.ending}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
