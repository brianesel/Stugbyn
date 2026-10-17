import { useCallback, useMemo, useState } from 'react';
import type { ChoiceItem } from '../content/schemas';
import { shuffle } from '../engine/random';
import type { ExerciseProps } from './types';
import { useNumberKeys } from './useNumberKeys';

export function ChoiceExercise({ item, result, onAnswer }: ExerciseProps<ChoiceItem>) {
  const options = useMemo(() => shuffle(item.options, Math.random), [item]);
  const [chosen, setChosen] = useState<string | null>(null);

  const pick = useCallback(
    (index: number) => {
      if (result) return;
      setChosen(options[index]);
      onAnswer(options[index]);
    },
    [options, result, onAnswer],
  );
  useNumberKeys(options.length, !result, pick);

  return (
    <div className="options" role="group" aria-label="Options">
      {options.map((o, i) => {
        const isAnswer = o === item.answer;
        const state = !result ? '' : isAnswer ? 'correct' : o === chosen ? 'wrong' : 'dim';
        return (
          <button
            key={o}
            type="button"
            className={`option ${state}${result && isAnswer && result.correct ? ' bounce' : ''}`}
            onClick={() => pick(i)}
            disabled={Boolean(result)}
            aria-pressed={o === chosen}
          >
            <span className="key" aria-hidden="true">
              {i + 1}
            </span>
            <span lang="sv">{o}</span>
            {state === 'correct' && <span className="mark">✓ correct</span>}
            {state === 'wrong' && <span className="mark">✗ your answer</span>}
          </button>
        );
      })}
    </div>
  );
}
