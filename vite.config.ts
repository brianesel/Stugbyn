/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Relative base so the static build works on GitHub Pages sub-paths as well as Netlify/Vercel roots.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Stugbyn',
        short_name: 'Stugbyn',
        description: 'Learn Swedish A1–A2 in a small village of games.',
        theme_color: '#9B2B21',
        background_color: '#E9EFEE',
        display: 'standalone',
        start_url: './',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        // Content JSON is bundled into the JS chunks, so precaching the build output covers it.
        globPatterns: ['**/*.{js,css,html,svg,woff2,json,mp3}'],
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
