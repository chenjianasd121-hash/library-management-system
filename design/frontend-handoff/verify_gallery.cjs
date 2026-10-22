// Verify the static gallery locally without starting the application backend.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('../../frontend/node_modules/playwright-core');

(async () => {
  const base = __dirname;
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  const externalRequests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => errors.push(`${r.url()}: ${r.failure()?.errorText}`));
  page.on('request', r => { if (!r.url().startsWith('file:')) externalRequests.push(r.url()); });
  const checks = [];
  async function count(expected, label) {
    const actual = await page.locator('.card').count();
    if (actual !== expected) throw new Error(`${label}: ${actual} != ${expected}`);
    checks.push(label);
  }
  try {
    await page.goto(pathToFileURL(path.join(base, 'index.html')).href);
    await count(114, 'initial 114 entries');
    await page.locator('#role').selectOption('admin');
    await count(34, 'administrator 34 entries');
    await page.locator('.thumb').first().click();
    if (!await page.locator('#viewer').isVisible()) throw new Error('Viewer did not open');
    if (!(await page.locator('#dialogTitle').textContent()).includes('管理员')) throw new Error('Wrong portal in viewer');
    await page.keyboard.press('Escape');
    if (await page.locator('#viewer').isVisible()) throw new Error('Escape did not close viewer');
    checks.push('image viewer and Escape');
    await page.locator('#role').selectOption('librarian');
    await count(59, 'librarian 59 entries including 4 body references');
    await page.locator('#kind').selectOption('body_reference');
    await count(4, 'librarian 4 body references');
    await page.locator('#reset').click();
    await page.locator('#role').selectOption('reader');
    await count(21, 'reader 21 entries');
    await page.locator('#search').fill('/me/reservations');
    await count(4, 'reader reservation route returns READY, WAITING, history and cancel');
    await page.locator('#reset').click();
    await page.locator('#kind').selectOption('page');
    await count(53, 'all 53 complete pages');
    await page.locator('#reset').click();
    // Resolve every local image, including lazy images below the fold.
    const broken = await page.locator('.card img').evaluateAll(async imgs => {
      for (const img of imgs) img.loading = 'eager';
      await Promise.all(imgs.map(img => img.decode().catch(() => undefined)));
      return imgs.filter(img => !img.naturalWidth || !img.naturalHeight).map(img => img.src);
    });
    if (broken.length) throw new Error(`Broken images: ${JSON.stringify(broken)}`);
    checks.push('all 114 image references decode in browser');
    if (externalRequests.length) throw new Error('Unexpected network dependency');
    if (errors.length) throw new Error(errors.join('\n'));
    checks.push('no browser errors or network dependencies');
    await page.screenshot({ path: path.join(base, 'gallery-preview.png') });
    const auditPath = path.join(base, 'audit.json');
    const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
    audit.browser_validation = { status: 'passed', browser: 'Chrome headless', checks, screenshot: 'gallery-preview.png' };
    fs.writeFileSync(auditPath, JSON.stringify(audit, null, 2) + '\n');
    fs.appendFileSync(path.join(base, 'CHECKPOINT.md'), '\n- 浏览器检查通过：三端与类型筛选、路由搜索、放大/Esc、全部114条图片引用解码；无网络依赖或浏览器错误。\n');
    console.log(JSON.stringify({ status: 'passed', checks }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
