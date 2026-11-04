import { useMemo, useState } from 'react';
import { AudioButton } from '../components/AudioButton';
import { InfoTip } from '../components/InfoTip';
import { Meter } from '../components/Meter';
import { library } from '../content/load';
import type { Deck } from '../content/library';
import { deckLabel } from '../content/generators/vocab';
import type { VocabEntry } from '../content/schemas';
import { cardId, countCards } from '../engine/flashcards';
import { mastery, type ProgressMap } from '../engine/srs';
import { useProgress } from '../store/progress';
import { poolFor } from '../store/session';

/** Item ids practising each vocab entry (its deck items share the entry id as prefix). */
const itemsByEntry = new Map<string, string[]>();
for (const d of library.decks) {
  for (const e of d.entries) {
    itemsByEntry.set(e.id, [...d.items.filter((i) => i.id.startsWith(`${e.id}:`)).map((i) => i.id), cardId(e.id)]);
  }
}

export type WordForm = { label: string; sv: string };

/** Other forms to show under the word, each with a short English label: noun forms from the entry, verb and adjective forms from the grammar tables. */
export function forms(e: VocabEntry): WordForm[] {
  const list = (pairs: [string, string | null | undefined][]) =>
    pairs.filter((p): p is [string, string] => Boolean(p[1])).map(([label, sv]) => ({ label, sv }));
  if (e.pos === 'noun' && e.forms) return list([['the', e.forms.def], ['plural', e.forms.pl], ['the plural', e.forms.defPl]]);
  if (e.pos === 'verb') {
    const v = library.verbs?.verbs.find((x) => x.inf === e.sv);
    if (v) return list([['present', v.pres], ['past', v.past], ['har', v.sup]]);
  }
  if (e.pos === 'adjective') {
    const a = e.adjForms ?? library.adjectives?.adjectives.find((x) => x.base === e.sv);
    if (a) return list([['ett', a.t], ['plural, the', a.a], ['more', a.comp], ['most', a.sup]]);
  }
  return [];
}

/** The forms line: “the säkraren · plural säkrare · the plural säkrarna”. */
export function FormsLine({ forms, className }: { forms: WordForm[]; className: string }) {
  if (forms.length === 0) return null;
  return (
    <span className={className}>
      {forms.map((f, i) => (
        <span key={f.label} className="form">
          {i > 0 && ' · '}
          <span className="form-label">{f.label}</span>{' '}
          <span lang="sv">{f.sv}</span>
        </span>
      ))}
    </span>
  );
}

/** 0 = new, 1 = learning, 2 = known (box 3+ on average). */
export function wordLevel(e: VocabEntry, progress: ProgressMap): number {
  const ids = itemsByEntry.get(e.id) ?? [];
  if (!ids.some((id) => progress[id]?.seen)) return 0;
  return mastery(ids, progress) >= 0.6 ? 2 : 1;
}

const fold = (s: string) => s.toLowerCase().normalize('NFC');

export function WordBank({ theme }: { theme: string | null }) {
  const progress = useProgress((s) => s.save.items);
  const [query, setQuery] = useState('');
  const deck = theme ? library.decks.find((d) => d.theme === theme) ?? null : null;
  const total = library.decks.reduce((n, d) => n + d.entries.length, 0);

  const results = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return null;
    return library.decks.flatMap((d) =>
      d.entries.filter((e) => fold(e.sv).includes(q) || fold(e.en).includes(q)).map((e) => ({ e, d })),
    );
  }, [query]);

  return (
    <div className="stack">
      <a className="back" href={deck ? '#/words' : '#/'}>
        ‹ {deck ? 'Word bank' : 'Village'}
      </a>
      <h1>{deck ? <span lang="sv">{deck.title}</span> : 'Word bank'}</h1>

      <label className="sr-only" htmlFor="word-search">
        Search words
      </label>
      <input
        id="word-search"
        className="search"
        type="search"
        placeholder={`Search ${total} words, Swedish or English`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />

      {results ? (
        <section aria-label="Search results" className="stack" style={{ gap: 8 }}>
          <p className="small muted" style={{ margin: 0 }}>
            {results.length} {results.length === 1 ? 'word' : 'words'}
          </p>
          <WordList entries={results.map((r) => r.e)} progress={progress} />
        </section>
      ) : deck ? (
        <DeckView deck={deck} progress={progress} />
      ) : (
        <>
          <CardsButton entryIds={library.decks.flatMap((d) => d.entries.map((e) => e.id))} href="#/cards" label="Flashcards · all themes" progress={progress} />
          <a className="btn btn-block" href="#/helper">
            Writing helper · all my words
          </a>
          <DeckGrid progress={progress} />
        </>
      )}
    </div>
  );
}

