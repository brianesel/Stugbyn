import type { AdjectiveTable, DaysTable, GeneratorName, Item, NounTable, NumbersTable, VerbTable } from '../schemas';
import { generateAdjectiveItems } from './adjectives';
import { generateDayItems } from './days';
import { generateNounItems } from './nouns';
import { generateNumberItems } from './numbers';
import { generateVerbItems } from './verbs';

export type GrammarTables = {
  nouns: NounTable;
  verbs: VerbTable | null;
  adjectives: AdjectiveTable | null;
  days: DaysTable | null;
  numbers: NumbersTable | null;
};

export const generators: Record<GeneratorName, (tables: GrammarTables) => Item[]> = {
  nouns: (t) => generateNounItems(t.nouns),
  'verbs-present': (t) => (t.verbs ? generateVerbItems(t.verbs, 'present') : []),
  'verbs-past': (t) => (t.verbs ? generateVerbItems(t.verbs, 'past') : []),
  'verbs-perfect': (t) => (t.verbs ? generateVerbItems(t.verbs, 'perfect') : []),
  adjectives: (t) => (t.adjectives ? generateAdjectiveItems(t.adjectives) : []),
  days: (t) => (t.days ? generateDayItems(t.days) : []),
  numbers: (t) => (t.numbers ? generateNumberItems(t.numbers) : []),
};
