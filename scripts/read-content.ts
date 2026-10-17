import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { RawContent } from '../src/content/library';

export const root = join(import.meta.dirname, '..');
const contentDir = join(root, 'content');

const readJson = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new Error(`${relative(root, path)}: invalid JSON (${(e as Error).message})`);
  }
};

const rel = (path: string) => relative(root, path).split('\\').join('/');

function jsonFilesIn(dir: string): Record<string, unknown> {
  if (!existsSync(dir)) return {};
  const out: Record<string, unknown> = {};
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    out[rel(join(dir, name))] = readJson(join(dir, name));
  }
  return out;
}

/** Reads content/ from disk into the same shape the app gets from import.meta.glob. */
export function readContent(): RawContent {
  const regions: Record<string, unknown> = {};
  const regionItems: Record<string, unknown> = {};
  const regionsDir = join(contentDir, 'regions');
  for (const slug of readdirSync(regionsDir).sort()) {
    const r = join(regionsDir, slug, 'region.json');
    const i = join(regionsDir, slug, 'items.json');
    if (existsSync(r)) regions[rel(r)] = readJson(r);
    if (existsSync(i)) regionItems[rel(i)] = readJson(i);
  }
  return {
    version: readJson(join(contentDir, 'version.json')),
    ui: readJson(join(contentDir, 'ui.json')),
    nouns: readJson(join(contentDir, 'grammar', 'nouns.json')),
    verbs: readJson(join(contentDir, 'grammar', 'verbs.json')),
    adjectives: readJson(join(contentDir, 'grammar', 'adjectives.json')),
    days: readJson(join(contentDir, 'grammar', 'days.json')),
    numbers: readJson(join(contentDir, 'grammar', 'numbers.json')),
    allowedWords: readJson(join(contentDir, 'allowed-words.json')),
    regions,
    regionItems,
    vocab: jsonFilesIn(join(contentDir, 'vocab')),
  };
}

export function readKnownForms(): unknown {
  return readJson(join(contentDir, 'fixtures', 'known-forms.json'));
}
