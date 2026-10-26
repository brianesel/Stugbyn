import type { Item, Noun, NounTable } from '../schemas';
import { fill, uniq } from './template';

const enPlural = (n: Noun) => n.enPl ?? `${n.en}s`;

/**
 * Turns the noun table into practice items. Ids are derived from the Swedish word
 * (e.g. `nouns:pl:bok`) so saved progress survives rebuilds.
 * Distractors are the noun’s own other forms, so every wrong option is real Swedish.
 */
export function generateNounItems(table: NounTable): Item[] {
  const items: Item[] = [];
  for (const n of table.nouns) {
    if (n.retired || n.draft || n.check) continue;
    const group = table.groups[String(n.group) as keyof NounTable['groups']];
    const vars = {
      art: n.gender,
      sv: n.sv,
      def: n.def,
      pl: n.pl,
      defPl: n.defPl,
      group: n.group,
      ending: group.ending,
      label: group.label,
    };
    const lesson = (type: string) => ({ level: n.level, lesson: table.lessons?.[type] ?? n.lesson });
    const tags = (t: string) => ['nouns', t, ...(n.tags ?? [])];
    const sayPl = fill(table.say.pl, vars);

    items.push(
      {
        ...lesson('gender'),
        id: `nouns:gender:${n.sv}`,
        kind: 'choice',
        ask: 'En or ett?',
        prompt: `___ ${n.sv}`,
        hint: n.en,
        answer: n.gender,
        options: ['en', 'ett'],
        explain: fill(table.explain.gender, vars),
        say: `${n.gender} ${n.sv}`,
        tags: tags('gender'),
      },
      {
        ...lesson('def'),
        id: `nouns:def:${n.sv}`,
        kind: 'choice',
        ask: 'Pick the definite form.',
        prompt: `${n.gender} ${n.sv}`,
        hint: `the ${n.en}`,
        answer: n.def,
        options: uniq([n.def, n.sv, n.pl, n.defPl]),
        explain: fill(table.explain[`def_${n.gender}`], vars),
        say: n.def,
        tags: tags('definite'),
      },
      {
        ...lesson('houses'),
        id: `nouns:houses:${n.sv}`,
        kind: 'houses',
        ask: 'Which plural group?',
        prompt: `${n.gender} ${n.sv}`,
        hint: n.en,
        answer: n.group,
        explain: n.note ?? group.rule,
        say: sayPl,
        tags: tags('group'),
      },
      {
        ...lesson('pl'),
        id: `nouns:pl:${n.sv}`,
        kind: 'choice',
        ask: 'Pick the plural.',
        prompt: `${n.gender} ${n.sv}`,
        hint: enPlural(n),
        answer: n.pl,
        options: uniq([n.pl, n.sv, n.def, n.defPl]),
        explain: n.note ?? fill(table.explain.pl, vars),
        say: sayPl,
        tags: tags('plural'),
      },
      {
        ...lesson('defPl'),
        id: `nouns:defpl:${n.sv}`,
        kind: 'choice',
        ask: 'Pick the definite plural.',
        prompt: `${n.gender} ${n.sv}`,
        hint: `the ${enPlural(n)}`,
        answer: n.defPl,
        options: uniq([n.defPl, n.pl, n.def, n.sv]),
        explain: n.defPlNote ?? fill(table.explain[`defPl_${n.group}`], vars),
        say: n.defPl,
        tags: tags('definite-plural'),
      },
    );
  }
  return items;
}
