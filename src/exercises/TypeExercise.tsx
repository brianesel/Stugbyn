import { useEffect, useRef, useState } from 'react';
import { library } from '../content/load';
import type { TypeItem } from '../content/schemas';
import type { ExerciseProps } from './types';

/** Typed answer with å ä ö buttons. Enter submits. */
export function TypeExercise({ item, result, onAnswer }: ExerciseProps<TypeItem>) {
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, [item.id]);

  const insert = (letter: string) => {
    const el = input.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + letter + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + letter.length, start + letter.length);
    });
  };

  const state = !result ? '' : result.correct ? 'correct' : 'wrong';

  return (
    <form
      className="type-answer"
      onSubmit={(e) => {
        e.preventDefault();
        if (!result && value.trim()) onAnswer(value);
      }}
    >
      <label className="sr-only" htmlFor="answer">
        Your answer
      </label>
      <input
        id="answer"
        ref={input}
        className={`text-input ${state}${result?.correct ? ' bounce' : ''}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={Boolean(result)}
        lang="sv"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="done"
      />
      <div className="letters" role="group" aria-label="Swedish letters">
        {library.ui.letters.map((l) => (
          <button key={l} type="button" className="letter" onClick={() => insert(l)} disabled={Boolean(result)} lang="sv">
            {l}
          </button>
        ))}
      </div>
      {!result && (
        <button type="submit" className="btn btn-primary btn-block" disabled={!value.trim()}>
          Check
        </button>
      )}
    </form>
  );
}
