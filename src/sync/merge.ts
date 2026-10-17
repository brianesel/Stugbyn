import { mergeSaves, normaliseSave, type SaveData } from '../store/save';

/** Combines this device’s save with the one in the account. Pure, so it is easy to test. */
export function mergeWithRemote(local: SaveData, remote: unknown, contentVersion: number): SaveData {
  if (remote === null || remote === undefined) return local;
  const incoming = normaliseSave(remote, contentVersion, 0);
  // Keep device-only flags from this device.
  return { ...mergeSaves(local, incoming), noVoiceNoteSeen: local.noVoiceNoteSeen };
}

/** Whether two saves hold the same progress (ignores the timestamp). */
export function sameProgress(a: SaveData, b: SaveData): boolean {
  return JSON.stringify({ ...a, updatedAt: 0 }) === JSON.stringify({ ...b, updatedAt: 0 });
}
