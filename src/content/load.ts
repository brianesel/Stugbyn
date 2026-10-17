/** Loads all content at build time via Vite globs. Adding a JSON file needs no code change. */
import { buildLibrary, type Library } from './library';

const single = import.meta.glob(['/content/*.json', '/content/grammar/*.json'], { eager: true, import: 'default' });
const file = (path: string) => single[`/content/${path}`];

const result = buildLibrary({
  version: file('version.json'),
  ui: file('ui.json'),
  nouns: file('grammar/nouns.json'),
  verbs: file('grammar/verbs.json'),
  adjectives: file('grammar/adjectives.json'),
  days: file('grammar/days.json'),
  numbers: file('grammar/numbers.json'),
  regions: import.meta.glob('/content/regions/*/region.json', { eager: true, import: 'default' }),
  regionItems: import.meta.glob('/content/regions/*/items.json', { eager: true, import: 'default' }),
  vocab: import.meta.glob('/content/vocab/*.json', { eager: true, import: 'default' }),
});

if (import.meta.env.DEV) {
  for (const i of result.issues) console.warn(`[content] ${i.file}: ${i.message}`);
}

export const library: Library = result.library;

/** Recorded audio overrides: content/audio/<item-id>.mp3, with ":" written as "__" in file names. */
const audioFiles = import.meta.glob('/content/audio/**/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<
  string,
  string
>;
export const recordedAudio = new Map(
  Object.entries(audioFiles).map(([path, url]) => [
    path.replace(/^\/content\/audio\//, '').replace(/\.mp3$/, '').replace(/__/g, ':'),
    url,
  ]),
);
