import { chromium } from 'playwright-core'
const browser = await chromium.launch({
  executablePath: 'C:/Users/en/AppData/Local/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
await page.goto('http://127.0.0.1:5173/')
await page.waitForTimeout(400)
const offenders = await page.evaluate(() =>
  [...document.querySelectorAll('*')]
    .map((el) => ({
      tag: el.tagName,
      cls: el.className?.toString().slice(0, 80),
      left: Math.round(el.getBoundingClientRect().left),
      right: Math.round(el.getBoundingClientRect().right),
      width: Math.round(el.getBoundingClientRect().width),
    }))
    .filter((x) => x.right > innerWidth + 1 || x.left < -1)
    .sort((a, b) => b.right - a.right)
    .slice(0, 25),
)
console.log(JSON.stringify(offenders, null, 2))
await browser.close()
