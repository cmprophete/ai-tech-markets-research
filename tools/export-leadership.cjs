// Export the standalone HTML deck using its print layout. Requires Playwright and Chromium.
// Usage: node tools/export-leadership.cjs
// Optional: PLAYWRIGHT_MODULE_PATH=/path/to/playwright node tools/export-leadership.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
(async () => {
  const root = path.resolve(__dirname, '..');
  const output = path.join(root, 'output/pdf/esp-leadership-oct20.pdf');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(pathToFileURL(path.join(root, '00-leadership-oct20.html')).href);
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: 'print' });
    const overflow = await page.locator('.slide').evaluateAll(slides => slides.flatMap((s, i) => {
      const footer = s.querySelector('.foot').getBoundingClientRect();
      const content = [...s.children].filter(el => !el.classList.contains('foot'));
      const bottom = Math.max(...content.map(el => el.getBoundingClientRect().bottom));
      return bottom > footer.top - 8 || s.scrollHeight > s.clientHeight + 1 ? [i + 1] : [];
    }));
    if (overflow.length) throw new Error(`Slide content overflows: ${overflow.join(', ')}`);
    await page.pdf({ path: output, preferCSSPageSize: true, printBackground: true });
    console.log(`Exported ${await page.locator('.slide').count()} slides: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
