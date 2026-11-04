import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

/**
 * The writing helper: a small proxy between the app and the Claude API.
 * The API key stays on the server; only signed-in Stugbyn users can call it.
 */

export const MODEL = 'claude-opus-5-5';

const Word = z.object({ sv: z.string().max(120), en: z.string().max(160) });

export const AssistantRequest = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(20)
    .refine((m) => m[0].role === 'user' && m[m.length - 1].role === 'user', 'conversation must start and end with the learner'),
  context: z.object({
    kind: z.enum(['region', 'deck', 'all']),
    title: z.string().max(200),
    summary: z.string().max(4000).default(''),
    words: z.array(Word).max(400).default([]),
  }),
});
export type AssistantRequest = z.infer<typeof AssistantRequest>;

export const SYSTEM_PROMPT = `You are the writing helper in Stugbyn, an app for learning Swedish. You work like a friendly Swedish tutor.

The learner lives in Finland, studies Swedish at A1–A2 level and is preparing for the YKI intermediate test. They like climbing, cooking, programming and gaming, and they enjoy small jokes and puns. Use those interests for examples when it fits.

What you help with:
- Writing: write short Swedish texts (a few sentences or a short paragraph) that use the words and grammar from the context below. Build mainly on the practised words; when you need a word outside the list, keep it simple and common. Put the English translation after the Swedish.
- Translating: translate between English and Swedish. Into Swedish, stay at A1–A2 level and mention one or two useful words or grammar points, preferably ones from the context.
- Checking: when the learner writes Swedish, first give the corrected text, then list each change briefly with the rule in plain English (for example: verb second, inte before the verb in a subordinate clause, en or ett, adjective agreement, verb form). Start with one short sentence about what is already right.
- Questions about words and grammar: answer briefly, with one or two examples.

Keep answers short and easy to read on a phone. Explanations are in English; examples are in Swedish. Use standard Swedish as spoken in Sweden. Format as plain text with short paragraphs; you may use **bold** for the Swedish words or forms you are teaching and lines starting with "- " for lists. No headings and no tables.`;

/** The learner’s current place in the app and what they have practised there. */
export function contextBlock(ctx: AssistantRequest['context']): string {
  const where =
    ctx.kind === 'region'
      ? `The learner is in the grammar region “${ctx.title}”.`
      : ctx.kind === 'deck'
        ? `The learner is in the Word bank theme “${ctx.title}”.`
        : 'The learner is looking at all their words.';
  const words = ctx.words.length
    ? `Words and phrases the learner has practised (Swedish – English):\n${ctx.words.map((w) => `${w.sv} – ${w.en}`).join('\n')}`
    : 'The learner has not practised any words here yet; keep to very common A1 words.';
  return [where, ctx.summary.trim(), words].filter(Boolean).join('\n\n');
}

export function buildParams(req: AssistantRequest) {
  return {
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    // A safety decline is re-run on Anthropic’s recommended fallback model instead of failing.
    fallbacks: 'default' as const,
    output_config: { effort: 'medium' as const },
    system: [
      { type: 'text' as const, text: SYSTEM_PROMPT },
      { type: 'text' as const, text: contextBlock(req.context) },
    ],
    messages: req.messages,
  };
}

export type Env = {
  ANTHROPIC_API_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  /** Comma-separated emails allowed to use the helper; empty means every signed-in user. */
  ASSISTANT_ALLOWED_EMAILS?: string;
};

export type Deps = {
  /** Returns the signed-in user for a Supabase access token, or null. */
  verifyUser(token: string): Promise<{ id: string; email: string } | null>;
  anthropic: Pick<Anthropic, 'beta'>;
};

export function envFromProcess(): Env {
  const e = process.env;
  return {
    ANTHROPIC_API_KEY: e.ANTHROPIC_API_KEY,
    SUPABASE_URL: e.SUPABASE_URL ?? e.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY: e.SUPABASE_ANON_KEY ?? e.VITE_SUPABASE_ANON_KEY,
    ASSISTANT_ALLOWED_EMAILS: e.ASSISTANT_ALLOWED_EMAILS,
  };
}

export function defaultDeps(env: Env): Deps | null {
  if (!env.ANTHROPIC_API_KEY || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  return {
    async verifyUser(token) {
      const { data, error } = await supabase.auth.getUser(token);
      return error || !data.user ? null : { id: data.user.id, email: data.user.email ?? '' };
    },
    anthropic: new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }),
  };
}

const json = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json' } });

/** Requests per user per hour, per server instance. A guard against runaway loops, not a billing limit. */
const HOURLY_LIMIT = 60;
const recent = new Map<string, number[]>();
function overLimit(userId: string, now = Date.now()) {
  const hourAgo = now - 60 * 60 * 1000;
  const times = (recent.get(userId) ?? []).filter((t) => t > hourAgo);
  times.push(now);
  recent.set(userId, times);
  return times.length > HOURLY_LIMIT;
}

/**
 * Handles one helper request and streams the answer back as plain text.
 * Errors before the answer starts are JSON with a status code; a problem mid-answer is appended as a note.
 */
export async function handleAssistant(request: Request, env: Env, deps: Deps | null): Promise<Response> {
  if (request.method !== 'POST') return json(405, 'Use POST.');
  if (!deps) {
    const missing = [
      !env.ANTHROPIC_API_KEY && 'ANTHROPIC_API_KEY',
      !env.SUPABASE_URL && 'VITE_SUPABASE_URL',
      !env.SUPABASE_ANON_KEY && 'VITE_SUPABASE_ANON_KEY',
    ].filter(Boolean);
    return json(503, `The writing helper isn’t set up on the server yet (missing: ${missing.join(', ') || 'unknown'}).`);
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, 'Sign in under Settings → Account to use the writing helper.');
  const user = await deps.verifyUser(token);
  if (!user) return json(401, 'Your sign-in has expired. Sign in again under Settings → Account.');
  const allowed = (env.ASSISTANT_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length && !allowed.includes(user.email.toLowerCase())) return json(403, 'This account can’t use the writing helper.');
  if (overLimit(user.id)) return json(429, 'That’s a lot of questions for one hour. Take a short break and try again.');

  let body: AssistantRequest;
  try {
    body = AssistantRequest.parse(await request.json());
  } catch {
    return json(400, 'The request was not understood.');
  }

  const encoder = new TextEncoder();
  const stream = deps.anthropic.beta.messages.stream(buildParams(body));
  const out = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === 'refusal') {
          controller.enqueue(encoder.encode('\n\nSorry, I can’t help with that one. Try asking in a different way.'));
        } else if (final.stop_reason === 'max_tokens') {
          controller.enqueue(encoder.encode('\n\n(The answer was cut off. Ask me to continue.)'));
        }
      } catch (e) {
        const msg =
          e instanceof Anthropic.RateLimitError
            ? 'The helper is busy right now. Try again in a minute.'
            : e instanceof Anthropic.AuthenticationError
              ? 'The server’s API key isn’t valid.'
              : 'Something went wrong while answering. Try again.';
        controller.enqueue(encoder.encode(`\n\n⚠️ ${msg}`));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });
  return new Response(out, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
}
