/** Replaces {key} placeholders. Unknown keys are left in place so the validator can spot them. */
export function fill(template: string, vars: Record<string, string | number | undefined>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (vars[key] !== undefined ? String(vars[key]) : m));
}

export function uniq<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/** Deterministic index from a string, so the same word always gets the same frame (stable content). */
export function stableIndex(key: string, n: number): number {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return n === 0 ? 0 : h % n;
}

export const fillGap = (frame: string, answer: string) => frame.replace(/_{2,}/, answer);
