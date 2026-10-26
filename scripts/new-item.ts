/**
 * npm run new-item -- --theme food
 * Asks for each field, suggests noun forms from the plural rules, appends a valid entry and validates it.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { validateContent } from '../src/content/validate';
import { readContent } from './read-content';
import { guessNoun, newId, readTheme, writeTheme } from './vocab-files';

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

const rl = createInterface({ input: stdin, output: stdout });
const ask = async (q: string, def = '') => (await rl.question(def ? `${q} [${def}]: ` : `${q}: `)).trim() || def;

const theme = arg('theme') ?? (await ask('Theme (file name in content/vocab, e.g. food)'));
const file = readTheme(theme, theme === arg('theme') ? undefined : await ask('Swedish title for this new theme', theme));
console.log(`\nAdding to content/vocab/${theme}.json (${file.entries.length} entries). Leave a field empty to accept the [default].\n`);

let more = true;
while (more) {
  const sv = await ask('Swedish (nouns without en/ett, verbs in the infinitive)');
  const en = await ask('English');
  const posKey = await ask('Part of speech: n(oun), v(erb), a(djective), adv(erb), p(hrase), o(ther)', sv.includes(' ') ? 'p' : 'n');
  const pos = ({ n: 'noun', v: 'verb', a: 'adjective', adv: 'adverb', p: 'phrase', o: 'other' } as const)[posKey as 'n'] ?? 'other';
  const level = await ask('Level (A1, A2, B1)', 'A1');
  const lesson = Number(await ask('Lesson number', String(arg('lesson') ?? ''))) || undefined;
  const entry: Record<string, unknown> = { id: newId(file, sv), sv, en, pos, level, ...(lesson ? { lesson } : {}) };

  if (pos === 'noun') {
    const gender = (await ask('en or ett', 'en')) as 'en' | 'ett';
    entry.gender = gender;
    if ((await ask('Countable? (y/n)', 'y')) === 'n') {
      entry.countable = false;
      entry.forms = { def: await ask('Definite form', guessNoun(sv, gender).def) };
    } else {
      const g = guessNoun(sv, gender);
      const def = await ask('Definite (the …)', g.def);
      const pl = await ask('Plural', g.pl);
      const defPl = await ask('Definite plural', pl === g.pl ? g.defPl : '');
      const group = Number(await ask('Plural group 1–5', String(g.group)));
      entry.forms = { def, pl, defPl };
      entry.group = group;
      if (g.irregular && pl === g.pl && defPl === g.defPl) entry.irregular = true;
      if ((await ask('Are you sure of these forms? (y = yes, n = mark "check" for the teacher)', 'y')) === 'n') entry.check = true;
    }
  }
  const tags = await ask('Tags, comma separated (e.g. yki-housing)', '');
  if (tags) entry.tags = tags.split(',').map((t) => t.trim()).filter(Boolean);

  file.entries.push(entry);
  writeTheme(file);
  const issues = validateContent(readContent()).filter((i) => i.message.includes(String(entry.id)) || i.message.startsWith(`${sv}:`));
  if (issues.length) for (const i of issues) console.log(`  ${i.level}: ${i.message}`);
  else console.log(`  ✓ added ${entry.id}`);
  more = (await ask('\nAdd another? (y/n)', 'y')) === 'y';
}
rl.close();
console.log('\nDone. Run npm run validate, then npm run dev to see the words in the Word bank.');
