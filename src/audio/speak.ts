import { useSyncExternalStore } from 'react';
import { recordedAudio } from '../content/load';

/** null = voices not loaded yet, false = no Swedish voice on this device. */
let swedishVoice: SpeechSynthesisVoice | null | false = null;
const listeners = new Set<() => void>();

function refreshVoice() {
  if (typeof speechSynthesis === 'undefined') {
    swedishVoice = false;
    return;
  }
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return; // not loaded yet; voiceschanged will fire
  const sv = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('sv'));
  swedishVoice = sv.find((v) => v.lang.toLowerCase().replace('_', '-') === 'sv-se') ?? sv[0] ?? false;
  listeners.forEach((l) => l());
}

if (typeof speechSynthesis !== 'undefined') {
  refreshVoice();
  speechSynthesis.addEventListener?.('voiceschanged', refreshVoice);
  // Some browsers never fire voiceschanged when the list is empty: settle after a moment.
  setTimeout(() => {
    if (swedishVoice === null) {
      refreshVoice();
      if (swedishVoice === null) swedishVoice = false;
      listeners.forEach((l) => l());
    }
  }, 2500);
} else {
  swedishVoice = false;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** true / false once known, null while the browser is still loading voices. */
export function useHasSwedishVoice(): boolean | null {
  return useSyncExternalStore(subscribe, () => (swedishVoice === null ? null : swedishVoice !== false));
}

export function canPlay(itemId?: string): boolean {
  return Boolean((itemId && recordedAudio.has(itemId)) || swedishVoice);
}

let currentAudio: HTMLAudioElement | null = null;

/** Plays a recorded file for the item if one exists, otherwise the browser’s Swedish voice. */
export function speak(text: string, opts: { rate: number; itemId?: string }) {
  currentAudio?.pause();
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  const url = opts.itemId ? recordedAudio.get(opts.itemId) : undefined;
  if (url) {
    currentAudio = new Audio(url);
    void currentAudio.play();
    return;
  }
  if (!swedishVoice) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'sv-SE';
  u.voice = swedishVoice;
  u.rate = opts.rate;
  speechSynthesis.speak(u);
}
