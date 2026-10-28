import { z } from 'zod';
import {
  Adjective,
  AdjectiveTable,
  ContentVersion,
  DaysTable,
  NumbersTable,
  Verb,
  VerbTable,
  Item,
  ItemsFile,
  Noun,
  NounTable,
  Region,
  UiStrings,
  VocabEntry,
  VocabFile,
} from './schemas';
import { generators } from './generators';
import { generateDeckItems } from './generators/vocab';

/** Raw JSON keyed by file path, as read by Vite’s import.meta.glob or by Node’s fs in scripts. */
export type RawContent = {
  version: unknown;
  ui: unknown;
  nouns: unknown;
  verbs?: unknown;
  adjectives?: unknown;
  days?: unknown;
  numbers?: unknown;
  /** Real Swedish words the diacritic check must not flag (kort is not a typo for kört). */
  allowedWords?: unknown;
  regions: Record<string, unknown>;
  regionItems: Record<string, unknown>;
  vocab: Record<string, unknown>;
};

export type Issue = { level: 'error' | 'warning' | 'info'; file: string; message: string };

export type LibraryRegion = Region & { slug: string; items: Item[] };

export type VocabTheme = { file: string; theme: string; title: string; entries: VocabEntry[] };

/** A word deck: one vocab theme with its playable items. Its pseudo-region id is `deck:<theme>`. */
export type Deck = { id: string; theme: string; title: string; entries: VocabEntry[]; items: Item[] };

export type Library = {
  version: number;
  ui: UiStrings;
  regions: LibraryRegion[];
  /** Every playable item by id. */
  items: Map<string, Item>;
  /** Item id → region id. */
  itemRegion: Map<string, string>;
  nouns: NounTable;
  verbs: VerbTable | null;
  adjectives: AdjectiveTable | null;
  vocab: VocabTheme[];
  decks: Deck[];
};

export type BuildResult = {
  library: Library;
  issues: Issue[];
  /** Every parsed item including hidden (retired, draft, check) ones, with its source file. */
  allItems: { item: Item; file: string }[];
  /** Every parsed noun row (table + vocab) with its source file. */
  allNouns: { noun: Noun; file: string }[];
};

const regionPath = /regions\/([^/]+)\/(region|items)\.json$/;

const isHidden = (r: { retired?: boolean; draft?: boolean; check?: boolean }) =>
  Boolean(r.retired || r.draft || r.check);

function formatZod(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
}

/**
 * Parses and assembles all content. Invalid records are skipped and reported as issues,
 * so one bad entry never breaks the whole app.
 */
