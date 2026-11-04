import { defaultDeps, envFromProcess, handleAssistant } from '../server/assistant.js';

// Vercel function: POST /api/assistant. Settings: ANTHROPIC_API_KEY (and optionally ASSISTANT_ALLOWED_EMAILS) in the
// project’s environment variables; the Supabase URL and anon key are the same VITE_ values the app is built with.
const env = envFromProcess();
const deps = defaultDeps(env);

export async function POST(request: Request): Promise<Response> {
  return handleAssistant(request, env, deps);
}
