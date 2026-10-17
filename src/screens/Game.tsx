import { useEffect, useRef } from 'react';
import { canPlay, speak } from '../audio/speak';
import { AudioButton } from '../components/AudioButton';
import { Meter } from '../components/Meter';
import { library } from '../content/load';
import type { Item } from '../content/schemas';
import type { GradeResult } from '../engine/grading';
import { current, type Mode } from '../engine/session';
import { Exercise, exerciseAsk, exerciseHint, exercisePrompt } from '../exercises';
import { Prompt } from '../exercises/Prompt';
import { navigate } from '../router';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';

const AUTO_ADVANCE_MS = 1200;

export function Game({ mode, regionId }: { mode: Mode; regionId: string | null }) {
  const { key, state, result, start, submit, next } = useSession();
  const settings = useProgress((s) => s.save.settings);
  const nextBtn = useRef<HTMLButtonElement>(null);

  const matches = key?.mode === mode && key.regionId === regionId;

  // Start a fresh session unless one for this route is already running.
  useEffect(() => {
    const s = useSession.getState();
    const running = s.key?.mode === mode && s.key.regionId === regionId && s.state && !s.state.finished;
    if (!running) start(mode, regionId);
  }, [mode, regionId, start]);

  useEffect(() => {
    if (matches && state?.finished && state.queue.length > 0) navigate('/results');
  }, [matches, state]);

  const entry = state ? current(state) : undefined;
  const item = entry ? library.items.get(entry.itemId) : undefined;

  // After answering: focus Next; auto-advance correct answers if the setting is on.
  useEffect(() => {
    if (!result) return;
    nextBtn.current?.focus();
    if (result.correct && settings.autoAdvance) {
      const t = setTimeout(next, AUTO_ADVANCE_MS);
      return () => clearTimeout(t);
    }
  }, [result, settings.autoAdvance, next]);

  // Enter goes on, Space plays audio (unless a button or field has focus and handles the key itself).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (e.key === 'Enter' && result) {
        e.preventDefault();
        next();
      } else if (e.key === ' ' && item) {
        e.preventDefault();
        const text = result ? result.expected : spokenPrompt(item);
        if (text) speak(text, { rate: settings.rate, itemId: result ? item.id : undefined });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [result, item, next, settings.rate]);

  const backHref = regionId ? `#/region/${encodeURIComponent(regionId)}` : '#/';

  if (!matches || !state) return null;

  if (state.queue.length === 0) {
    return (
      <div className="stack">
        <h1>{mode === 'review' ? 'All caught up' : 'Nothing to play yet'}</h1>
        <p className="muted">
          {mode === 'review' ? 'No items are due right now. Come back later, or practise a region.' : 'This region has no items yet.'}
        </p>
        <a className="btn" href={backHref}>
          Back
        </a>
      </div>
    );
  }

  if (!item || !entry) return null;
  const distinct = new Set(state.queue.map((q) => q.itemId)).size;
  const done = state.answers.filter((a) => !a.retry).length;
  const prompt = exercisePrompt(item);
  const spoken = spokenPrompt(item);

  return (
    <div>
      <div className="game-head">
        <a className="btn-icon" href={backHref} aria-label="Quit round">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </a>
        <Meter value={done / distinct} label={`Progress: ${done} of ${distinct}`} />
        {state.lives !== null && (
          <span className="lives" aria-label={`${state.lives} lives left`}>
            {'♥'.repeat(Math.max(0, state.lives))}
          </span>
        )}
      </div>

      {entry.retry && <p className="small muted">Second try</p>}
      {exerciseAsk(item) && <p className="ask">{exerciseAsk(item)}</p>}
      {prompt && (
        <div className="prompt-row">
          <Prompt text={prompt} fill={result && (item.kind === 'choice' || item.kind === 'type') ? item.answer : null} />
          {spoken && <AudioButton text={spoken} label="Play the prompt" />}
        </div>
      )}
      {exerciseHint(item) && <p className="hint">{exerciseHint(item)}</p>}

      <Exercise key={`${state.pos}:${item.id}`} item={item} result={result} onAnswer={submit} />

      <div aria-live="polite">
        {result && <Feedback item={item} result={result} nextRef={nextBtn} onNext={next} />}
      </div>
    </div>
  );
}

/** Speak the prompt only when it is complete Swedish (no gap to give away). */
function spokenPrompt(item: Item): string | null {
  const p = exercisePrompt(item);
  return p && !/_{2,}/.test(p) ? p : null;
}

function Feedback({
  item,
  result,
  nextRef,
  onNext,
}: {
  item: Item;
  result: GradeResult;
  nextRef: React.RefObject<HTMLButtonElement>;
  onNext(): void;
}) {
  const ui = library.ui.feedback;
  return (
    <div className={`feedback ${result.correct ? 'ok' : 'no'}`}>
      <p className="feedback-title" lang="sv">
        {result.correct ? ui.correct : ui.wrong}
      </p>
      {result.note === 'almost' && <p>{ui.almost}</p>}
      {result.note === 'diacritics' && <p>{ui.diacritics}</p>}
      <div className="expected">
        <span lang="sv">{result.expected}</span>
        {canPlay(item.id) && <AudioButton text={result.expected} itemId={item.id} label="Play the correct Swedish" />}
      </div>
      {result.explain && <p style={{ marginTop: 6 }}>{result.explain}</p>}
      <button ref={nextRef} type="button" className="btn btn-primary btn-block" onClick={onNext}>
        Next
      </button>
    </div>
  );
}
