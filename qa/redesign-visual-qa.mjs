import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const output = 'qa-output';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { checks: [], screenshots: [] };

async function check(name, ok, detail) {
  report.checks.push({ name, ok: Boolean(ok), detail });
  if (!ok) throw new Error(`${name}: ${detail}`);
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
await desktop.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await check('desktop-title', await desktop.title() === 'Padel Nusantara 81 | Command Center 2026', await desktop.title());
await check('desktop-h1', (await desktop.locator('h1').innerText()).includes('Delapan puluh satu court'), await desktop.locator('h1').innerText());
await check('desktop-no-horizontal-overflow', await desktop.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'document width must fit viewport');
await desktop.screenshot({ path: `${output}/desktop-first-viewport.png`, fullPage: false });
await desktop.screenshot({ path: `${output}/desktop-full-page.png`, fullPage: true });
report.screenshots.push('desktop-first-viewport.png', 'desktop-full-page.png');

await desktop.locator('[data-venue-filter="vip"]').click();
await check('venue-filter', await desktop.locator('.venue-row:visible').count() === 1, `${await desktop.locator('.venue-row:visible').count()} rows visible`);
await desktop.locator('[data-venue-filter="all"]').click();
await check('venue-filter-reset', await desktop.locator('.venue-row:visible').count() === 4, `${await desktop.locator('.venue-row:visible').count()} rows visible`);
await check('legacy-route', (await desktop.request.get('http://127.0.0.1:4173/legacy.html')).ok(), 'legacy route must return 200');

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true });
await mobile.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await check('mobile-no-horizontal-overflow', await mobile.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'document width must fit viewport');
await mobile.locator('[data-menu-toggle]').click();
await check('mobile-menu-opens', await mobile.locator('[data-nav]').evaluate((el) => el.classList.contains('open')), 'mobile navigation did not open');
await mobile.screenshot({ path: `${output}/mobile-menu.png`, fullPage: false });
await mobile.locator('[data-menu-toggle]').click();
await mobile.screenshot({ path: `${output}/mobile-first-viewport.png`, fullPage: false });
await mobile.screenshot({ path: `${output}/mobile-full-page.png`, fullPage: true });
report.screenshots.push('mobile-menu.png', 'mobile-first-viewport.png', 'mobile-full-page.png');

await fs.writeFile(`${output}/qa-report.json`, JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify(report, null, 2));
