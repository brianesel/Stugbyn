/**
 * Content migrations. When an item id is renamed on purpose, add `oldId: newId` here so saved
 * progress follows the item. Bump content/version.json at the same time.
 */
export const idRenames: Record<string, string> = {};

/** Moves progress from renamed ids to their new ids. Never overwrites existing progress; unknown ids are kept. */
export function migrateItemIds<T>(items: Record<string, T>, renames: Record<string, string> = idRenames): Record<string, T> {
  const out = { ...items };
  for (const [from, to] of Object.entries(renames)) {
    // Follow chains (a → b → c) so very old saves end up on the newest id.
    let target = to;
    const visited = new Set([from]);
    while (renames[target] && !visited.has(target)) {
      visited.add(target);
      target = renames[target];
    }
    if (from in out && !(target in out)) out[target] = out[from];
    if (from in out) delete out[from];
  }
  return out;
}
