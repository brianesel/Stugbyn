import { buildLibrary, type Issue, type RawContent } from './library';
import { KnownForms, type Item, type Noun } from './schemas';

const DIACRITIC = /[åäö]/;
const strip = (w: string) => w.replace(/å|ä/g, 'a').replace(/ö/g, 'o');
const words = (text: string) => text.toLowerCase().match(/[a-zåäöéü]+/g) ?? [];

/** Checks the noun’s plural against its group, per the teacher’s rules. */
export function checkNounGroup(n: Noun): string | undefined {
  if (n.irregular) return undefined;
  const ok: Record<number, (pl: string) => boolean> = {
    1: (pl) => pl.endsWith('or'),
    2: (pl) => pl.endsWith('ar'),
    3: (pl) => pl.endsWith('er') || pl.endsWith('r'),
    4: (pl) => pl.endsWith('n'),
    5: (pl) => pl === n.sv,
  };
  return ok[n.group](n.pl) ? undefined : `${n.sv}: plural “${n.pl}” doesn’t match Group ${n.group}`;
}

/** Definite plural adds -na, -a or -en to the plural, unless the noun is listed as irregular. */
export function checkDefPl(n: Noun): string | undefined {
  if (n.irregular) return undefined;
  const ok = [`${n.pl}na`, `${n.pl}a`, `${n.pl}en`].includes(n.defPl);
  return ok ? undefined : `${n.sv}: definite plural “${n.defPl}” doesn’t follow from “${n.pl}” (mark irregular if intended)`;
}

/** Swedish strings in an item that should be spelled correctly (distractor options excluded on purpose). */
function swedishTexts(item: Item): string[] {
  switch (item.kind) {
    case 'choice':
    case 'type':
      return [item.prompt, item.answer, item.say ?? ''];
    case 'houses':
      return [item.prompt, item.say ?? ''];
    case 'order':
      return [item.sentence, ...item.accept];
    case 'match':
      return item.pairs.map((p) => p[0]);
    case 'listen':
      return [item.answer, item.say ?? ''];
    case 'cloze':
      return [item.text, ...item.gaps.map((g) => g.answer)];
  }
}

export type ValidateOptions = { knownForms?: unknown };