function DeckGrid({ progress }: { progress: ProgressMap }) {
  if (library.decks.length === 0) return <p className="muted">No word lists yet.</p>;
  return (
    <div className="village">
      {library.decks.map((d) => {
        const m = mastery(poolFor(d.id), progress);
        return (
          <a key={d.id} className="cabin-card" href={`#/words/${encodeURIComponent(d.theme)}`}>
            <span className="cabin-name" lang="sv">
              {d.title}
            </span>
            <span className="cabin-sub">{d.entries.length} words</span>
            <Meter value={m} label={`${d.title} progress`} />
          </a>
        );
      })}
    </div>
  );
}

function DeckView({ deck, progress }: { deck: Deck; progress: ProgressMap }) {
  const ids = poolFor(deck.id);
  const known = deck.entries.filter((e) => wordLevel(e, progress) === 2).length;
  return (
    <>
      <div className="card stack" style={{ gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <strong>
            {known} of {deck.entries.length} words known
          </strong>
          <span>{Math.round(mastery(ids, progress) * 100)}%</span>
        </div>
        <Meter value={mastery(ids, progress)} label={`${deck.title} progress`} />
        <CardsButton entryIds={deck.entries.map((e) => e.id)} href={`#/cards/${encodeURIComponent(deck.theme)}`} label="Flashcards" progress={progress} primary />
        <a className="btn btn-block" href={`#/play/practice/${encodeURIComponent(deck.id)}`}>
          Practise this deck · 10 items
        </a>
        <a className="btn btn-block" href={`#/helper/${encodeURIComponent(`deck:${deck.theme}`)}`}>
          Writing helper · write and translate with these words
        </a>
      </div>
      <WordList entries={deck.entries} progress={progress} />
    </>
  );
}

/** Link to a flashcard round, with how many new and due cards are waiting. */
function CardsButton({ entryIds, href, label, progress, primary }: { entryIds: string[]; href: string; label: string; progress: ProgressMap; primary?: boolean }) {
  const { due, fresh } = countCards(entryIds, progress, Date.now());
  const parts = [fresh && `${fresh} new`, due && `${due} due`].filter(Boolean).join(', ');
  return (
    <a className={`btn btn-block${primary ? ' btn-primary' : ''}`} href={href}>
      {label}
      {parts ? ` · ${parts}` : ''}
    </a>
  );
}

function WordList({ entries, progress }: { entries: VocabEntry[]; progress: ProgressMap }) {
  return (
    <ul className="words">
      {entries.map((e) => {
        const label = deckLabel(e);
        const level = wordLevel(e, progress);
        const f = forms(e);
        return (
          <li key={e.id} className="word">
            <span className="level-dot" data-level={level} title={['New', 'Learning', 'Known'][level]} aria-label={['New', 'Learning', 'Known'][level]} />
            <span>
              <span className="sv" lang="sv">
                {label}
              </span>
              <FormsLine forms={f} className="forms" />
            </span>
            <span className="en">{e.en}</span>
            <InfoTip fun={e.fun} />
            <AudioButton text={label} itemId={e.id} />
          </li>
        );
      })}
    </ul>
  );
}
