import { applyAnswer, defaultSave, type SaveData } from '../store/save';
import { mergeWithRemote, sameProgress } from './merge';

const DAY = 86_400_000;

function playedSave(at: number, items: string[], settings: Partial<SaveData['settings']> = {}): SaveData {
  let s = defaultSave(1, at);
  for (const id of items) s = applyAnswer(s, id, true, 10, at, true);
  return { ...s, settings: { ...s.settings, ...settings } };
}

describe('mergeWithRemote', () => {
  it('a fresh device takes everything from the account, including settings', () => {
    const fresh = defaultSave(1, 5 * DAY);
    const remote = playedSave(DAY, ['a', 'b'], { dailyGoal: 100, theme: 'dark' });
    const merged = mergeWithRemote(fresh, JSON.parse(JSON.stringify(remote)), 1);
    expect(Object.keys(merged.items).sort()).toEqual(['a', 'b']);
    expect(merged.settings.dailyGoal).toBe(100);
    expect(merged.settings.theme).toBe('dark');
    expect(merged.xp).toBe(20);
  });

  it('combines items answered on two devices, keeping the latest answer per item', () => {
    const phone = playedSave(2 * DAY, ['a', 'shared']);
    const laptop = playedSave(DAY, ['b', 'shared']);
    const merged = mergeWithRemote(phone, laptop, 1);
    expect(Object.keys(merged.items).sort()).toEqual(['a', 'b', 'shared']);
    expect(merged.items.shared.lastAnswer).toBe(2 * DAY);
  });

  it('keeps this device’s voice note flag', () => {
    const local = { ...defaultSave(1, 0), noVoiceNoteSeen: true };
    expect(mergeWithRemote(local, { ...defaultSave(1, 0), noVoiceNoteSeen: false }, 1).noVoiceNoteSeen).toBe(true);
  });

  it('returns the local save when the account is empty', () => {
    const local = playedSave(DAY, ['a']);
    expect(mergeWithRemote(local, null, 1)).toBe(local);
  });

  it('merging the same save again changes nothing', () => {
    const local = playedSave(DAY, ['a', 'b']);
    const once = mergeWithRemote(local, local, 1);
    expect(sameProgress(once, local)).toBe(true);
  });
});
