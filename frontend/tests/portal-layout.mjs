import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const chrome = process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const portals = [
  { name: 'reader', url: 'http://127.0.0.1:5173/login', heading: '读者登录' },
  { name: 'librarian', url: 'http://127.0.0.2:5174/login', heading: '馆员登录' },
  { name: 'admin', url: 'http://127.0.0.3:5175/login', heading: '管理员登录' },
]
const out = new URL('../dist/portal-layout/', import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ executablePath: chrome, headless: true })
try {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
    for (const { name, url, heading } of portals) {
      await page.goto(url, { waitUntil: 'networkidle' })
      if (!await page.getByRole('heading', { name: heading }).isVisible())
        throw new Error(`${name}: expected heading missing`)
      if (await page.locator('.sidebar, .topbar').count())
        throw new Error(`${name}: application navigation appears on login`)
      const sizes = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        width: window.innerWidth,
      }))
      if (sizes.scrollWidth > sizes.width)
        throw new Error(`${name}: horizontal overflow at ${viewport.width}px`)
      await page.screenshot({ path: fileURLToPath(new URL(`${name}-${viewport.width}.png`, out)), fullPage: true })
    }
    await page.close()
  }
  console.log('PASS: three role-specific standalone login pages at desktop widths')
} finally {
  await browser.close()
}
