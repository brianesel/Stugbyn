import type { Adjective, AdjectiveTable, Frame, Item } from '../schemas';
import { fill, fillGap, uniq } from './template';

/** Agreement (en / ett / plural / definite) and comparison frames for each adjective. */
export function generateAdjectiveItems(table: AdjectiveTable): Item[] {
  const items: Item[] = [];
  for (const a of table.adjectives) {
    if (a.retired || a.draft || a.check) continue;
    // Only the string fields are template variables.
    const vars = Object.fromEntries(Object.entries(a).filter(([, v]) => typeof v === 'string')) as Record<string, string>;
    const note = a.note ? ` ${a.note}` : '';
    const agreement = uniq([a.base, a.t, a.a, a.def]);

    const add = (key: string, frame: Frame, answer: string, options: string[], explainKey: string, boss: boolean, ask: string) => {
      const prompt = fill(frame.sv, vars);
      const hint = fill(frame.en, vars);
      const say = fillGap(prompt, answer);
      const explain = fill(table.explain[explainKey], vars) + note;
      const tags = ['adjectives', explainKey, ...(a.tags ?? [])];
      const base = { level: a.level, lesson: table.lessons?.[explainKey] ?? a.lesson, fun: a.fun };
      if (options.length >= 2) {
        items.push({ ...base, id: `adj:${key}:${a.base}`, kind: 'choice', ask, prompt, hint, answer, options, explain, say, tags });
      }
      if (boss) {
        items.push({
          ...base,
          id: `adj:${key}-type:${a.base}`,
          kind: 'type',
          ask: `Type the right form of ${a.base}.`,
          prompt,
          hint,
          answer,
          accept: [],
          explain,
          say,
          boss: true,
          tags,
        });
      }
    };

    const ask = 'Pick the right form of the adjective.';
    add('en', table.frames.en, a.base, agreement, 'en', false, ask);
    add('ett', table.frames.ett, a.t, agreement, 'ett', true, ask);
    add('pl', table.frames.pl, a.a, agreement, 'pl', true, ask);
    add('def', table.frames.def, a.def, agreement, 'def', a.def !== a.a, ask);
    if (a.comp && a.sup) {
      const comparison = uniq([a.comp, a.sup, a.base, a.a]);
      add('comp', a.compFrame ?? table.frames.comp, a.comp, comparison, 'comp', true, 'Pick the comparative.');
      add('sup', a.supFrame ?? table.frames.sup, a.sup, uniq([a.sup, a.comp, a.base, a.a]), 'sup', true, 'Pick the superlative.');
    }
  }
  return items;
}

export type { Adjective };
