/** Shared helpers for the vocab scripts: read/write theme files, make ids, suggest noun forms. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './read-content';

export type ThemeFile = { theme: string; title: string; entries: Record<string, unknown>[] };

export const vocabPath = (theme: string) => join(root, 'content', 'vocab', `${theme}.json`);

export function readTheme(theme: string, title?: string): ThemeFile {
  const p = vocabPath(theme);
  if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8')) as ThemeFile;
  return { theme, title: title ?? theme, entries: [] };
}

export function writeTheme(file: ThemeFile) {
  writeFileSync(vocabPath(file.theme), JSON.stringify(file, null, 2) + '\n');
}

const ascii = (s: string) =>
  s
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/é/g, 'e')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** vocab:<theme>:<slug>, with -2, -3 … if the slug is taken. */
export function newId(file: ThemeFile, sv: string): string {
  const taken = new Set(file.entries.map((e) => String(e.id)));
  const base = `vocab:${file.theme}:${ascii(sv) || 'word'}`;
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

export type NounGuess = { def: string; pl: string; defPl: string; group: number; irregular?: boolean };

/** A first guess from the teacher’s plural rules. Always shown to the learner to confirm or correct. */
export function guessNoun(sv: string, gender: 'en' | 'ett'): NounGuess {
  const vowel = /[aeiouyåäö]$/.test(sv);
  if (gender === 'ett') {
    return vowel
      ? { def: `${sv}t`, pl: `${sv}n`, defPl: `${sv}na`, group: 4 }
      : { def: `${sv}et`, pl: sv, defPl: `${sv}en`, group: 5 };
  }
  if (sv.endsWith('are')) return { def: `${sv}n`, pl: sv, defPl: `${sv.slice(0, -1)}na`, group: 5, irregular: true };
  if (sv.endsWith('a')) return { def: `${sv}n`, pl: `${sv.slice(0, -1)}or`, defPl: `${sv.slice(0, -1)}orna`, group: 1 };
  if (sv.endsWith('e')) return { def: `${sv}n`, pl: `${sv.slice(0, -1)}ar`, defPl: `${sv.slice(0, -1)}arna`, group: 2 };
  if (sv.endsWith('ing')) return { def: `${sv}en`, pl: `${sv}ar`, defPl: `${sv}arna`, group: 2 };
  if (vowel) return { def: `${sv}n`, pl: `${sv}r`, defPl: `${sv}rna`, group: 3 };
  return { def: `${sv}en`, pl: `${sv}ar`, defPl: `${sv}arna`, group: 2 };
}
