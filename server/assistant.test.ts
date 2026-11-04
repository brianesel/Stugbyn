// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { buildParams, contextBlock, handleAssistant, type Deps } from './assistant';

const body = {
  messages: [{ role: 'user', content: 'Write a short text with my words.' }],
  context: { kind: 'deck', title: 'Klättring', summary: '', words: [{ sv: 'klättra', en: 'climb' }] },
};

function fakeDeps(texts: string[], stopReason = 'end_turn') {
  const stream = vi.fn((_params: unknown) => {
    const events = texts.map((text) => ({ type: 'content_block_delta', delta: { type: 'text_delta', text } }));
    return {
      async *[Symbol.asyncIterator]() {
        yield* events;
      },
      finalMessage: async () => ({ stop_reason: stopReason }),
      abort: () => {},
    };
  });
  const deps = {
    verifyUser: async (token: string) => (token === 'good' ? { id: 'u1', email: 'me@example.com' } : null),
    anthropic: { beta: { messages: { stream } } },
  } as unknown as Deps;
  return { deps, stream };
}

const post = (b: unknown, token?: string) =>
  new Request('http://x/api/assistant', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(b),
  });

describe('writing helper API', () => {
  it('streams the answer as plain text for a signed-in learner', async () => {
    const { deps, stream } = fakeDeps(['Jag ', 'klättrar.']);
    const res = await handleAssistant(post(body, 'good'), {}, deps);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Jag klättrar.');
    const params = stream.mock.calls[0][0] as ReturnType<typeof buildParams>;
    expect(params.model).toBe('claude-opus-5-5');
    expect(params.fallbacks).toBe('default');
    expect(params.system[1].text).toContain('klättra – climb');
  });

  it('rejects requests without a valid sign-in', async () => {
    const { deps } = fakeDeps(['x']);
    expect((await handleAssistant(post(body), {}, deps)).status).toBe(401);
    expect((await handleAssistant(post(body, 'bad'), {}, deps)).status).toBe(401);
  });

  it('honours the allow-list of emails', async () => {
    const { deps } = fakeDeps(['x']);
    const res = await handleAssistant(post(body, 'good'), { ASSISTANT_ALLOWED_EMAILS: 'someone@else.com' }, deps);
    expect(res.status).toBe(403);
  });

  it('says it isn’t set up when the server has no key', async () => {
    expect((await handleAssistant(post(body, 'good'), {}, null)).status).toBe(503);
  });

  it('rejects a conversation that doesn’t end with the learner', async () => {
    const { deps } = fakeDeps(['x']);
    const bad = { ...body, messages: [...body.messages, { role: 'assistant', content: 'Hej' }] };
    expect((await handleAssistant(post(bad, 'good'), {}, deps)).status).toBe(400);
  });

  it('adds a friendly note when the model declines', async () => {
    const { deps } = fakeDeps([''], 'refusal');
    const res = await handleAssistant(post(body, 'good'), {}, deps);
    expect(await res.text()).toContain('can’t help with that');
  });

  it('describes where the learner is', () => {
    expect(contextBlock({ kind: 'region', title: 'Verb', summary: 'Rules: …', words: [] })).toContain('grammar region “Verb”');
  });
});
