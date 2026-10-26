import type { ItemKind } from '../content/schemas';

/** Exercise types with a component so far. Items of other kinds stay in the content but aren’t served yet. */
export const PLAYABLE_KINDS: ReadonlySet<ItemKind> = new Set<ItemKind>(['choice', 'houses', 'type', 'order', 'listen', 'match']);
