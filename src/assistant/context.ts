import { library } from '../content/load';
import type { VocabEntry } from '../content/schemas';
import { expectedText } from '../engine/grading';
import { isSeen, type ProgressMap } from '../engine/srs';
import { wordLevel } from '../screens/WordBank';

/** What the writing helper knows about where the learner is. Matches the server’s request schema. */
export type HelperContext = {
  kind: 'region' | 'deck' | 'all';
  title: string;
  summary: string;
  words: { sv: string; en: string }[];
};

const word = (e: VocabEntry) => ({ sv: e.sv, en: e.en });
const practised = (entries: VocabEntry[], progress: ProgressMap) => entries.filter((e) => wordLevel(e, progress) > 0);
const allEntries = () => library.decks.flatMap((d) => d.entries);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** `region:<id>`, `deck:<theme>` or anything else for all words. */
export function buildContext(key: string | null, progress: ProgressMap): HelperContext {
  const [kind, id] = (key ?? '').split(':');

  const region = kind === 'region' ? library.regions.find((r) => r.id === id) : undefined;
  if (region) {
    const rules = region.ruleCards.map((c) => `- ${c.title}: ${clip(c.rule, 300)}`).join('\n');
    const sentences = region.items
      .filter((i) => isSeen(progress[i.id]))
      .map((i) => expectedText(i))
      .filter((t) => t.includes(' '))
      .slice(0, 40);
    const summary = [
      `${region.name}: ${region.subtitle}. Rules taught here:\n${rules}`,
      sentences.length ? `Sentences the learner has practised in this region:\n${sentences.map((s) => `- ${s}`).join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    return { kind: 'region', title: region.name, summary: clip(summary, 4000), words: practised(allEntries(), progress).slice(0, 150).map(word) };
  }

  const deck = kind === 'deck' ? library.decks.find((d) => d.theme === id) : undefined;
  if (deck) {
    const done = practised(deck.entries, progress);
    const rest = deck.entries.filter((e) => !done.includes(e));
    const summary = rest.length
      ? `Words in this theme the learner hasn’t practised yet: ${rest
          .slice(0, 120)
          .map((e) => `${e.sv} (${e.en})`)
          .join(', ')}`
      : '';
    return { kind: 'deck', title: deck.title, summary: clip(summary, 4000), words: done.map(word) };
  }

  return { kind: 'all', title: 'All words', summary: '', words: practised(allEntries(), progress).slice(0, 300).map(word) };
}
