import { readContent } from '../../scripts/read-content';
import { generateAdjectiveItems } from './generators/adjectives';
import { generateDayItems } from './generators/days';
import { generateNumberItems, numberVariants, numberWord } from './generators/numbers';
import { generateVerbItems } from './generators/verbs';
import { buildLibrary } from './library';

const { library } = buildLibrary(readContent());
const verbs = library.verbs!;
const adjectives = library.adjectives!;
const raw = readContent();

const sampleVerbs = { ...verbs, verbs: verbs.verbs.filter((v) => ['köpa', 'bo', 'tycka'].includes(v.inf)) };
const sampleAdj = { ...adjectives, adjectives: adjectives.adjectives.filter((a) => ['stor', 'liten', 'bra'].includes(a.base)) };

describe('verb generator', () => {
  it('matches the snapshot for three sample rows', () => {
    expect({
      present: generateVerbItems(sampleVerbs, 'present'),
      past: generateVerbItems(sampleVerbs, 'past'),
      perfect: generateVerbItems(sampleVerbs, 'perfect'),
    }).toMatchSnapshot();
  });

  it('keeps verbs without an object out of sentence frames', () => {
    const items = generateVerbItems(sampleVerbs, 'past').filter((i) => i.id.endsWith(':tycka'));
    expect(items.map((i) => ('prompt' in i ? i.prompt : ''))).toEqual(['tycka → ___', 'tycka → ___']);
    expect(generateVerbItems(sampleVerbs, 'present').some((i) => i.id.endsWith(':tycka'))).toBe(false);
  });

  it('accepts alternative forms in typed items', () => {
    const items = generateVerbItems(verbs, 'past');
    const saga = items.find((i) => i.id === 'verbs:past-type:säga');
    expect(saga && 'accept' in saga && saga.accept).toEqual(['sade']);
  });
});

describe('adjective generator', () => {
  it('matches the snapshot for three sample rows', () => {
    expect(generateAdjectiveItems(sampleAdj)).toMatchSnapshot();
  });
  it('skips agreement choice items for indeclinable bra (one form) but keeps typed traps and comparison', () => {
    const ids = generateAdjectiveItems(sampleAdj).map((i) => i.id).filter((id) => id.endsWith(':bra'));
    expect(ids).toEqual(['adj:ett-type:bra', 'adj:pl-type:bra', 'adj:comp:bra', 'adj:comp-type:bra', 'adj:sup:bra', 'adj:sup-type:bra']);
  });
});

describe('numbers', () => {
  const t = raw.numbers as never;
  it('writes numbers as one word', () => {
    expect(numberWord(13, t)).toBe('tretton');
    expect(numberWord(30, t)).toBe('trettio');
    expect(numberWord(21, t)).toBe('tjugoett');
    expect(numberWord(100, t)).toBe('hundra');
    expect(numberWord(245, t)).toBe('tvåhundrafyrtiofem');
    expect(numberWord(999, t)).toBe('niohundranittionio');
    expect(numberWord(1000, t)).toBe('tusen');
  });
  it('accepts en and ett variants', () => {
    expect(numberVariants(21, t)).toEqual(['tjugoett', 'tjugoen']);
    expect(numberVariants(101, t)).toEqual(['hundraett', 'hundraen', 'etthundraett', 'etthundraen']);
    expect(numberVariants(11, t)).toEqual(['elva']);
  });
  it('generates number items with stable ids', () => {
    expect(generateNumberItems(t).map((i) => i.id).slice(0, 4)).toEqual([
      'numbers:choice:0',
      'numbers:listen:0',
      'numbers:dictation:0',
      'numbers:type:0',
    ]);
  });
});

describe('days', () => {
  it('produces the three forms for each day', () => {
    const items = generateDayItems(raw.days as never);
    const fri = items.filter((i) => i.id.startsWith('days:') && i.id.endsWith(':fredag') && i.kind === 'choice');
    expect(fri.map((i) => ('answer' in i ? i.answer : ''))).toEqual(['på fredag', 'på fredagar', 'i fredags']);
  });
});

describe('every generated item in the library', () => {
  const generated = [...library.items.values()].filter((i) => /^(nouns|verbs|adj|days|numbers):/.test(i.id));
  it('has the answer exactly once in its options, with no duplicates', () => {
    for (const item of generated) {
      const opts = 'options' in item ? item.options : undefined;
      if (!opts || !('answer' in item)) continue;
      expect(opts.filter((o) => o === item.answer), item.id).toHaveLength(1);
      expect(new Set(opts).size, item.id).toBe(opts.length);
    }
  });
  it('has no unfilled placeholders', () => {
    for (const item of generated) expect(JSON.stringify(item), item.id).not.toMatch(/\{\w+\}/);
  });
});
