import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'village' }
  | { name: 'region'; id: string }
  | { name: 'rules'; id: string }
  | { name: 'play'; mode: 'practice' | 'boss'; id: string }
  | { name: 'play'; mode: 'review'; id: null }
  | { name: 'results' }
  | { name: 'settings' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [a, b, c] = parts;
  if (a === 'region' && b) return { name: 'region', id: b };
  if (a === 'rules' && b) return { name: 'rules', id: b };
  if (a === 'play' && (b === 'practice' || b === 'boss') && c) return { name: 'play', mode: b, id: c };
  if (a === 'play' && b === 'review') return { name: 'play', mode: 'review', id: null };
  if (a === 'results') return { name: 'results' };
  if (a === 'settings') return { name: 'settings' };
  return { name: 'village' };
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash);
}

export function navigate(path: string) {
  window.location.hash = path;
}
