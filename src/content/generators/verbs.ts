import type { Frame, Item, Verb, VerbTable } from '../schemas';
import { fill, fillGap, stableIndex, uniq } from './template';

export type VerbDrill = 'present' | 'past' | 'perfect';

/**
 * Verb items in sentence frames. Distractors are the verb’s own other forms
 * (infinitive, present, past, supine), so every wrong option is real Swedish.
 */
export function generateVerbItems(table: VerbTable, drill: VerbDrill): Item[] {
  const items: Item[] = [];
  const pick = (frames: Frame[], v: Verb, salt = '') => frames[stableIndex(v.inf + salt, frames.length)];

  for (const v of table.verbs) {
    if (v.retired || v.draft || v.check) continue;
    const vars = {
      inf: v.inf,
      pres: v.pres,
      past: v.past,
      sup: v.sup,
      en: v.en,
      en3: v.en3,
      enPast: v.enPast,
      enPp: v.enPp,
      object: v.object ?? undefined,
      objectEn: v.objectEn,
      time: v.time ?? table.defaultTime.sv,
      timeEn: v.timeEn ?? table.defaultTime.en,
    };
    const base = { level: v.level, lesson: table.lessons?.[drill] ?? v.lesson, fun: v.fun };
    const tags = (t: string) => ['verbs', t, `group-${v.group}`, ...(v.tags ?? [])];
    const note = v.note ? ` ${v.note}` : '';
    const forms = [v.inf, v.pres, v.past, v.sup];
    const framed = v.object !== null;

    // A sentence frame item (choice + typed boss twin), or a bare “köpa → ___” item for verbs without a frame.
    const add = (
      key: 'help' | 'pres' | 'past' | 'sup',
      answer: string,
      accept: string[],
      frame: Frame | null,
      bareHint: string,
      explain: string,
      ask: string,
      typeAsk: string,
    ) => {
      const prompt = frame ? fill(frame.sv, vars) : fill(table.frames.bare.sv, vars);
      const hint = frame ? fill(frame.en, vars) : bareHint;
      const say = frame ? fillGap(prompt, answer) : `${v.inf}, ${answer}`;
      items.push(
        {
          ...base,
          id: `verbs:${key}:${v.inf}`,
          kind: 'choice',
          ask,
          prompt,
          hint,
          answer,
          options: uniq([answer, ...forms]),
          explain,
          say,
          tags: tags(key),
        },
        {
          ...base,
          id: `verbs:${key}-type:${v.inf}`,
          kind: 'type',
          ask: typeAsk,
          prompt,
          hint,
          answer,
          accept,
          explain,
          say,
          boss: true,
          tags: tags(key),
        },
      );
    };

    if (drill === 'present' && framed && !v.noHelp) {
      const help = pick(table.frames.help, v);
      const helpWord = help.sv.split(' ')[1];
      add('help', v.inf, [], help, '', fill(table.explain.help, { ...vars, help: helpWord }), 'Pick the right verb form.', 'Type the missing verb.');
    }
    if (drill === 'present' && framed) {
      add('pres', v.pres, [], pick(table.frames.present, v), '', fill(table.explain.present, vars), 'Pick the right verb form.', 'Type the missing verb.');
    }
    if (drill === 'past') {
      add(
        'past',
        v.past,
        v.also.past,
        framed ? pick(table.frames.past, v) : null,
        `${v.en} → ${v.enPast} (past)`,
        fill(table.explain[`past_${v.group}`], vars) + note,
        'Pick the past form.',
        `Type the past form of ${v.inf}.`,
      );
    }
    if (drill === 'perfect') {
      add(
        'sup',
        v.sup,
        v.also.sup,
        framed ? pick(table.frames.perfect, v) : null,
        `${v.en} → (have) ${v.enPp}`,
        fill(table.explain[`sup_${v.group}`], vars) + note,
        'Pick the supine (har + ___).',
        `Type the supine of ${v.inf}.`,
      );
    }
  }
  return items;
}
