import type { Item } from '../content/schemas';

/** What an exercise component hands back: a string/number for one answer, an array for cloze, a boolean for match. */
export type Answer = string | number | boolean | string[];

export type GradeNote = 'almost' | 'diacritics';

export type GradeResult = {
  correct: boolean;
  /** The full correct Swedish, with any gap filled. */
  expected: string;
  explain?: string;
  /** Extra feedback for typed answers that were close. Both still count as wrong. */
  note?: GradeNote;
};

/** Trim, collapse spaces, lowercase, strip final punctuation. Never folds å/ä/ö. */
export function normalise(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[.!?,;:…]+$/u, '')
    .trim();
}

const foldDiacritics = (s: string) => s.replace(/[åä]/g, 'a').replace(/ö/g, 'o');

/** Edit distance, capped: returns early once it exceeds `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

export function gradeTyped(input: string, accepted: string[]): { correct: boolean; note?: GradeNote } {
  const n = normalise(input);
  const targets = accepted.map(normalise);
  if (targets.includes(n)) return { correct: true };
  if (targets.some((t) => foldDiacritics(t) === foldDiacritics(n))) return { correct: false, note: 'diacritics' };
  if (targets.some((t) => t.length > 5 && editDistance(t, n, 1) === 1)) return { correct: false, note: 'almost' };
  return { correct: false };
}

const tokens = (s: string) => normalise(s).replace(/[.!?,;:…]/g, '').split(' ').filter(Boolean).join(' ');

export const fillGap = (prompt: string, answer: string) => prompt.replace(/_{2,}/, answer);

export function expectedText(item: Item): string {
  if (item.say) return item.say;
  switch (item.kind) {
    case 'choice':
    case 'type':
      return fillGap(item.prompt, item.answer);
    case 'houses':
      return item.prompt;
    case 'order':
      return item.sentence;
    case 'match':
      return item.pairs.map((p) => p[0]).join(', ');
    case 'listen':
      return item.answer;
    case 'cloze': {
      let i = 0;
      return item.text.replace(/\{\{[^}]*\}\}/g, () => item.gaps[i++]?.answer ?? '');
    }
  }
}

export function grade(item: Item, answer: Answer): GradeResult {
  const base = { expected: expectedText(item), explain: item.explain };
  switch (item.kind) {
    case 'choice':
      return { ...base, correct: answer === item.answer };
    case 'houses':
      return { ...base, correct: Number(answer) === item.answer };
    case 'type':
      return { ...base, ...gradeTyped(String(answer), [item.answer, ...item.accept]) };
    case 'listen':
      return item.options
        ? { ...base, correct: answer === item.answer }
        : { ...base, ...gradeTyped(String(answer), [item.answer, ...item.accept]) };
    case 'order':
      return { ...base, correct: [item.sentence, ...item.accept].map(tokens).includes(tokens(String(answer))) };
    case 'match':
      return { ...base, correct: answer === true };
    case 'cloze': {
      const given = Array.isArray(answer) ? answer : [];
      const correct = item.gaps.every((g, i) => gradeTyped(given[i] ?? '', [g.answer, ...g.accept]).correct);
      return { ...base, correct };
    }
  }
}
