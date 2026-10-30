/**
 * Service-worker updates. An installed iPhone app usually resumes instead of restarting, so it would
 * keep running an old version; we check for a new one whenever the app comes back into view (and
 * hourly), and let the learner choose when to reload.
 */
import { create } from 'zustand';
import { registerSW } from 'virtual:pwa-register';

type PwaUpdate = { needRefresh: boolean; update(): void; dismiss(): void };

export const usePwaUpdate = create<PwaUpdate>((setState) => ({
  needRefresh: false,
  update: () => {},
  dismiss: () => setState({ needRefresh: false }),
}));

const HOUR = 60 * 60 * 1000;

export function startPwaUpdates() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      usePwaUpdate.setState({ needRefresh: true });
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine === false) return;
        registration.update().catch(() => {
          /* offline or server unreachable: try again next time */
        });
      };
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      setInterval(check, HOUR);
    },
  });
  usePwaUpdate.setState({ update: () => void updateSW(true) });
}
