import { parseSignInLink } from './link';

const verify =
  'https://kjopzmdplzmuoubuvvws.supabase.co/auth/v1/verify?token=abc123def456&type=magiclink&redirect_to=https://stugbyn.vercel.app/';

describe('parseSignInLink', () => {
  it('reads the token and type from the emailed link', () => {
    expect(parseSignInLink(verify)).toEqual({ kind: 'token', tokenHash: 'abc123def456', type: 'magiclink' });
  });

  it('accepts the first-time signup link', () => {
    expect(parseSignInLink(verify.replace('magiclink', 'signup'))).toMatchObject({ type: 'signup' });
  });

  it('finds the link inside surrounding text and spaces', () => {
    expect(parseSignInLink(`  Log in: ${verify}  `)).toMatchObject({ tokenHash: 'abc123def456' });
  });

  it('unwraps a link wrapped by a mail app’s safe-link redirect', () => {
    const wrapped = `https://safelinks.example.com/?url=${encodeURIComponent(verify)}&data=1`;
    expect(parseSignInLink(wrapped)).toMatchObject({ kind: 'token', tokenHash: 'abc123def456' });
  });

  it('reads tokens from a link that was already opened in a browser', () => {
    const opened = 'https://stugbyn.vercel.app/#access_token=aaa.bbb.ccc&expires_in=3600&refresh_token=rrr&token_type=bearer&type=magiclink';
    expect(parseSignInLink(opened)).toEqual({ kind: 'session', accessToken: 'aaa.bbb.ccc', refreshToken: 'rrr' });
  });

  it('falls back to type email for an unknown type and returns null for unrelated text', () => {
    expect(parseSignInLink(verify.replace('magiclink', 'weird'))).toMatchObject({ type: 'email' });
    expect(parseSignInLink('hello')).toBeNull();
    expect(parseSignInLink('https://stugbyn.vercel.app/')).toBeNull();
  });
});
