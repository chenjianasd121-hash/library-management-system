// Public pages against the running Spring Boot service. No response fixtures.
import { chromium } from 'playwright-core'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const out = join(process.cwd(), 'tests', 'redesign-qa')
await mkdir(out, { recursive: true })
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox'],
})
const results = []
try {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
    const tab = await context.newPage()
    const errors = []
    tab.on('pageerror', error => errors.push(error.message))
    for (const path of ['/', '/books', '/notices']) {
      await tab.goto('http://127.0.0.1:5173' + path, { waitUntil: 'networkidle' })
      const key = path === '/' ? 'home' : path.slice(1)
      await tab.screenshot({ path: join(out, `real-visitor-${key}-${viewport.width}.png`) })
      const measure = await tab.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        mainHeight: document.querySelector('.page-content')?.scrollHeight,
        mainViewport: document.querySelector('.page-content')?.clientHeight,
        errorState: !!document.querySelector('.el-result'),
      }))
      results.push({ path, viewport, ...measure, errors: [...errors] })
      errors.length = 0
    }
    await context.close()
  }
} finally {
  await browser.close()
}
await writeFile(join(out, 'real-public.json'), JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
