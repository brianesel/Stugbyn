/** The saved progress format and the pure functions that change it. No React, no storage. */
import { migrateItemIds } from '../content/migrations';
import { leitner, type ItemProgress, type Scheduler } from '../engine/srs';

export type Theme = 'system' | 'light' | 'dark';
export type SpeechRate = 0.7 | 0.9 | 1;

export type Settings = {
  theme: Theme;
  autoAdvance: boolean;
  dailyGoal: number;
  rate: SpeechRate;
  /** Latest class lesson reached; highlights the matching region and unlocks later ones. */
  lessonReached: number;
};

export type Streak = {
  count: number;
  best: number;
  /** Local date (YYYY-MM-DD) of the last completed session. */
  last: string | null;
  /** ISO week (YYYY-Www) in which the free “lagom day” was last used. */
  lagomWeek: string | null;
};

export type SaveData = {
  format: 1;
  contentVersion: number;
  items: Record<string, ItemProgress>;
  xp: number;
  daily: { date: string; xp: number };
  streak: Streak;
  settings: Settings;
  noVoiceNoteSeen: boolean;
  /** Region id → time the boss was first beaten. */
  bosses: Record<string, number>;
  updatedAt: number;
};

export const BOSS_WIN_XP = 50;

export const DEFAULT_SETTINGS: Settings = { theme: 'system', autoAdvance: false, dailyGoal: 50, rate: 0.9, lessonReached: 17 };

export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const addDays = (key: string, n: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n).getTime());
};

export function isoWeek(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function defaultSave(contentVersion: number, now: number): SaveData {
  return {
    format: 1,
    contentVersion,
    items: {},
    xp: 0,
    daily: { date: dayKey(now), xp: 0 },
    streak: { count: 0, best: 0, last: null, lagomWeek: null },
    settings: { ...DEFAULT_SETTINGS },
    noVoiceNoteSeen: false,
    bosses: {},
    // 0 = untouched, so a fresh device never wins a merge against real progress.
    updatedAt: 0,
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Accepts anything (old saves, imports) and returns a complete, migrated save. Unknown item ids are kept. */
export function normaliseSave(raw: unknown, contentVersion: number, now: number): SaveData {
  const base = defaultSave(contentVersion, now);
  if (!isObj(raw)) return base;
  const items: Record<string, ItemProgress> = {};
  if (isObj(raw.items)) {
    for (const [id, p] of Object.entries(raw.items)) {
      if (isObj(p) && typeof p.box === 'number' && typeof p.due === 'number') items[id] = p as ItemProgress;
    }
  }
  return {
    ...base,
    xp: typeof raw.xp === 'number' ? raw.xp : 0,
    daily: isObj(raw.daily) ? { ...base.daily, ...(raw.daily as SaveData['daily']) } : base.daily,
    streak: isObj(raw.streak) ? { ...base.streak, ...(raw.streak as Partial<Streak>) } : base.streak,
    settings: isObj(raw.settings) ? { ...DEFAULT_SETTINGS, ...(raw.settings as Partial<Settings>) } : base.settings,
    noVoiceNoteSeen: raw.noVoiceNoteSeen === true,
    bosses: isObj(raw.bosses) ? (raw.bosses as Record<string, number>) : {},
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
    items: migrateItemIds(items),
  };
}

export function applyAnswer(
  save: SaveData,
  itemId: string,
  correct: boolean,
  xp: number,
  now: number,
  updateSrs: boolean,
  scheduler: Scheduler = leitner,
): SaveData {
  const today = dayKey(now);
  const daily = save.daily.date === today ? save.daily : { date: today, xp: 0 };
  return {
    ...save,
    items: updateSrs ? { ...save.items, [itemId]: scheduler.review(save.items[itemId], correct, now) } : save.items,
    xp: save.xp + xp,
    daily: { date: today, xp: daily.xp + xp },
    updatedAt: now,
  };
}

/** A won boss battle: +50 XP and the region’s boss decoration (first win time is kept). */
export function applyBossWin(save: SaveData, regionId: string, now: number): SaveData {
  const s = applyAnswer(save, `boss:${regionId}`, true, BOSS_WIN_XP, now, false);
  return { ...s, bosses: { ...save.bosses, [regionId]: save.bosses[regionId] ?? now } };
}

/** +1 per calendar day with a completed session; one free missed day (“lagom day”) per week. */
export function applySessionComplete(save: SaveData, now: number): SaveData {
  const today = dayKey(now);
  const s = save.streak;
  if (s.last === today) return save;
  const yesterday = addDays(today, -1);
  let { count, lagomWeek } = s;
  if (s.last === yesterday) count += 1;
  else if (s.last === addDays(today, -2) && lagomWeek !== isoWeek(yesterday)) {
    count += 1;
    lagomWeek = isoWeek(yesterday);
  } else count = 1;
  return { ...save, streak: { count, best: Math.max(s.best, count), last: today, lagomWeek }, updatedAt: now };
}

/** The streak as it stands today (0 if it has lapsed). */
export function currentStreak(save: SaveData, now: number): number {
  const s = save.streak;
  if (!s.last) return 0;
  const today = dayKey(now);
  const yesterday = addDays(today, -1);
  if (s.last === today || s.last === yesterday) return s.count;
  if (s.last === addDays(today, -2) && s.lagomWeek !== isoWeek(yesterday)) return s.count;
  return 0;
}

export function dailyXp(save: SaveData, now: number): number {
  return save.daily.date === dayKey(now) ? save.daily.xp : 0;
}

/** Merges an imported save: per item, keep the record with the later lastAnswer. */
export function mergeSaves(current: SaveData, incoming: SaveData): SaveData {
  const items = { ...current.items };
  for (const [id, p] of Object.entries(incoming.items)) {
    const mine = items[id];
    if (!mine || (p.lastAnswer ?? 0) > (mine.lastAnswer ?? 0)) items[id] = p;
  }
  const newer = incoming.updatedAt > current.updatedAt ? incoming : current;
  return {
    ...current,
    items,
    xp: Math.max(current.xp, incoming.xp),
    bosses: { ...incoming.bosses, ...current.bosses },
    streak: (incoming.streak.last ?? '') > (current.streak.last ?? '') ? incoming.streak : current.streak,
    daily: newer.daily,
    settings: newer.settings,
    updatedAt: Math.max(current.updatedAt, incoming.updatedAt),
  };
}
