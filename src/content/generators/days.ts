import type { DayKind, DaysTable, Item } from '../schemas';
import { fill, fillGap, stableIndex } from './template';

const KINDS: DayKind[] = ['next', 'habit', 'last'];

/** “på fredag” (coming) vs “på fredagar” (every) vs “i fredags” (last). */
export function generateDayItems(table: DaysTable): Item[] {
  const items: Item[] = [];
  for (const d of table.days) {
    const forms = Object.fromEntries(KINDS.map((k) => [k, fill(table.forms[k], { day: d.sv })])) as Record<DayKind, string>;
    for (const k of KINDS) {
      const frame = table.frames[k][stableIndex(d.sv + k, table.frames[k].length)];
      const vars = { day: d.sv, dayEn: d.en };
      const prompt = frame.sv;
      const hint = fill(frame.en, vars);
      const answer = forms[k];
      const say = fillGap(prompt, answer);
      const explain = fill(table.explain[k], vars);
      const base = { level: table.level, lesson: table.lesson, tags: ['days', k] };
      items.push({
        ...base,
        id: `days:${k}:${d.sv}`,
        kind: 'choice',
        ask: 'When?',
        prompt,
        hint,
        answer,
        options: KINDS.map((x) => forms[x]),
        explain,
        say,
      });
      if (k !== 'next') {
        items.push({ ...base, id: `days:${k}-type:${d.sv}`, kind: 'type', ask: 'Type the missing words.', prompt, hint, answer, accept: [], explain, say, boss: true });
      }
    }
  }
  return items;
}
