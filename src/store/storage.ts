import { get, set, del } from 'idb-keyval';

const KEY = 'stugbyn:save';

function lsGet(): unknown {
  try {
    const s = localStorage.getItem(KEY);
    return s ? JSON.parse(s) : undefined;
  } catch {
    return undefined;
  }
}

/** IndexedDB first, localStorage as fallback (private modes, old browsers). */
export async function readSave(): Promise<unknown> {
  try {
    const v = await get(KEY);
    if (v !== undefined) return v;
  } catch {
    /* fall through */
  }
  return lsGet();
}

export async function writeSave(data: unknown): Promise<void> {
  try {
    await set(KEY, data);
    return;
  } catch {
    /* fall through */
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable: progress lives only in memory */
  }
}

export async function clearSave(): Promise<void> {
  try {
    await del(KEY);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
