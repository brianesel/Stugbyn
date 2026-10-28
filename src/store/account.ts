import { create } from 'zustand';
import { library } from '../content/load';
import { supabase } from '../sync/client';
import { parseSignInLink } from '../sync/link';
import { mergeWithRemote, sameProgress } from '../sync/merge';
import { deleteRemote, fetchRemote, pushRemote } from '../sync/remote';
import { useProgress } from './progress';

export type SyncStatus = 'off' | 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error';

type AccountStore = {
  /** False when the build has no Supabase settings: accounts are hidden and progress stays on the device. */
  configured: boolean;
  user: { id: string; email: string } | null;
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  /** Email a login link/code was sent to, while waiting for the learner. */
  pendingEmail: string | null;
  init(): Promise<void>;
  sendLink(email: string): Promise<void>;
  verifyCode(code: string): Promise<void>;
  /** Signs in from a sign-in link pasted from the email (the installed iPhone app can’t open links itself). */
  signInWithLink(text: string): Promise<void>;
  cancelLogin(): void;
  signOut(): Promise<void>;
  syncNow(): Promise<void>;
  /** After a reset: replace the account’s copy with this device’s (empty) save instead of merging. */
  overwriteRemote(): Promise<void>;
  deleteAccount(): Promise<void>;
};

const PUSH_DELAY_MS = 3000;
let initialised = false;
let applyingRemote = false;
let timer: ReturnType<typeof setTimeout> | null = null;

const message = (e: unknown) => {
  const m = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : String(e);
  return /failed to fetch|network|load failed/i.test(m) ? 'Couldn’t reach the server. Check your connection and try again.' : m;
};

export const useAccount = create<AccountStore>((setState, getState) => {
  const failed = (e: unknown) =>
    setState({ status: navigator.onLine === false ? 'offline' : 'error', error: navigator.onLine === false ? null : message(e) });

  const schedule = () => {
    if (!getState().user) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void getState().syncNow(), PUSH_DELAY_MS);
  };

  const signedIn = (user: { id: string; email?: string | null } | null | undefined) => {
    if (!user) {
      setState({ user: null, status: 'signed-out' });
      return;
    }
    const was = getState().user?.id;
    setState({ user: { id: user.id, email: user.email ?? '' }, pendingEmail: null, error: null });
    if (was !== user.id) void getState().syncNow();
  };

  return {
    configured: supabase !== null,
    user: null,
    status: supabase ? 'signed-out' : 'off',
    lastSyncedAt: null,
    error: null,
    pendingEmail: null,

    async init() {
      if (!supabase || initialised) return;
      initialised = true;

      supabase.auth.onAuthStateChange((_event, session) => {
        // Supabase calls this synchronously during its own lock; defer our async work.
        setTimeout(() => signedIn(session?.user), 0);
      });
      const { data } = await supabase.auth.getSession();
      signedIn(data.session?.user);

      // A magic link lands with tokens in the hash; tidy the address bar once they are read.
      if (/access_token|error_description/.test(window.location.hash)) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/`);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }

      // Push local changes a few seconds after they happen (every answer saves locally first).
      useProgress.subscribe((s, prev) => {
        if (s.save !== prev.save && !applyingRemote) schedule();
      });
      window.addEventListener('online', () => void getState().syncNow());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && timer) {
          clearTimeout(timer);
          timer = null;
          void getState().syncNow();
        }
      });
    },

    async sendLink(email) {
      if (!supabase) return;
      setState({ error: null });
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
      });
      if (error) {
        setState({ error: message(error) });
        throw error;
      }
      setState({ pendingEmail: email });
    },

    async verifyCode(code) {
      const email = getState().pendingEmail;
      if (!supabase || !email) return;
      setState({ error: null });
      const { data, error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
      if (error) {
        setState({ error: message(error) });
        throw error;
      }
      signedIn(data.user);
    },

    async signInWithLink(text) {
      if (!supabase) return;
      setState({ error: null });
      const link = parseSignInLink(text);
      if (!link) {
        const msg = 'That doesn’t look like the sign-in link. In the email, press and hold the link, choose Copy Link, then paste it here.';
        setState({ error: msg });
        throw new Error(msg);
      }
      const { data, error } =
        link.kind === 'token'
          ? await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.type })
          : await supabase.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken });
      if (error) {
        const expired = /expired|invalid|not found/i.test(error.message);
        const msg = expired ? 'This link has already been used or has expired. Request a new one and paste it without tapping it.' : message(error);
        setState({ error: msg });
        throw error;
      }
      signedIn(data.user);
    },

    cancelLogin() {
      setState({ pendingEmail: null, error: null });
    },

    async signOut() {
      if (!supabase) return;
      if (timer) {
        clearTimeout(timer);
        timer = null;
        await getState().syncNow();
      }
      await supabase.auth.signOut();
      setState({ user: null, status: 'signed-out', lastSyncedAt: null });
    },

    async syncNow() {
      const user = getState().user;
      if (!user) return;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      setState({ status: 'syncing', error: null });
      try {
        const remote = await fetchRemote(user.id);
        const local = useProgress.getState().save;
        const merged = mergeWithRemote(local, remote, library.version);
        if (!sameProgress(merged, local)) {
          applyingRemote = true;
          useProgress.getState().replaceSave(merged);
          applyingRemote = false;
        }
        await pushRemote(user.id, merged);
        setState({ status: 'synced', lastSyncedAt: Date.now() });
      } catch (e) {
        applyingRemote = false;
        failed(e);
      }
    },

    async overwriteRemote() {
      const user = getState().user;
      if (!user) return;
      setState({ status: 'syncing' });
      try {
        await pushRemote(user.id, useProgress.getState().save);
        setState({ status: 'synced', lastSyncedAt: Date.now() });
      } catch (e) {
        failed(e);
      }
    },

    async deleteAccount() {
      const user = getState().user;
      if (!supabase || !user) return;
      await deleteRemote(user.id);
      const { error } = await supabase.rpc('delete_my_account');
      if (error) {
        setState({ error: message(error) });
        throw error;
      }
      await supabase.auth.signOut();
      setState({ user: null, status: 'signed-out', lastSyncedAt: null });
    },
  };
});
