import { canPlay, speak, useHasSwedishVoice } from '../audio/speak';
import { useProgress } from '../store/progress';

type Props = { text: string; itemId?: string; label?: string };

/** Plays Swedish audio. Hidden when the device has no Swedish voice and no recording exists. */
export function AudioButton({ text, itemId, label }: Props) {
  useHasSwedishVoice();
  const rate = useProgress((s) => s.save.settings.rate);
  if (!canPlay(itemId)) return null;
  return (
    <button
      type="button"
      className="btn-icon"
      aria-label={label ?? `Play “${text}”`}
      onClick={(e) => {
        e.stopPropagation();
        speak(text, { rate, itemId });
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />
      </svg>
    </button>
  );
}
