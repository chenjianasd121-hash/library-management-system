import { chromium } from 'playwright-core'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import assert from 'node:assert/strict'

const root = resolve(import.meta.dirname, '../..')
const run = readFileSync(join(root, 'output/visual-acceptance/current-run.txt'), 'utf8').trim()
const credentials = JSON.parse(
  readFileSync(join(root, 'output/runtime/local-test-seed/accounts.private.json'), 'utf8'),
)
const folder = join(run, 'density-high-dpi')
mkdirSync(folder, { recursive: true })
const results = []
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--force-color-profile=srgb'],
})
try {
  for (const viewport of [
    { width: 1706, height: 780, density: 1.5 },
    { width: 2560, height: 1440, density: 1 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.density,
      locale: 'zh-CN',
    })
    await context.route('**/api/v1/**', async (route) => {
      const r = route.request()
      assert(
        r.method() === 'GET' || new URL(r.url()).pathname === '/api/v1/auth/login',
        'Unexpected business write',
      )
      await route.continue()
    })
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle' })
    await page.locator('input[autocomplete="username"]').fill('test_reader1_1022')
    await page.locator('input[autocomplete="current-password"]').fill(credentials.password)
    await page.locator('.portal-submit').click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'))
    await page.locator('.el-message').waitFor({ state: 'hidden' })
    for (const path of ['/books/51', '/me/loans', '/me/profile']) {
      await page.goto('http://127.0.0.1:5173' + path, { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      const metrics = await page.evaluate(() => {
        const inner = document.querySelector('.page-inner'),
          heading = document.querySelector('.page-heading h1'),
          form = document.querySelector('.account-form')
        return {
          width: innerWidth,
          height: innerHeight,
          dpr: devicePixelRatio,
          scrollWidth: document.documentElement.scrollWidth,
          contentWidth: inner.getBoundingClientRect().width,
          titleFont: parseFloat(getComputedStyle(heading).fontSize),
          formWidth: form?.getBoundingClientRect().width || null,
        }
      })
      assert(
        metrics.contentWidth <= 1360 &&
          metrics.titleFont <= 30 &&
          metrics.scrollWidth <= metrics.width,
      )
      if (path === '/me/profile') {
        assert(metrics.formWidth <= 820)
        const box = await page.getByRole('button', { name: '保存资料', exact: true }).boundingBox()
        assert(
          box && box.y + box.height <= viewport.height,
          'Profile save button must be in the first viewport',
        )
      }
      const filename = `${path.replaceAll('/', '-')}-${viewport.width}-dpr${viewport.density}.png`
      await page.screenshot({
        path: join(folder, filename),
        fullPage: false,
        animations: 'disabled',
      })
      results.push({
        path,
        viewport,
        metrics,
        screenshot: 'density-high-dpi/' + filename,
        result: 'PASS',
      })
      writeFileSync(join(run, 'density-high-dpi.json'), JSON.stringify(results, null, 2))
    }
    await context.close()
    console.log(
      `PASS ${viewport.width}x${viewport.height} DPR ${viewport.density}: three reader pages`,
    )
  }
} finally {
  await browser.close()
}
