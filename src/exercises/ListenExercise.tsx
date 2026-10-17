import { useEffect } from 'react';
import { canPlay, speak, useHasSwedishVoice } from '../audio/speak';
import type { ChoiceItem, Item, TypeItem } from '../content/schemas';
import { useProgress } from '../store/progress';
import { ChoiceExercise } from './ChoiceExercise';
import { TypeExercise } from './TypeExercise';
import type { ExerciseProps } from './types';

type ListenItem = Extract<Item, { kind: 'listen' }>;

/** Plays the audio, then a choice or a typed answer. Falls back to showing the text without audio. */
export function ListenExercise({ item, result, onAnswer }: ExerciseProps<ListenItem>) {
  useHasSwedishVoice();
  const rate = useProgress((s) => s.save.settings.rate);
  const text = item.say ?? item.answer;
  const playable = canPlay(item.id);
  const play = () => speak(text, { rate, itemId: item.id });

  useEffect(() => {
    if (playable) play();
    // Play once when the item appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const inner = item.options ? (
    <ChoiceExercise item={{ ...item, kind: 'choice', prompt: '', options: item.options } as ChoiceItem} result={result} onAnswer={onAnswer} />
  ) : (
    <TypeExercise item={{ ...item, kind: 'type', prompt: '' } as TypeItem} result={result} onAnswer={onAnswer} />
  );

  return (
    <div className="stack" style={{ gap: 16 }}>
      {playable ? (
        <button type="button" className="listen-btn" onClick={play} aria-label="Play the audio again">
          <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />
          </svg>
          <span>Play again</span>
        </button>
      ) : (
        <p className="card note small" style={{ margin: 0 }}>
          No Swedish audio on this device, so here is the text: <strong lang="sv">{text}</strong>
        </p>
      )}
      {inner}
    </div>
  );
}