export function validateContent(raw: RawContent, opts: ValidateOptions = {}): Issue[] {
  const { library, issues, allItems, allNouns } = buildLibrary(raw);
  const err = (file: string, message: string) => issues.push({ level: 'error', file, message });
  const warn = (file: string, message: string) => issues.push({ level: 'warning', file, message });
  const info = (file: string, message: string) => issues.push({ level: 'info', file, message });

  // Unique ids across the whole library
  const seen = new Map<string, string>();
  const claim = (id: string, file: string) => {
    const prev = seen.get(id);
    if (prev) err(file, `duplicate id “${id}” (also in ${prev})`);
    else seen.set(id, file);
  };
  for (const { noun, file } of allNouns) if (file.includes('grammar/')) claim(noun.id, file);
  for (const theme of library.vocab) for (const e of theme.entries) claim(e.id, theme.file);
  for (const { item, file } of allItems) claim(item.id, file);

  // Items
  for (const { item, file } of allItems) {
    const optionSets: { answer: string; options?: string[] }[] = [];
    if (item.kind === 'choice') optionSets.push(item);
    if (item.kind === 'listen' && item.options) optionSets.push({ answer: item.answer, options: item.options });
    if (item.kind === 'cloze') optionSets.push(...item.gaps);
    for (const { answer, options } of optionSets) {
      if (!options) continue;
      const count = options.filter((o) => o === answer).length;
      if (count !== 1) err(file, `${item.id}: options must contain the answer “${answer}” exactly once (found ${count})`);
      if (new Set(options).size !== options.length) err(file, `${item.id}: duplicate options`);
    }
    if (item.kind === 'choice' && /_{2,}/.test(item.prompt) && !item.hint) err(file, `${item.id}: gap-fill choice items need an English hint`);
    if (item.kind !== 'match' && !item.explain) warn(file, `${item.id}: missing explain line`);
    if ((item.kind === 'choice' || item.kind === 'type') && item.prompt.includes('{')) {
      err(file, `${item.id}: unfilled template placeholder in prompt`);
    }
    if (item.explain?.match(/\{\w+\}/)) err(file, `${item.id}: unfilled template placeholder in explain`);
    if (item.draft) info(file, `${item.id}: draft (hidden in the app)`);
    if (item.check) info(file, `${item.id}: marked "check": true — confirm before shipping`);
  }

  // Nouns
  for (const { noun, file } of allNouns) {
    if (noun.draft) {
      info(file, `${noun.id}: draft (hidden in the app)`);
      continue;
    }
    const g = checkNounGroup(noun);
    if (g) err(file, g);
    const d = checkDefPl(noun);
    if (d) err(file, d);
    if (noun.check) info(file, `${noun.id}: marked "check": true — confirm before shipping`);
  }
  for (const theme of library.vocab) {
    for (const e of theme.entries) {
      if (e.pos !== 'noun' && e.check) info(theme.file, `${e.id}: marked "check": true — confirm before shipping`);
      if (e.pos !== 'noun' && e.draft) info(theme.file, `${e.id}: draft (hidden in the app)`);
    }
  }

  // Verbs: forms must agree with the group (Group IV is irregular by definition)
  const vFile = 'content/grammar/verbs.json';
  for (const v of library.verbs?.verbs ?? []) {
    const bad = (m: string) => err(vFile, `${v.inf}: ${m}`);
    if (v.group === 1 && (v.pres !== v.inf + 'r' || v.past !== v.inf + 'de' || v.sup !== v.inf + 't')) bad('Group I should be -ar, -ade, -at');
    if (v.group === 2 && (!/(de|te)$/.test(v.past) || !v.sup.endsWith('t'))) bad('Group II past should end in -de/-te and supine in -t');
    if (v.group === 3 && (v.pres !== v.inf + 'r' || v.past !== v.inf + 'dde' || v.sup !== v.inf + 'tt')) bad('Group III should be -r, -dde, -tt');
    if (v.object !== null && !v.objectEn) bad('verbs used in frames need objectEn');
  }
  // Adjectives: plural ends in -a (except listed irregulars and indeclinables)
  for (const a of library.adjectives?.adjectives ?? []) {
    if (a.irregular || a.base === a.a) continue;
    if (!a.a.endsWith('a')) err('content/grammar/adjectives.json', `${a.base}: plural “${a.a}” should end in -a`);
    if (!a.t.endsWith('t')) err('content/grammar/adjectives.json', `${a.base}: ett-form “${a.t}” should end in -t`);
  }

  // Rule cards
  for (const r of library.regions) {
    r.ruleCards.forEach((c, i) => {
      if (c.examples.length < 2) err(r.slug, `rule card ${i + 1} needs at least two examples`);
    });
    if (r.items.length === 0) warn(r.slug, `region “${r.id}” has no playable items`);
  }

  // Diacritics: warn when a word looks like a known å/ä/ö word typed without its marks
  const knownWords = new Set<string>();
  const add = (s?: string) => s && words(s).forEach((w) => knownWords.add(w));
  for (const { noun } of allNouns) [noun.sv, noun.def, noun.pl, noun.defPl].forEach(add);
  for (const v of library.verbs?.verbs ?? []) [v.inf, v.pres, v.past, v.sup, ...v.also.past, ...v.also.sup].forEach(add);
  for (const a of library.adjectives?.adjectives ?? []) [a.base, a.t, a.a, a.def, a.comp ?? '', a.sup ?? ''].forEach(add);
  for (const t of library.vocab) for (const e of t.entries) add(e.sv);
  const allowed = new Set(Array.isArray(raw.allowedWords) ? (raw.allowedWords as unknown[]).map(String) : []);
  const marked = new Map<string, string>();
  for (const w of knownWords) if (DIACRITIC.test(w)) marked.set(strip(w), w);

  const checkText = (text: string, file: string, where: string) => {
    for (const w of words(text)) {
      if (DIACRITIC.test(w) || knownWords.has(w) || allowed.has(w)) continue;
      const near = marked.get(w);
      if (near) warn(file, `${where}: “${w}” — did you mean “${near}”?`);
    }
  };
  // Deck items are generated from vocab entries (and mix in English), so check the entries themselves instead.
  for (const { item, file } of allItems) {
    if (item.tags?.includes('deck')) continue;
    for (const t of swedishTexts(item)) checkText(t, file, item.id);
  }
  for (const t of library.vocab) for (const e of t.entries) checkText(e.sv, t.file, e.id);
  for (const r of library.regions) {
    for (const c of r.ruleCards) for (const ex of c.examples) ex.slice(0, -1).forEach((t) => checkText(t, r.slug, c.title));
  }
  for (const t of library.vocab) for (const e of t.entries) if (e.example) checkText(e.example.sv, t.file, e.id);

  // Known-forms fixture: generator output must not drift
  if (opts.knownForms !== undefined) {
    const kf = KnownForms.safeParse(opts.knownForms);
    if (!kf.success) err('content/fixtures/known-forms.json', kf.error.message);
    else {
      for (const { id, answer } of kf.data.items) {
        const item = library.items.get(id);
        if (!item) err('content/fixtures/known-forms.json', `${id}: item not found`);
        else if (!('answer' in item) || item.answer !== answer) {
          err('content/fixtures/known-forms.json', `${id}: expected “${answer}”, generator gives “${'answer' in item ? item.answer : '?'}”`);
        }
      }
    }
  }

  return issues;
}
