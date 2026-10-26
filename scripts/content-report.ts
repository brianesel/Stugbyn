/**
 * npm run content-report            counts per theme, level, lesson and region, plus drafts and check flags
 * npm run content-report -- --new   only entries added since the last git tag named content-release-*
 */
import { execSync } from 'node:child_process';
import { buildLibrary } from '../src/content/library';
import type { VocabEntry } from '../src/content/schemas';
import { readContent, root } from './read-content';

const { library } = buildLibrary(readContent());
const all: { theme: string; e: VocabEntry }[] = library.vocab.flatMap((t) => t.entries.map((e) => ({ theme: t.theme, e })));

const count = <T,>(xs: T[], key: (x: T) => string) =>
  [...xs.reduce((m, x) => m.set(key(x), (m.get(key(x)) ?? 0) + 1), new Map<string, number>())].sort(([a], [b]) =>
    a.localeCompare(b, 'sv', { numeric: true }),
  );
const table = (title: string, rows: [string, number][]) => {
  console.log(`\n${title}`);
  for (const [k, n] of rows) console.log(`  ${k.padEnd(28)} ${n}`);
};

if (process.argv.includes('--new')) {
  let tag = '';
  try {
    tag = execSync('git describe --tags --abbrev=0 --match "content-release-*"', { cwd: root }).toString().trim();
  } catch {
    console.log('No content-release-* tag yet: every entry counts as new. Tag a release with: git tag content-release-1');
  }
  const old = new Set<string>();
  if (tag) {
    for (const t of library.vocab) {
      try {
        const json = JSON.parse(execSync(`git show ${tag}:${t.file.replace(/^\//, '')}`, { cwd: root }).toString());
        for (const e of json.entries ?? []) old.add(e.id);
      } catch {
        /* theme file is new since the tag */
      }
    }
  }
  const fresh = all.filter(({ e }) => !old.has(e.id));
  console.log(`\nEntries added since ${tag || 'the beginning'}: ${fresh.length}\n`);
  for (const { theme, e } of fresh) {
    const forms = e.forms ? ` (${[e.forms.def, e.forms.pl, e.forms.defPl].filter(Boolean).join(', ')}; group ${e.group ?? '-'})` : '';
    const flags = [e.draft && 'DRAFT', e.check && 'CHECK'].filter(Boolean).join(' ');
    console.log(`  ${theme.padEnd(12)} ${e.gender ? e.gender + ' ' : ''}${e.sv}${forms} = ${e.en} ${flags}`);
  }
  process.exit(0);
}

table('Words per theme', library.vocab.map((t) => [`${t.title} (${t.theme})`, t.entries.length]));
table('Words per level', count(all, (x) => x.e.level));
table('Words per lesson', count(all, (x) => (x.e.lesson ? `lesson ${x.e.lesson}` : 'no lesson')));
table('Words per part of speech', count(all, (x) => x.e.pos));
table('YKI topic coverage', count(all.flatMap((x) => (x.e.tags ?? []).filter((t) => t.startsWith('yki-')).map((t) => ({ t }))), (x) => x.t));
table(
  'Grammar regions (playable items)',
  library.regions.map((r) => [r.name, r.items.length]),
);
const drafts = all.filter((x) => x.e.draft);
const checks = all.filter((x) => x.e.check);
console.log(`\nDrafts (hidden until finished): ${drafts.length}`);
for (const { theme, e } of drafts) console.log(`  ${theme}: ${e.sv} = ${e.en}`);
console.log(`\nMarked "check" (hidden until confirmed): ${checks.length}`);
for (const { theme, e } of checks) console.log(`  ${theme}: ${e.sv} ${e.note ? `— ${e.note}` : ''}`);
