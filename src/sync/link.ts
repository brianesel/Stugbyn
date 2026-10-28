/**
 * Reads a pasted Supabase sign-in link. Used by the installed iPhone app, where tapping the link
 * would open Safari instead: the learner copies the link from the email and pastes it here.
 */
export type EmailLinkType = 'magiclink' | 'signup' | 'email' | 'recovery' | 'invite' | 'email_change';

export type ParsedLink =
  | { kind: 'token'; tokenHash: string; type: EmailLinkType }
  | { kind: 'session'; accessToken: string; refreshToken: string };

const TYPES: EmailLinkType[] = ['magiclink', 'signup', 'email', 'recovery', 'invite', 'email_change'];

/** Mail apps sometimes wrap links (safe-link redirects); unwrap encoded URLs a few times. */
function candidates(text: string): string[] {
  const out: string[] = [];
  let current = text.trim();
  for (let i = 0; i < 4; i++) {
    out.push(current);
    let next = current;
    try {
      next = decodeURIComponent(current);
    } catch {
      break;
    }
    if (next === current) break;
    current = next;
  }
  return out;
}

export function parseSignInLink(text: string): ParsedLink | null {
  for (const c of candidates(text)) {
    // 1. The link in the email: …/auth/v1/verify?token=<hash>&type=magiclink&redirect_to=…
    const verify = /\/auth\/v1\/verify\?([^\s"'<>#]+)/.exec(c);
    if (verify) {
      const params = new URLSearchParams(verify[1]);
      const token = params.get('token');
      const type = params.get('type') as EmailLinkType | null;
      if (token) return { kind: 'token', tokenHash: token, type: type && TYPES.includes(type) ? type : 'email' };
    }
    // 2. A link that was already opened in a browser: …#access_token=…&refresh_token=…
    const hash = /[#?&](access_token=[^\s"'<>]+)/.exec(c);
    if (hash) {
      const params = new URLSearchParams(hash[1]);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) return { kind: 'session', accessToken, refreshToken };
    }
  }
  return null;
}
