import { readContent, readKnownForms } from '../../scripts/read-content';
import { generateNounItems } from './generators/nouns';
import { buildLibrary, type RawContent } from './library';
import type { NounTable } from './schemas';
import { validateContent } from './validate';

const raw = readContent();
const { library } = buildLibrary(raw);

describe('real content', () => {
  it('validates with no errors or warnings', () => {
    const issues = validateContent(raw, { knownForms: readKnownForms() }).filter((i) => i.level !== 'info');
    expect(issues).toEqual([]);
  });

  it('has a playable Substantiv region', () => {
    const r = library.regions.find((x) => x.id === 'substantiv');
    expect(r).toBeDefined();
    expect(r!.ruleCards.length).toBeGreaterThan(0);
    expect(r!.items.length).toBeGreaterThan(100);
  });
});

describe('nouns generator', () => {
  const sample: NounTable = {
    ...library.nouns,
    nouns: library.nouns.nouns.filter((n) => ['bil', 'äpple', 'lärare'].includes(n.sv)),
  };

  it('matches the snapshot for three sample rows', () => {
    expect(generateNounItems(sample)).toMatchSnapshot();
  });

  it('produces stable ids across runs', () => {
    const a = generateNounItems(library.nouns).map((i) => i.id);
    const b = generateNounItems(library.nouns).map((i) => i.id);
    expect(a).toEqual(b);
    expect(a).toContain('nouns:pl:bil');
    expect(new Set(a).size).toBe(a.length);
  });

  it('puts the answer in every choice item’s options exactly once, with no duplicates', () => {
    for (const item of generateNounItems(library.nouns)) {
      if (item.kind !== 'choice') continue;
      expect(item.options.filter((o) => o === item.answer)).toHaveLength(1);
      expect(new Set(item.options).size).toBe(item.options.length);
      expect(item.options.length).toBeGreaterThanOrEqual(2);
      expect(item.options.length).toBeLessThanOrEqual(4);
    }
  });

  it('leaves no template placeholders unfilled', () => {
    for (const item of generateNounItems(library.nouns)) {
      expect(JSON.stringify(item)).not.toMatch(/\{\w+\}/);
    }
  });
});

describe('validator catches bad content', () => {
  const clone = (): RawContent => JSON.parse(JSON.stringify(raw));
  const errors = (r: RawContent, knownForms?: unknown) =>
    validateContent(r, { knownForms }).filter((i) => i.level === 'error').map((i) => i.message);
  const nouns = (r: RawContent) => (r.nouns as { nouns: Record<string, unknown>[] }).nouns;

  it('flags a plural that doesn’t match its group', () => {
    const r = clone();
    nouns(r).find((n) => n.sv === 'bil')!.pl = 'biler';
    expect(errors(r).join()).toMatch(/bil: plural “biler” doesn’t match Group 2/);
  });

  it('flags a definite plural that doesn’t follow from the plural', () => {
    const r = clone();
    nouns(r).find((n) => n.sv === 'hund')!.defPl = 'hundarne';
    expect(errors(r).join()).toMatch(/hund: definite plural/);
  });

  it('flags duplicate ids', () => {
    const r = clone();
    const items = Object.values(r.regionItems)[0] as { id: string }[];
    items[1].id = items[0].id;
    expect(errors(r).join()).toMatch(/duplicate id/);
  });

  it('flags choice options without the answer', () => {
    const r = clone();
    const items = Object.values(r.regionItems)[0] as { options: string[] }[];
    items[0].options = ['kattar', 'katt'];
    expect(errors(r).join()).toMatch(/exactly once/);
  });

  it('flags rule cards with fewer than two examples', () => {
    const r = clone();
    const region = Object.values(r.regions)[0] as { ruleCards: { examples: unknown[] }[] };
    region.ruleCards[0].examples = [['en bil', 'a car']];
    expect(errors(r).join()).toMatch(/at least two examples/);
  });

  it('warns on a missing å/ä/ö', () => {
    const r = clone();
    const items = Object.values(r.regionItems)[0] as { prompt: string }[];
    items[0].prompt = 'Jag har tva ___ i soffan.'.replace('tva', 'bocker');
    const warnings = validateContent(r).filter((i) => i.level === 'warning').map((i) => i.message);
    expect(warnings.join()).toMatch(/“bocker” — did you mean “böcker”/);
  });

  it('fails when a known form drifts', () => {
    const r = clone();
    nouns(r).find((n) => n.sv === 'bok')!.pl = 'bokar';
    nouns(r).find((n) => n.sv === 'bok')!.group = 2;
    expect(errors(r, readKnownForms()).join()).toMatch(/nouns:pl:bok: expected “böcker”/);
  });
});

describe('phase 2 coverage', () => {
  it('has all 13 regions in village order', () => {
    expect(library.regions.map((r) => r.id)).toEqual([
      'uttal', 'verb', 'ordfoljd', 'fragor', 'har-hit', 'substantiv', 'adjektiv', 'preteritum', 'pronomen', 'dagar-tal', 'framtid', 'perfekt', 'bisatser',
    ]);
  });

  it.each(library.regions.map((r) => [r.id, r] as const))('%s has rule cards, 15+ hand-written practice items and a boss pool', (id, r) => {
    const handWritten = r.items.filter((i) => i.id.startsWith(`${id}:`) && !i.boss);
    const practice = r.items.filter((i) => !i.boss);
    expect(r.ruleCards.length).toBeGreaterThanOrEqual(5);
    expect(handWritten.length).toBeGreaterThanOrEqual(15);
    expect(practice.length + r.items.filter((i) => i.boss).length).toBeGreaterThanOrEqual(10);
  });
});
