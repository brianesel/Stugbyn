/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Relative base so the static build works on GitHub Pages sub-paths as well as Netlify/Vercel roots.
export default defineConfig({
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
    VitePWA({
      registerType: 'autoUpdate',
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
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
