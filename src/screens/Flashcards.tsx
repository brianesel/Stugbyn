import { useEffect, useMemo, useState } from 'react';
import { AudioButton } from '../components/AudioButton';
import { InfoTip } from '../components/InfoTip';
import { Meter } from '../components/Meter';
import { library } from '../content/load';
import { deckLabel } from '../content/generators/vocab';
import type { VocabEntry } from '../content/schemas';
import { CARD_XP, cardId, cardsDone, countCards, pickCards, rateCard, startCards, type CardQueue } from '../engine/flashcards';
import { useProgress } from '../store/progress';
import { forms } from './WordBank';

const REVERSE_KEY = 'stugbyn:cards-english-first';

function readReverse(): boolean {
  try {
    return localStorage.getItem(REVERSE_KEY) === '1';
  } catch {
    return false;
  }
}

const POS_LABEL: Record<string, string> = { noun: 'noun', verb: 'verb', adjective: 'adjective', adverb: 'adverb', phrase: 'phrase', other: '' };

/** Words for a theme, or for every theme ordered by lesson (new words from all of class). */
function entriesFor(theme: string | null): { title: string; entries: VocabEntry[]; back: string } {
  if (theme) {
    const d = library.decks.find((x) => x.theme === theme);
    return { title: d?.title ?? theme, entries: d?.entries ?? [], back: `#/words/${encodeURIComponent(theme)}` };
  }
  const all = library.decks.flatMap((d) => d.entries);
  all.sort((a, b) => (a.lesson ?? 99) - (b.lesson ?? 99));
  return { title: 'All themes', entries: all, back: '#/words' };
}

export function Flashcards({ theme }: { theme: string | null }) {
  const { title, entries, back } = useMemo(() => entriesFor(theme), [theme]);
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const recordAnswer = useProgress((s) => s.recordAnswer);
  const completeSession = useProgress((s) => s.completeSession);

  const newRound = () => startCards(pickCards(entries.map((e) => e.id), useProgress.getState().save.items, Date.now()));
  const [q, setQ] = useState<CardQueue>(newRound);
  const [flipped, setFlipped] = useState(false);
  const [reverse, setReverse] = useState(readReverse);
  const done = cardsDone(q);
  const current = q.queue[q.pos];
  const entry = current ? byId.get(current.id) : undefined;

  useEffect(() => {
    if (done && q.queue.length > 0) completeSession();
  }, [done, q.queue.length, completeSession]);

  const rate = (gotIt: boolean) => {
    if (!current || !flipped) return;
    recordAnswer(cardId(current.id), gotIt, gotIt && !current.retry ? CARD_XP : 0, !current.retry);
    setQ((x) => rateCard(x, gotIt));
    setFlipped(false);
  };

  // Space/Enter flips, 1 = Again, 2 = Got it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if ((e.key === ' ' || e.key === 'Enter') && !flipped && entry) {
        e.preventDefault();
        setFlipped(true);
      } else if (flipped && e.key === '1') rate(false);
      else if (flipped && e.key === '2') rate(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const toggleReverse = () => {
    const next = !reverse;
    setReverse(next);
    try {
      localStorage.setItem(REVERSE_KEY, next ? '1' : '0');
    } catch {
      /* per-device preference only */
    }
  };

  if (q.queue.length === 0) {
    const { due, fresh } = countCards(entries.map((e) => e.id), useProgress.getState().save.items, Date.now());
    return (
      <div className="stack">
        <a className="back" href={back}>
          ‹ <span lang="sv">{title}</span>
        </a>
        <h1>All caught up</h1>
        <p className="muted">
          No new or due cards here right now{due + fresh === 0 ? '. Cards you know come back when it’s time to repeat them.' : '.'}
        </p>
        <a className="btn" href={back}>
          Back
        </a>
      </div>
    );
  }

  if (done) {
    return (
      <div className="stack">
        <section className="card stack" style={{ gap: 8, textAlign: 'center' }}>
          <h1>Round done</h1>
          <p className="score">
            {q.known}/{q.known + q.again}
          </p>
          <p className="muted" style={{ margin: 0 }}>
            known first time · +{q.known * CARD_XP} XP
          </p>
          <p className="small muted" style={{ margin: 0 }}>
            Words you knew come back in a few days; the others sooner.
          </p>
        </section>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setQ(newRound());
              setFlipped(false);
            }}
          >
            More cards
          </button>
          <a className="btn" href={back}>
            Back
          </a>
        </div>
      </div>
    );
  }

  if (!entry || !current) return null;
  const label = deckLabel(entry);
  const f = forms(entry);
  const firstAnswers = q.known + q.again;
  const total = new Set(q.queue.map((x) => x.id)).size;
  const front = reverse ? (
    <span className="fc-word english">{entry.en}</span>
  ) : (
    <span className="fc-word" lang="sv">
      {label}
    </span>
  );

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="game-head" style={{ marginBottom: 0 }}>
        <a className="btn-icon" href={back} aria-label="Stop">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </a>
        <Meter value={firstAnswers / total} label={`Card ${firstAnswers + 1} of ${total}`} />
        <button type="button" className="chip" aria-pressed={reverse} onClick={toggleReverse} title="Show English on the front">
          EN first
        </button>
      </div>
      <p className="ask" style={{ margin: 0 }}>
        <span lang="sv">{title}</span>
        {current.retry ? ' · again' : ''}
      </p>

      <div className={`flashcard${flipped ? ' flipped' : ''}`}>
        <div className="fc-inner">
          <button
            type="button"
            className="fc-face fc-front"
            onClick={() => setFlipped(true)}
            aria-label={flipped ? undefined : 'Show the answer'}
            tabIndex={flipped ? -1 : 0}
            aria-hidden={flipped}
          >
            {POS_LABEL[entry.pos] && <span className="fc-pos">{POS_LABEL[entry.pos]}</span>}
            {front}
            <span className="small muted">Tap to flip</span>
          </button>
          <div className="fc-face fc-back" aria-hidden={!flipped} aria-live="polite">
            {flipped && (
              <>
                <div className="fc-row">
                  <span className="fc-word small-word" lang="sv">
                    {label}
                  </span>
                  <AudioButton text={label} itemId={entry.id} />
                  <InfoTip fun={entry.fun} />
                </div>
                <span className="fc-en">{entry.en}</span>
                {f && (
                  <span className="fc-forms" lang="sv">
                    {f}
                  </span>
                )}
                {entry.example && (
                  <div className="fc-example">
                    <div className="fc-row">
                      <span lang="sv">{entry.example.sv}</span>
                      <AudioButton text={entry.example.sv} label="Play the example" />
                    </div>
                    <span className="muted">{entry.example.en}</span>
                  </div>
                )}
                {entry.note && <span className="small muted">{entry.note}</span>}
              </>
            )}
          </div>
        </div>
      </div>

      {!flipped ? (
        <div className="stack" style={{ gap: 8 }}>
          {reverse ? null : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <AudioButton text={label} itemId={entry.id} label="Play the word" />
            </div>
          )}
          <button type="button" className="btn btn-primary btn-block" onClick={() => setFlipped(true)} autoFocus>
            Show answer
          </button>
        </div>
      ) : (
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => rate(false)}>
            <span className="key" aria-hidden="true">
              1
            </span>{' '}
            Again
          </button>
          <button type="button" className="btn btn-primary" onClick={() => rate(true)} autoFocus>
            <span className="key" aria-hidden="true">
              2
            </span>{' '}
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
