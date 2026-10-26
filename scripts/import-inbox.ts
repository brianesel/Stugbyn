/**
 * npm run import-inbox
 * Reads content/inbox/<theme>.txt files with one “sv;en” pair per line and appends draft entries
 * to content/vocab/<theme>.json. Drafts are hidden in the app until gender and forms are filled in
 * and "draft": true is removed. Processed files move to content/inbox/done/.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './read-content';
import { newId, readTheme, writeTheme } from './vocab-files';

const inbox = join(root, 'content', 'inbox');
if (!existsSync(inbox)) {
  console.log('No content/inbox folder. Create it and add files like content/inbox/food.txt with lines “sv;en”.');
  process.exit(0);
}
const files = readdirSync(inbox).filter((f) => f.endsWith('.txt'));
if (files.length === 0) console.log('Inbox is empty.');

for (const name of files) {
  const theme = name.replace(/\.txt$/, '');
  const file = readTheme(theme);
  const known = new Set(file.entries.map((e) => String(e.sv).toLowerCase()));
  let added = 0;
  for (const raw of readFileSync(join(inbox, name), 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [svRaw, en = ''] = line.split(/[;\t]/).map((s) => s.trim());
    const m = /^(en|ett)\s+(.+)$/i.exec(svRaw);
    const sv = m ? m[2] : svRaw;
    if (known.has(sv.toLowerCase())) continue;
    known.add(sv.toLowerCase());
    const entry: Record<string, unknown> = {
      id: newId(file, sv),
      sv,
      en,
      pos: m ? 'noun' : sv.includes(' ') ? 'phrase' : 'other',
      level: 'A1',
      draft: true,
    };
    if (m) entry.gender = m[1].toLowerCase();
    file.entries.push(entry);
    added++;
  }
  writeTheme(file);
  mkdirSync(join(inbox, 'done'), { recursive: true });
  renameSync(join(inbox, name), join(inbox, 'done', `${theme}-${new Date().toISOString().slice(0, 10)}.txt`));
  console.log(`${theme}: ${added} draft entries added to content/vocab/${theme}.json`);
}
console.log('\nNext: open the theme file, fill in pos, gender, forms and group for each draft, remove "draft": true, run npm run validate.');
