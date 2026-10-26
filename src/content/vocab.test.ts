import { generateDeckItems, deckLabel } from './generators/vocab';
import type { VocabEntry } from './schemas';
import { readContent } from '../../scripts/read-content';
import { buildLibrary } from './library';

const words: VocabEntry[] = [
  { id: 'vocab:t:ost', sv: 'ost', en: 'cheese', pos: 'noun', gender: 'en', forms: { def: 'osten', pl: 'ostar', defPl: 'ostarna' }, group: 2, level: 'A1' },
  { id: 'vocab:t:agg', sv: 'ägg', en: 'egg', pos: 'noun', gender: 'ett', forms: { def: 'ägget', pl: 'ägg', defPl: 'äggen' }, group: 5, level: 'A1' },
  { id: 'vocab:t:mjolk', sv: 'mjölk', en: 'milk', pos: 'noun', gender: 'en', countable: false, forms: { def: 'mjölken' }, level: 'A1' },
  { id: 'vocab:t:lasa', sv: 'läsa', en: 'read', pos: 'verb', level: 'A1' },
  { id: 'vocab:t:ont', sv: 'Jag har ont i …', en: 'My … hurts', pos: 'phrase', level: 'A1' },
  { id: 'vocab:t:hidden', sv: 'bastu', en: 'sauna', pos: 'noun', gender: 'en', check: true, level: 'A1' },
];

describe('deck generator', () => {
  const items = generateDeckItems('t', words);
  const ids = items.map((i) => i.id);

  it('shows nouns with their article, uncountables without', () => {
    expect(deckLabel(words[0])).toBe('en ost');
    expect(deckLabel(words[2])).toBe('mjölk');
  });

  it('makes meaning, recall, listening, typing and en/ett items with ids under the entry id', () => {
    expect(ids).toEqual(
      expect.arrayContaining(['vocab:t:ost:sv-en', 'vocab:t:ost:en-sv', 'vocab:t:ost:listen', 'vocab:t:ost:type', 'vocab:t:ost:gender']),
    );
    expect(ids).not.toContain('vocab:t:mjolk:gender');
    expect(ids).not.toContain('vocab:t:ont:type');
  });

  it('never uses hidden (check / draft) entries', () => {
    expect(ids.some((id) => id.includes('hidden'))).toBe(false);
    expect(JSON.stringify(items)).not.toContain('bastu');
  });

  it('accepts the answer with or without the article when typing', () => {
    const t = items.find((i) => i.id === 'vocab:t:ost:type');
    expect(t && t.kind === 'type' && [t.answer, ...t.accept]).toEqual(['ost', 'en ost']);
  });

  it('makes a matching round of five words', () => {
    const m = items.find((i) => i.kind === 'match');
    expect(m && m.kind === 'match' && m.pairs).toHaveLength(5);
  });

  it('keeps the answer exactly once in options for every deck item in the real content', () => {
    const { library } = buildLibrary(readContent());
    expect(library.decks.length).toBeGreaterThanOrEqual(16);
    for (const d of library.decks) {
      for (const item of d.items) {
        if (!('options' in item) || !item.options) continue;
        expect(item.options.filter((o) => o === item.answer), item.id).toHaveLength(1);
        expect(new Set(item.options).size, item.id).toBe(item.options.length);
      }
    }
  });
});
