import type { Item, VocabEntry } from '../schemas';
import { stableIndex } from './template';

const MATCH_SIZE = 5;

const hidden = (e: VocabEntry) => Boolean(e.retired || e.draft || e.check);

/** The Swedish as shown in decks: nouns with their article (en ost), everything else as written. */
export function deckLabel(e: VocabEntry): string {
  return e.pos === 'noun' && e.gender && e.countable !== false ? `${e.gender} ${e.sv}` : e.sv;
}

/** Up to n other entries as distractors: same part of speech first, then a stable pseudo-random order. */
function distractors(e: VocabEntry, all: VocabEntry[], n: number, key: (x: VocabEntry) => string): VocabEntry[] {
  const seen = new Set([key(e)]);
  const others = all
    .filter((x) => x.id !== e.id)
    .map((x) => ({ x, rank: (x.pos === e.pos ? 0 : 1) * 1e9 + stableIndex(e.id + x.id, 1e9) }))
    .sort((a, b) => a.rank - b.rank)
    .map((o) => o.x);
  const out: VocabEntry[] = [];
  for (const x of others) {
    if (out.length >= n) break;
    if (seen.has(key(x))) continue;
    seen.add(key(x));
    out.push(x);
  }
  return out;
}

/**
 * Word-deck items for one theme: meaning (sv → en), recall (en → sv), listening, typing,
 * en/ett for nouns, and matching rounds of five. Ids hang off the entry id, so progress survives edits.
 */
export function generateDeckItems(theme: string, entries: VocabEntry[]): Item[] {
  const words = entries.filter((e) => !hidden(e));
  const items: Item[] = [];
  for (const e of words) {
    const label = deckLabel(e);
    const base = { level: e.level, lesson: e.lesson, tags: ['deck', theme, ...(e.tags ?? [])], fun: e.fun };
    const explain = e.example ? `${label} = ${e.en}. ${e.example.sv} (${e.example.en})` : `${label} = ${e.en}.`;
    const svOthers = distractors(e, words, 3, deckLabel);
    const enOthers = distractors(e, words, 3, (x) => x.en);

    if (enOthers.length >= 1) {
      items.push({
        ...base,
        id: `${e.id}:sv-en`,
        kind: 'choice',
        ask: 'What does it mean?',
        prompt: label,
        answer: e.en,
        options: [e.en, ...enOthers.map((x) => x.en)],
        explain,
        say: label,
      });
    }
    if (svOthers.length >= 1) {
      items.push(
        {
          ...base,
          id: `${e.id}:en-sv`,
          kind: 'choice',
          ask: 'How do you say it in Swedish?',
          prompt: e.en,
          promptLang: 'en',
          answer: label,
          options: [label, ...svOthers.map(deckLabel)],
          explain,
          say: label,
        },
        {
          ...base,
          id: `${e.id}:listen`,
          kind: 'listen',
          ask: 'Which one do you hear?',
          say: label,
          answer: label,
          options: [label, ...svOthers.map(deckLabel)],
          accept: [],
          explain,
        },
      );
    }
    // Typing only for short words and phrases without a blank (… is filled in by the learner in real life).
    if (e.sv.split(' ').length <= 3 && !e.sv.includes('…')) {
      items.push({
        ...base,
        id: `${e.id}:type`,
        kind: 'type',
        ask: 'Type it in Swedish.',
        prompt: `${e.en} = ___`,
        promptLang: 'en',
        answer: e.sv,
        accept: label === e.sv ? [] : [label],
        explain,
        say: label,
      });
    }
    if (e.pos === 'noun' && e.gender && e.countable !== false) {
      items.push({
        ...base,
        id: `${e.id}:gender`,
        kind: 'choice',
        ask: 'En or ett?',
        prompt: `___ ${e.sv}`,
        hint: e.en,
        answer: e.gender,
        options: ['en', 'ett'],
        explain: `It’s ${label}. Learn the article together with the word.`,
        say: label,
      });
    }
  }

  // Matching rounds of five, in file order (new words are appended, so earlier rounds keep their ids).
  for (let k = 0; k * MATCH_SIZE + 4 <= words.length; k++) {
    const chunk = words.slice(k * MATCH_SIZE, k * MATCH_SIZE + MATCH_SIZE);
    if (new Set(chunk.map((x) => x.en)).size !== chunk.length) continue;
    items.push({
      id: `vocab:${theme}:match:${k + 1}`,
      kind: 'match',
      ask: 'Match the pairs.',
      pairs: chunk.map((x) => [deckLabel(x), x.en] as [string, string]),
      level: chunk.some((x) => x.level !== 'A1') ? 'A2' : 'A1',
      lesson: Math.max(...chunk.map((x) => x.lesson ?? 0)) || undefined,
      tags: ['deck', theme],
    });
  }
  return items;
}