export function buildLibrary(raw: RawContent): BuildResult {
  const issues: Issue[] = [];
  const err = (file: string, message: string) => issues.push({ level: 'error', file, message });

  function parse<S extends z.ZodTypeAny>(schema: S, value: unknown, file: string, label = ''): z.output<S> | undefined {
    const r = schema.safeParse(value);
    if (r.success) return r.data;
    err(file, `${label}${formatZod(r.error)}`);
    return undefined;
  }

  const version = parse(ContentVersion, raw.version, 'content/version.json')?.version ?? 0;
  const ui = parse(UiStrings, raw.ui, 'content/ui.json') ?? {
    feedback: { correct: '✓', wrong: '✗', almost: 'Almost!', diacritics: '' },
    letters: [],
  };

  // Vocabulary themes
  const vocab: VocabTheme[] = [];
  const allNouns: BuildResult['allNouns'] = [];
  for (const [file, value] of Object.entries(raw.vocab).sort(([a], [b]) => a.localeCompare(b))) {
    const f = parse(VocabFile, value, file);
    if (!f) continue;
    const entries: VocabEntry[] = [];
    f.entries.forEach((e, i) => {
      const entry = parse(VocabEntry, e, file, `entries[${i}] `);
      if (entry) entries.push(entry);
    });
    vocab.push({ file, theme: f.theme, title: f.title, entries });
  }

  // Noun table. Vocab nouns are checked like table nouns but practised in their theme decks, not in Substantiv.
  const nounsFile = 'content/grammar/nouns.json';
  const table = parse(NounTable, raw.nouns, nounsFile);
  const nouns: Noun[] = [];
  table?.nouns.forEach((n, i) => {
    const noun = parse(Noun, n, nounsFile, `nouns[${i}] `);
    if (noun) {
      nouns.push(noun);
      allNouns.push({ noun, file: nounsFile });
    }
  });
  for (const theme of vocab) {
    for (const e of theme.entries) {
      if (e.pos !== 'noun' || e.countable === false || !e.gender || !e.group) continue;
      if (!e.forms?.def || !e.forms.pl || !e.forms.defPl) continue;
      const noun: Noun = {
        id: e.id,
        sv: e.sv,
        gender: e.gender,
        def: e.forms.def,
        pl: e.forms.pl,
        defPl: e.forms.defPl,
        en: e.en,
        enPl: e.enPl,
        group: e.group,
        note: e.note || undefined,
        irregular: e.irregular,
        fun: e.fun,
        level: e.level,
        lesson: e.lesson,
        tags: e.tags,
        retired: e.retired,
        draft: e.draft,
        check: e.check,
      };
      allNouns.push({ noun, file: theme.file });
    }
  }
  const nounTable: NounTable = {
    groups: table?.groups ?? {
      '1': { ending: '', label: 'Group 1', rule: '' },
      '2': { ending: '', label: 'Group 2', rule: '' },
      '3': { ending: '', label: 'Group 3', rule: '' },
      '4': { ending: '', label: 'Group 4', rule: '' },
      '5': { ending: '', label: 'Group 5', rule: '' },
    },
    explain: table?.explain ?? {},
    lessons: table?.lessons,
    say: table?.say ?? {},
    nouns,
  };

  // Verb, adjective, day and number tables
  const verbsFile = 'content/grammar/verbs.json';
  const verbTable = raw.verbs === undefined ? undefined : parse(VerbTable, raw.verbs, verbsFile);
  const verbs: VerbTable | null = verbTable
    ? {
        ...verbTable,
        verbs: verbTable.verbs.flatMap((v, i) => {
          const verb = parse(Verb, v, verbsFile, `verbs[${i}] `);
          return verb ? [verb] : [];
        }),
      }
    : null;
  const adjFile = 'content/grammar/adjectives.json';
  const adjTable = raw.adjectives === undefined ? undefined : parse(AdjectiveTable, raw.adjectives, adjFile);
  const adjectives: AdjectiveTable | null = adjTable
    ? {
        ...adjTable,
        adjectives: adjTable.adjectives.flatMap((a, i) => {
          const adj = parse(Adjective, a, adjFile, `adjectives[${i}] `);
          return adj ? [adj] : [];
        }),
      }
    : null;
  const days = (raw.days === undefined ? undefined : parse(DaysTable, raw.days, 'content/grammar/days.json')) ?? null;
  const numbers =
    (raw.numbers === undefined ? undefined : parse(NumbersTable, raw.numbers, 'content/grammar/numbers.json')) ?? null;
  const tables = { nouns: nounTable, verbs, adjectives, days, numbers };

  // Regions
  const itemsBySlug = new Map<string, [string, unknown]>();
  for (const [file, value] of Object.entries(raw.regionItems)) {
    const slug = regionPath.exec(file)?.[1];
    if (slug) itemsBySlug.set(slug, [file, value]);
  }

  const regions: LibraryRegion[] = [];
  const items = new Map<string, Item>();
  const itemRegion = new Map<string, string>();
  const allItems: BuildResult['allItems'] = [];

  for (const [file, value] of Object.entries(raw.regions)) {
    const slug = regionPath.exec(file)?.[1] ?? file;
    const region = parse(Region, value, file);
    if (!region) continue;
    const regionItems: Item[] = [];

    const add = (item: Item, source: string) => {
      allItems.push({ item, file: source });
      if (isHidden(item) || items.has(item.id)) return;
      items.set(item.id, item);
      itemRegion.set(item.id, region.id);
      regionItems.push(item);
    };

    const itemsEntry = itemsBySlug.get(slug);
    if (itemsEntry) {
      const [itemsFile, list] = itemsEntry;
      const arr = parse(ItemsFile, list, itemsFile) ?? [];
      arr.forEach((v, i) => {
        const item = parse(Item, v, itemsFile, `[${i}] `);
        if (item) add(item, itemsFile);
      });
    }
    for (const name of region.generators) {
      for (const item of generators[name](tables)) add(item, `generator:${name}`);
    }
    regions.push({ ...region, slug, items: regionItems });
  }
  regions.sort((a, b) => a.order - b.order);

  // Word decks, one per vocab theme
  const decks: Deck[] = [];
  for (const theme of vocab) {
    const id = `deck:${theme.theme}`;
    const deckItems: Item[] = [];
    for (const item of generateDeckItems(theme.theme, theme.entries)) {
      allItems.push({ item, file: theme.file });
      if (items.has(item.id)) continue;
      items.set(item.id, item);
      itemRegion.set(item.id, id);
      deckItems.push(item);
    }
    const entries = theme.entries.filter((e) => !isHidden(e));
    decks.push({ id, theme: theme.theme, title: theme.title, entries, items: deckItems });
  }
  decks.sort((a, b) => a.title.localeCompare(b.title, 'sv'));

  return {
    library: { version, ui, regions, items, itemRegion, nouns: nounTable, verbs, adjectives, vocab, decks },
    issues,
    allItems,
    allNouns,
  };
}
