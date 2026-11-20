// Снимок песочницы для README: npm run site && node scripts/serve.mjs, затем node scripts/screenshot.mjs
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:4181/');
await page.screenshot({ path: 'docs/screenshot.png', fullPage: true });
await browser.close();
