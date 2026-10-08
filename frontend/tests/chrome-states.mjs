// Browser checks for asynchronous page states. Fixtures stay outside the app.
import { chromium } from 'playwright-core'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const base = 'http://127.0.0.1:5173'
const out = join(process.cwd(), 'tests', 'chrome-acceptance')
await mkdir(out, { recursive: true })
const routes = {
  VISITOR: ['/', '/books', '/books/1001', '/notices', '/notices/2001'],
  READER: ['/me/loans', '/me/reservations'],
  LIBRARIAN: [
    '/staff/dashboard',
    '/staff/books',
    '/staff/books/1001/edit',
    '/staff/books/1001/copies',
    '/staff/categories',
    '/staff/loans',
    '/staff/reservations',
    '/staff/notices',
    '/staff/stats',
  ],
  ADMIN: ['/admin/users', '/admin/audit'],
}
const user = (role) => ({
  id: role === 'READER' ? '5001' : '9001',
  username: role.toLowerCase(),
  displayName: role === 'ADMIN' ? '管理员' : role === 'LIBRARIAN' ? '馆员' : '读者',
  role,
  status: 'ACTIVE',
  mustChangePassword: false,
})
const ok = (data) => ({ code: 'OK', message: '成功', data, traceId: 'state-fixture' })
const emptyPage = { items: [], page: 1, size: 20, total: 0 }
function emptyData(path) {
  if (path === '/categories' || path === '/stats/loans-trend' || path === '/stats/top-books')
    return []
  if (path === '/stats/overview' || /^\/(books|notices)\/[^/]+$/.test(path)) return null
  if (path === '/policy')
    return {
      maxActiveLoans: 5,
      loanDays: 30,
      renewalDays: 15,
      maxRenewals: 1,
      maxActiveReservations: 3,
      pickupDays: 3,
      timeZone: 'Asia/Shanghai',
    }
  return emptyPage
}
const browser = await chromium.launch({
  executablePath: 'C:/Users/en/AppData/Local/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox'],
})
const results = []
try {
  for (const state of ['loading', 'empty', 'error']) {
    for (const [role, paths] of Object.entries(routes)) {
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
      await context.route('**/api/v1/**', async (route) => {
        const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
        if (path === '/auth/csrf') {
          await route.fulfill({ contentType: 'application/json', body: JSON.stringify(ok({ csrfToken: 'state-fixture' })) })
          return
        }
        if (path === '/auth/me') {
          const response = role === 'VISITOR'
            ? { code: 'AUTH_REQUIRED', message: '请登录', traceId: 'state-fixture' }
            : ok(user(role))
          await route.fulfill({
            status: role === 'VISITOR' ? 401 : 200,
            contentType: 'application/json',
            body: JSON.stringify(response),
          })
          return
        }
        if (state === 'loading') await new Promise((resolve) => setTimeout(resolve, 700))
        const response = state === 'error'
          ? { code: 'SERVICE_UNAVAILABLE', message: '服务暂不可用', traceId: 'state-fixture' }
          : ok(emptyData(path))
        await route.fulfill({
          status: state === 'error' ? 503 : 200,
          contentType: 'application/json',
          body: JSON.stringify(response),
        })
      })
      const tab = await context.newPage()
      const pageErrors = []
      tab.on('pageerror', (error) => pageErrors.push(error.message))
      for (const path of paths) {
        await tab.goto(base + path, { waitUntil: 'domcontentloaded' })
        if (state === 'loading') await tab.waitForTimeout(150)
        else await tab.waitForTimeout(450)
        const visible = state === 'loading'
          ? (await tab.locator('.load-state[role="status"]').count()) > 0
          : state === 'error'
            ? (await tab.getByText('加载失败').count()) > 0
            : path === '/staff/books/1001/edit'
              ? true // The edit form has no separate empty state.
              : (await tab.locator('.el-empty').count()) > 0
        const scrollWidth = await tab.evaluate(() => document.documentElement.scrollWidth)
        const key = `${role.toLowerCase()}-${path === '/' ? 'home' : path.slice(1).replaceAll('/', '-')}-${state}`
        if (['visitor-home', 'visitor-books', 'librarian-staff-dashboard', 'admin-admin-users'].some((name) => key.startsWith(name)))
          await tab.screenshot({ path: join(out, `${key}-1366.png`) })
        results.push({ role, path, state, visible, scrollWidth, pageErrors: [...pageErrors] })
        pageErrors.length = 0
        if (state === 'loading') await tab.waitForTimeout(650)
      }
      await context.close()
    }
  }
} finally {
  await browser.close()
}
await writeFile(join(out, 'states.json'), JSON.stringify(results, null, 2))
const failed = results.filter((r) => !r.visible || r.scrollWidth > 1368 || r.pageErrors.length)
console.log(JSON.stringify({ checked: results.length, issues: failed.length, details: failed }, null, 2))
