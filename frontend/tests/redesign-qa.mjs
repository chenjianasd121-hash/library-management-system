// Reuse the existing isolated visual fixtures without changing application data or APIs.
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const fixture = await readFile(new URL('./chrome-acceptance.mjs', import.meta.url), 'utf8')
const prefix = fixture.slice(0, fixture.indexOf('const groups ='))
  .replaceAll("'chrome-acceptance'", "'redesign-qa'")
  .replaceAll('C:/Users/en/AppData/Local/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
const runnerPath = join(process.cwd(), 'tests', '.redesign-runner.mjs')
const runner = String.raw`
const routes = {
  VISITOR: ['/', '/login', '/register', '/books', '/books/1001', '/notices', '/notices/2001'],
  READER: ['/me/loans', '/me/reservations', '/me/profile', '/change-password'],
  LIBRARIAN: ['/staff/dashboard', '/staff/books', '/staff/books/new', '/staff/books/1001/edit', '/staff/books/1001/copies', '/staff/categories', '/staff/checkout', '/staff/return', '/staff/loans', '/staff/reservations', '/staff/notices', '/staff/stats'],
  ADMIN: ['/staff/dashboard', '/admin/users', '/admin/audit'],
}
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] })
const results = []
try {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
    for (const [role, paths] of Object.entries(routes)) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
      await context.route('**/api/v1/**', async (request) => {
        const url = new URL(request.request().url())
        let value = reply(url, request.request().method(), role === 'VISITOR' ? null : role)
        if (url.pathname.endsWith('/books') && url.searchParams.get('size') === '4')
          value = ok(page(books.slice(0, 4), 1, 4))
        if (url.pathname.endsWith('/books') && role === 'LIBRARIAN') {
          const many = Array.from({ length: 10 }, (_, i) => ({ ...books[i % books.length], id: String(1001 + i), title: books[i % books.length].title + (i > 5 ? ' · 第二版' : '') }))
          value = ok(page(many, Number(url.searchParams.get('page') || 1), 10))
        }
        await request.fulfill({ status: value.status || 200, contentType: 'application/json', body: JSON.stringify(value.body || value) })
      })
      const tab = await context.newPage()
      const errors = []
      tab.on('pageerror', e => errors.push(e.message))
      for (const path of paths) {
        const roleBase = role === 'ADMIN' ? 'http://127.0.0.3:5175' : role === 'LIBRARIAN' ? 'http://127.0.0.2:5174' : base
        await tab.goto(roleBase + path, { waitUntil: 'domcontentloaded' })
        await tab.waitForTimeout(550)
        const key = path === '/' ? 'home' : path.slice(1).replaceAll('/', '-')
        await tab.screenshot({ path: join(out, role.toLowerCase() + '-' + key + '-' + viewport.width + '.png') })
        const measure = await tab.evaluate(() => {
          const main = document.querySelector('.page-content')
          const table = document.querySelector('.table-scroll')
          const loan = document.querySelector('.dashboard-loans')?.getBoundingClientRect()
          const notice = document.querySelector('.notice-panel')?.getBoundingClientRect()
          return {
            bodyScrollHeight: document.documentElement.scrollHeight,
            bodyScrollWidth: document.documentElement.scrollWidth,
            viewportHeight: innerHeight,
            viewportWidth: innerWidth,
            mainScrollHeight: main?.scrollHeight,
            mainClientHeight: main?.clientHeight,
            tableScrollHeight: table?.scrollHeight,
            tableClientHeight: table?.clientHeight,
            loanHeight: loan?.height,
            noticeHeight: notice?.height,
          }
        })
        results.push({ role, path, viewport, ...measure, errors: [...errors] })
        errors.length = 0
      }
      await context.close()
    }
  }
  const stateChecks = []
  for (const target of [
    { role: 'VISITOR', path: '/books', url: base },
    { role: 'LIBRARIAN', path: '/staff/books', url: 'http://127.0.0.2:5174' },
    { role: 'ADMIN', path: '/admin/users', url: 'http://127.0.0.3:5175' },
  ]) {
    for (const state of ['loading', 'empty', 'error']) {
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
      await context.route('**/api/v1/**', async (request) => {
        const url = new URL(request.request().url())
        const path = url.pathname.replace('/api/v1', '')
        let value = reply(url, request.request().method(), target.role === 'VISITOR' ? null : target.role)
        if (!['/auth/csrf', '/auth/me'].includes(path)) {
          if (state === 'loading') await new Promise(resolve => setTimeout(resolve, 1000))
          if (state === 'empty') value = path === '/categories' ? ok([]) : ok(page([], 1, 10))
          if (state === 'error') value = { status: 503, body: { code: 'SERVICE_UNAVAILABLE', message: '服务暂不可用', traceId: 'visual-fixture' } }
        }
        await request.fulfill({ status: value.status || 200, contentType: 'application/json', body: JSON.stringify(value.body || value) })
      })
      const tab = await context.newPage()
      await tab.goto(target.url + target.path, { waitUntil: 'domcontentloaded' })
      await tab.waitForTimeout(state === 'loading' ? 250 : 600)
      const key = target.role.toLowerCase() + '-' + target.path.slice(1).replaceAll('/', '-') + '-' + state
      await tab.screenshot({ path: join(out, key + '-1366.png') })
      stateChecks.push({ role: target.role, path: target.path, state,
        skeleton: await tab.locator('.el-skeleton').count(),
        empty: await tab.locator('.el-empty').count(),
        error: await tab.locator('.el-result').count(),
      })
      await context.close()
    }
  }
  await writeFile(join(out, 'states.json'), JSON.stringify(stateChecks, null, 2))
} finally { await browser.close() }
await writeFile(join(out, 'report.json'), JSON.stringify(results, null, 2))
console.log(JSON.stringify(results.filter(x => x.bodyScrollWidth > x.viewportWidth + 2 || x.bodyScrollHeight > x.viewportHeight + 2 || x.errors.length), null, 2))
console.log('Screenshots: ' + out)
`
await writeFile(runnerPath, prefix + runner)
await import(pathToFileURL(runnerPath).href)
await unlink(runnerPath)
