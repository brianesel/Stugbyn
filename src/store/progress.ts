import { create } from 'zustand';
import { library } from '../content/load';
import {
  applyAnswer,
  applyBossWin,
  applySessionComplete,
  defaultSave,
  mergeSaves,
  normaliseSave,
  type SaveData,
  type Settings,
} from './save';
import { clearSave, readSave, writeSave } from './storage';

type ProgressStore = {
  loaded: boolean;
  save: SaveData;
  load(): Promise<void>;
  /** Saves after every answer. `updateSrs` is false for in-session retries. */
  recordAnswer(itemId: string, correct: boolean, xp: number, updateSrs: boolean): void;
  completeSession(): void;
  winBoss(regionId: string): void;
  /** Replaces the whole save (used when merging with the account’s copy). */
  replaceSave(save: SaveData): void;
  updateSettings(patch: Partial<Settings>): void;
  markNoVoiceNoteSeen(): void;
  exportJson(): string;
  importJson(text: string): void;
  reset(): Promise<void>;
};

export const useProgress = create<ProgressStore>((setState, getState) => {
  const commit = (save: SaveData) => {
    setState({ save });
    void writeSave(save);
  };

  return {
    loaded: false,
    save: defaultSave(library.version, Date.now()),

    async load() {
      const raw = await readSave();
      const save = normaliseSave(raw, library.version, Date.now());
      setState({ save, loaded: true });
      if (raw !== undefined) void writeSave(save);
    },

    recordAnswer(itemId, correct, xp, updateSrs) {
      commit(applyAnswer(getState().save, itemId, correct, xp, Date.now(), updateSrs));
    },

    completeSession() {
      commit(applySessionComplete(getState().save, Date.now()));
    },

    winBoss(regionId) {
      commit(applyBossWin(getState().save, regionId, Date.now()));
    },

    replaceSave(save) {
      commit(save);
    },

    updateSettings(patch) {
      const save = getState().save;
      commit({ ...save, settings: { ...save.settings, ...patch }, updatedAt: Date.now() });
    },

    markNoVoiceNoteSeen() {
      commit({ ...getState().save, noVoiceNoteSeen: true });
    },

    exportJson() {
      return JSON.stringify({ app: 'stugbyn', exportedAt: new Date().toISOString(), ...getState().save }, null, 2);
    },

    importJson(text) {
      const parsed: unknown = JSON.parse(text);
      const incoming = normaliseSave(parsed, library.version, 0);
      commit(mergeSaves(getState().save, incoming));
    },

    async reset() {
      await clearSave();
      const save = defaultSave(library.version, Date.now());
      setState({ save });
      void writeSave(save);
    },
  };
});
