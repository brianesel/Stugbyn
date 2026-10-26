/**
 * npm run validate — checks every content file. Exits non-zero on errors or warnings
 * (the definition of done asks for a clean run). Info lines (drafts, "check" flags) don’t fail.
 */
import { buildLibrary } from '../src/content/library';
import { validateContent } from '../src/content/validate';
import { readContent, readKnownForms } from './read-content';

const raw = readContent();
const issues = validateContent(raw, { knownForms: readKnownForms() });
const { library } = buildLibrary(raw);

const icon = { error: '✗', warning: '!', info: '·' } as const;
for (const i of issues) console.log(`${icon[i.level]} [${i.level}] ${i.file}: ${i.message}`);

const errors = issues.filter((i) => i.level === 'error').length;
const warnings = issues.filter((i) => i.level === 'warning').length;
const playable = library.regions.reduce((n, r) => n + r.items.length, 0);

console.log(
  `\nContent v${library.version}: ${library.regions.length} region(s), ${playable} playable items, ` +
    `${library.nouns.nouns.length} nouns, ${library.decks.reduce((n, d) => n + d.entries.length, 0)} words in ${library.decks.length} decks (${library.decks.reduce((n, d) => n + d.items.length, 0)} deck items).`,
);
console.log(`${errors} error(s), ${warnings} warning(s).`);
process.exit(errors + warnings > 0 ? 1 : 0);
