/// <reference types="vitest" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Serves the writing helper’s Vercel function during `npm run dev`, with settings from .env.local
 * (ANTHROPIC_API_KEY and the two VITE_SUPABASE_ values). In production Vercel runs api/assistant.ts itself.
 */
function devAssistant(env: Record<string, string>): Plugin {
  return {
    name: 'dev-assistant',
    configureServer(server) {
      server.middlewares.use('/api/assistant', async (req, res) => {
        const mod = (await server.ssrLoadModule('/server/assistant.ts')) as typeof import('./server/assistant');
        const settings = {
          ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
          SUPABASE_URL: env.VITE_SUPABASE_URL,
          SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
          ASSISTANT_ALLOWED_EMAILS: env.ASSISTANT_ALLOWED_EMAILS,
        };
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const request = new Request('http://localhost/api/assistant', {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
        });
        const response = await mod.handleAssistant(request, settings, mod.defaultDeps(settings));
        res.statusCode = response.status;
        response.headers.forEach((v, k) => res.setHeader(k, v));
        if (response.body) for await (const chunk of response.body) res.write(chunk);
        res.end();
      });
    },
  };
}

// Relative base so the static build works on GitHub Pages sub-paths as well as Netlify/Vercel roots.
export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    // The largest chunk is the content data (words, items, jokes): ~150 kB gzipped, downloaded once and precached
    // for offline use. Code chunks stay well under the default 500 kB.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Libraries change rarely; keeping them apart means a content update doesn’t re-download them.
        manualChunks: (id) => {
          if (id.includes('/content/') && id.endsWith('.json')) return 'content';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
  plugins: [
    react(),
    devAssistant(loadEnv(mode, process.cwd(), '')),
    VitePWA({
      // 'prompt': a new version waits until the learner taps Update, so a round in progress is never cut off.
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
      manifest: {
        name: 'Stugbyn',
        short_name: 'Stugbyn',
        description: 'Learn Swedish A1–A2 in a small village of games.',
        id: './',
        theme_color: '#E9EFEE',
        background_color: '#E9EFEE',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // Content JSON is bundled into the JS chunks, so precaching the build output covers it.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json,mp3}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts'],
  },
}));
