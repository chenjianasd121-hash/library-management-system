// Browser smoke against the running Vite proxy, Spring Boot service and MySQL.
// No network routing, response fixtures or browser storage are mocked.
import { chromium } from 'playwright-core'

const chrome = process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const credentials = [
  ['demo_admin', process.env.DEMO_ADMIN_PASSWORD, 'http://127.0.0.3:5175', [
    '/staff/dashboard', '/staff/books', '/staff/books/new', '/staff/categories',
    '/staff/checkout', '/staff/return', '/staff/loans', '/staff/reservations',
    '/staff/notices', '/staff/stats', '/admin/users', '/admin/audit', '/me/profile',
  ]],
  ['demo_librarian', process.env.DEMO_LIBRARIAN_PASSWORD, 'http://127.0.0.2:5174', [
    '/staff/dashboard', '/staff/books', '/staff/categories', '/staff/checkout',
    '/staff/return', '/staff/loans', '/staff/reservations', '/staff/notices', '/staff/stats',
  ]],
  ['demo_reader', process.env.DEMO_READER_PASSWORD, 'http://127.0.0.1:5173', [
    '/me/loans', '/me/reservations', '/me/profile',
  ]],
]
if (credentials.some(([, password]) => !password)) throw new Error('Set demo password environment variables')

const browser = await chromium.launch({ executablePath: chrome, headless: true })
let checked = 0
try {
  const context = await browser.newContext()
  const opened = []
  for (const [username, password, base, routes] of credentials) {
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(`JavaScript: ${error.message}`))
    page.on('response', response => {
      if (response.url().includes('/api/v1/') && response.status() >= 400 &&
          !(response.status() === 401 && response.url().endsWith('/auth/me')))
        errors.push(`HTTP ${response.status()}: ${response.url()}`)
    })
    await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
    if (await page.locator('.sidebar, .topbar').count())
      throw new Error(`${username}: login page contains application navigation`)
    if (!await page.getByRole('heading', { name: username === 'demo_admin' ? '管理员登录' : username === 'demo_librarian' ? '馆员登录' : '读者登录' }).count())
      throw new Error(`${username}: wrong portal heading`)
    await page.locator('input[autocomplete="username"]').fill(username)
    await page.locator('input[autocomplete="current-password"]').fill(password)
    await page.locator('.portal-submit').click()
    await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 15000 })
    await page.reload({ waitUntil: 'networkidle' })
    if (page.url().includes('/login')) throw new Error(`${username}: session did not survive refresh`)
    const booksResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/books?page=1&size=1')
      return { status: response.status, body: await response.json(), page: location.pathname }
    })
    if (!booksResponse.body.data?.items) throw new Error(`${username}: books API ${JSON.stringify(booksResponse)}`)
    const books = booksResponse.body.data.items
    const bookId = books[0]?.id
    if (!bookId) throw new Error('No persisted books found')
    for (const route of [...routes, '/books', `/books/${bookId}`, '/notices']) {
      await page.goto(`${base}${route}`, { waitUntil: 'networkidle' })
      if (page.url().endsWith('/403') || page.url().includes('/login'))
        throw new Error(`${username}: unexpected redirect from ${route} to ${page.url()}`)
      if (await page.getByText('连接失败', { exact: false }).count())
        throw new Error(`${username}: connection error on ${route}`)
      checked++
    }
    if (username === 'demo_admin') {
      for (const route of [`/staff/books/${bookId}/edit`, `/staff/books/${bookId}/copies`]) {
        await page.goto(`${base}${route}`, { waitUntil: 'networkidle' })
        checked++
      }
    }
    if (errors.length) throw new Error(`${username}: ${errors.join('; ')}`)
    opened.push({ username, page })
  }
  for (const { username, page } of opened) {
    await page.reload({ waitUntil: 'networkidle' })
    if (page.url().includes('/login')) throw new Error(`${username}: session was replaced by another portal`)
  }
  await context.close()
  console.log(JSON.stringify({ result: 'PASS', checkedRoutes: checked, source: 'real Vite proxy + Spring Boot + MySQL 8.4' }))
} finally {
  await browser.close()
}
