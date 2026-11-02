import { useCallback, useState } from 'react';
import { library } from '../content/load';
import type { House, HousesItem } from '../content/schemas';
import type { ExerciseProps } from './types';
import { useNumberKeys } from './useNumberKeys';

/** The default houses: the five noun plural groups. */
const nounHouses = (): (House & { label: string })[] =>
  ([1, 2, 3, 4, 5] as const).map((g) => {
    const info = library.nouns.groups[String(g) as keyof typeof library.nouns.groups];
    return { name: String(g), sub: info?.ending, label: info?.label ?? `Group ${g}` };
  });

/** Sorting houses. Each shows its name and a short line, so colour never carries the meaning alone. */
export function HousesExercise({ item, result, onAnswer }: ExerciseProps<HousesItem>) {
  const [chosen, setChosen] = useState<number | null>(null);
  const houses = item.houses ? item.houses.map((h) => ({ ...h, label: h.name })) : nounHouses();

  const pick = useCallback(
    (index: number) => {
      if (result) return;
      setChosen(index + 1);
      onAnswer(index + 1);
    },
    [result, onAnswer],
  );
  useNumberKeys(houses.length, !result, pick);

  return (
    <div
      className="houses"
      role="group"
      aria-label={item.houses ? 'Groups' : 'Plural groups'}
      style={{ gridTemplateColumns: `repeat(${houses.length}, minmax(0, 1fr))` }}
    >
      {houses.map((h, i) => {
        const g = i + 1;
        const isAnswer = g === item.answer;
        const state = !result ? '' : isAnswer ? 'correct' : g === chosen ? 'wrong' : 'dim';
        return (
          <button
            key={g}
            type="button"
            className={`house g${g} ${state}${result && isAnswer && result.correct ? ' bounce' : ''}`}
            onClick={() => pick(i)}
            disabled={Boolean(result)}
            aria-label={`${h.label}${h.sub ? `: ${h.sub}` : ''}${state === 'correct' ? ' (correct)' : state === 'wrong' ? ' (your answer)' : ''}`}
          >
            <span className="roof" aria-hidden="true" />
            <span className="body" aria-hidden="true">
              <span className={`num${h.name.length > 3 ? ' long' : ''}`} lang="sv">
                {h.name}
              </span>
              {h.sub && (
                <span className="end" lang="sv">
                  {h.sub}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
