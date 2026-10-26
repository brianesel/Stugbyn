/**
 * npm run icons — renders public/icon.svg into the PNG icons iOS and Android need.
 * iOS ignores SVG home-screen icons, so apple-touch-icon.png (180 px) is required.
 * Maskable icons get extra padding so Android’s round masks don’t cut the cabin.
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './read-content';

const svg = readFileSync(join(root, 'public', 'icon.svg'), 'utf8');
const BG = '#E9EFEE';

const targets = [
  { file: 'apple-touch-icon.png', size: 180, pad: 0 },
  { file: 'icon-192.png', size: 192, pad: 0 },
  { file: 'icon-512.png', size: 512, pad: 0 },
  { file: 'icon-maskable-512.png', size: 512, pad: 0.12 },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const t of targets) {
  const inner = Math.round(t.size * (1 - 2 * t.pad));
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<html><body style="margin:0;background:${BG};display:grid;place-items:center;width:${t.size}px;height:${t.size}px">
       <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg', '<svg width="100%" height="100%"')}</div>
     </body></html>`,
  );
  await page.screenshot({ path: join(root, 'public', t.file), omitBackground: false });
  console.log(`public/${t.file} (${t.size}×${t.size})`);
}
await browser.close();
