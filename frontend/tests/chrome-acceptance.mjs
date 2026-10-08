// Isolated Chrome visual fixture. No data or route interception is loaded by the app.
import { chromium } from 'playwright-core'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const chrome = 'C:/Users/en/AppData/Local/Google/Chrome/Application/chrome.exe'
const base = 'http://127.0.0.1:5173'
const out = join(process.cwd(), 'tests', 'chrome-acceptance')
await mkdir(out, { recursive: true })
const book = {
  id: '1001',
  isbn: '9787115546081',
  title: 'Java编程思想',
  author: 'Bruce Eckel',
  categoryId: '10',
  categoryName: '计算机类',
  coverPath: null,
  totalCopies: 8,
  availableCopies: 3,
  readyCopies: 1,
  borrowedCopies: 4,
  enabled: true,
  publisher: '机械工业出版社',
  publishedOn: '2020-01-01',
  description: '系统介绍 Java 编程语言及面向对象思想。',
  keywords: 'Java,编程',
}
const books = [
  book,
  ...['人类简史', '解忧杂货店', '数据结构与算法', '经济学原理', '活着'].map((title, i) => ({
    ...book,
    id: String(1002 + i),
    title,
    author: ['尤瓦尔·赫拉利', '东野圭吾', '王道论坛', '曼昆', '余华'][i],
    categoryName: ['历史类', '文学类', '计算机类', '经济管理', '文学类'][i],
    availableCopies: i % 2 ? 0 : 2,
  })),
]
const category = { id: '10', name: '计算机类', code: 'CS', enabled: true, sortOrder: 1 }
const notice = {
  id: '2001',
  title: '关于图书馆开放时间调整的通知',
  content: '图书馆将调整开放时间，请读者留意现场通知。',
  status: 'PUBLISHED',
  publishedAt: '2026-09-26T10:00:00+08:00',
  createdAt: '2026-09-25T10:00:00+08:00',
}
const loan = {
  id: '3001',
  bookId: '1001',
  copyId: '4001',
  readerId: '5001',
  readerName: '张三',
  bookTitle: book.title,
  copyBarcode: 'BK0001',
  borrowedAt: '2026-09-20T14:22:00+08:00',
  dueDate: '2026-10-20',
  returnedAt: null,
  renewalCount: 0,
  status: 'ACTIVE',
  overdueDays: 0,
  allowedActions: { canRenew: true },
}
const reservation = {
  id: '6001',
  bookId: '1001',
  readerId: '5001',
  readerName: '张三',
  bookTitle: book.title,
  status: 'READY',
  requestedAt: '2026-09-21T09:00:00+08:00',
  readyAt: '2026-09-22T09:00:00+08:00',
  queuePosition: null,
  copyId: '4002',
  copyBarcode: 'BK0002',
  shelfLocation: 'A 区 2 排',
  pickupDeadline: '2026-09-25',
  allowedActions: { canCancel: true },
}
const overview = {
  bookCount: 126,
  totalCopies: 12860,
  availableCopies: 8410,
  activeLoans: 268,
  overdueLoans: 39,
  readyReservations: 52,
  readerCount: 1532,
  generatedAt: '2026-09-26T16:00:00+08:00',
}
const trend = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-09-${String(i + 1).padStart(2, '0')}`,
  borrowedCount: 180 + Math.round(45 * Math.sin(i / 2)) + i * 2,
  returnedCount: 130 + Math.round(35 * Math.sin(i / 2 + 0.5)) + i,
}))
const topBooks = books
  .slice(0, 5)
  .map((b, i) => ({ bookId: b.id, title: b.title, borrowCount: 52 - i * 8 }))
const adminUser = {
  id: '9001',
  username: 'admin',
  displayName: '管理员',
  role: 'ADMIN',
  status: 'ACTIVE',
  mustChangePassword: false,
}
const readerUser = {
  id: '5001',
  username: 'zhangsan',
  displayName: '张三',
  role: 'READER',
  status: 'ACTIVE',
  mustChangePassword: false,
}
const staffUser = {
  id: '9002',
  username: 'staff',
  displayName: '馆员',
  role: 'LIBRARIAN',
  status: 'ACTIVE',
  mustChangePassword: false,
}
const page = (items, p = 1, size = 20) => ({ items, page: p, size, total: items.length })
const ok = (data) => ({ code: 'OK', message: '成功', data, traceId: 'visual-fixture' })
function reply(url, method, role) {
  const path = url.pathname.replace('/api/v1', '')
  const q = url.searchParams
  if (path === '/auth/csrf') return ok({ csrfToken: 'visual-token' })
  if (path === '/auth/me')
    return role
      ? ok(role === 'ADMIN' ? adminUser : role === 'READER' ? readerUser : staffUser)
      : {
          status: 401,
          body: { code: 'AUTH_REQUIRED', message: '请登录', traceId: 'visual-fixture' },
        }
  if (path === '/auth/login' && method === 'POST') return ok({ user: readerUser })
  if (path === '/categories') return ok([category])
  if (path === '/policy')
    return ok({
      maxActiveLoans: 5,
      loanDays: 30,
      renewalDays: 15,
      maxRenewals: 1,
      maxActiveReservations: 3,
      pickupDays: 3,
      timeZone: 'Asia/Shanghai',
    })
  if (path === '/books')
    return ok(page(books, Number(q.get('page') || 1), Number(q.get('size') || 20)))
  if (/^\/books\/[^/]+\/copies$/.test(path))
    return ok(
      page([
        {
          id: '4001',
          barcode: 'BK0001',
          shelfLocation: 'A 区 2 排',
          status: 'AVAILABLE',
          version: 1,
        },
      ]),
    )
  if (/^\/books\/[^/]+$/.test(path)) return ok(book)
  if (path === '/notices') return ok(page(q.get('status') === 'DRAFT' ? [] : [notice]))
  if (/^\/notices\/[^/]+$/.test(path)) return ok(notice)
  if (path === '/me/loans' || path === '/loans')
    return ok(page(q.get('status') === 'RETURNED' || q.get('overdue') === 'true' ? [] : [loan]))
  if (path === '/me/reservations' || path === '/reservations')
    return ok(
      page(q.get('status') === 'WAITING' || q.get('status') === 'HISTORY' ? [] : [reservation]),
    )
  if (path === '/stats/overview') return ok(overview)
  if (path === '/stats/loans-trend') return ok(trend)
  if (path === '/stats/top-books') return ok(topBooks)
  if (path === '/users') return ok(page([adminUser, readerUser, staffUser]))
  if (path === '/audit-logs')
    return ok(
      page([
        {
          id: '7001',
          actorId: '9001',
          actorName: '管理员',
          action: 'BOOK_CREATED',
          entityType: 'BOOK',
          entityId: '1001',
          traceId: 'trace-1',
          occurredAt: '2026-09-26T12:00:00+08:00',
        },
      ]),
    )
  if (path === '/readers/lookup')
    return ok({
      id: '5001',
      username: 'zhangsan',
      displayName: '张三',
      status: 'ACTIVE',
      activeLoanCount: 1,
      overdueLoanCount: 0,
    })
  if (path === '/copies/lookup')
    return ok({
      copy: {
        id: '4001',
        barcode: 'BK0001',
        status: 'AVAILABLE',
        shelfLocation: 'A 区 2 排',
        bookId: '1001',
        bookTitle: book.title,
      },
      readyForReaderId: null,
      activeLoan: null,
    })
  return {
    status: 404,
    body: {
      code: 'NOT_FOUND',
      message: `Fixture missing ${method} ${path}`,
      traceId: 'visual-fixture',
    },
  }
}
const groups = {
  VISITOR: [
    '/',
    '/login',
    '/register',
    '/books',
    '/books/1001',
    '/notices',
    '/notices/2001',
    '/403',
    '/missing-page',
  ],
  READER: ['/me/loans', '/me/reservations', '/me/profile', '/change-password'],
  LIBRARIAN: [
    '/staff/dashboard',
    '/staff/books',
    '/staff/books/new',
    '/staff/books/1001/edit',
    '/staff/books/1001/copies',
    '/staff/categories',
    '/staff/checkout',
    '/staff/return',
    '/staff/loans',
    '/staff/reservations',
    '/staff/notices',
    '/staff/stats',
  ],
  ADMIN: ['/staff/dashboard', '/admin/users', '/admin/audit'],
}
const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ['--no-sandbox'],
})
const results = []
const interactions = []
for (const viewport of [
  { width: 1672, height: 940 },
  { width: 1366, height: 768 },
  { width: 375, height: 812 },
]) {
  for (const [role, routes] of Object.entries(groups)) {
    const context = await browser.newContext({ viewport: viewport, deviceScaleFactor: 1 })
    await context.route('**/api/v1/**', async (route) => {
      const value = reply(
        new URL(route.request().url()),
        route.request().method(),
        role === 'VISITOR' ? null : role,
      )
      await route.fulfill({
        status: value.status || 200,
        contentType: 'application/json',
        body: JSON.stringify(value.body || value),
      })
    })
    const tab = await context.newPage()
    const errors = []
    tab.on('pageerror', (e) => errors.push(e.message))
    tab.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('401 (Unauthorized)')) errors.push(m.text())
    })
    for (const route of routes) {
      await tab.goto(base + route, { waitUntil: 'domcontentloaded' })
      await tab.waitForTimeout(350)
      const width = await tab.evaluate(() => document.documentElement.scrollWidth)
      const key = route === '/' ? 'home' : route.replace(/^\//, '').replaceAll('/', '-')
      const file = `${role.toLowerCase()}-${key}-${viewport.width}.png`
      if (viewport.width !== 1672 || ['/staff/dashboard', '/', '/login', '/books'].includes(route))
        await tab.screenshot({ path: join(out, file) })
      results.push({
        role,
        route,
        viewport: `${viewport.width}x${viewport.height}`,
        scrollWidth: width,
        overflow: width > viewport.width + 2,
        errors: [...errors],
      })
      errors.length = 0
    }
    if (viewport.width === 375) {
      if (role === 'VISITOR') {
        await tab.goto(base + '/login')
        await tab.getByRole('button', { name: '登录', exact: true }).click()
        interactions.push({
          role,
          action: 'login validation',
          visible: await tab.getByText('请填写有效的用户名和密码').isVisible(),
        })
        await tab.goto(base + '/register')
        await tab.getByRole('button', { name: '注册账号' }).click()
        interactions.push({
          role,
          action: 'registration validation',
          visible: await tab.getByText('用户名需为 4–32 位字母、数字或下划线').first().isVisible(),
        })
        await tab.goto(base + '/books')
        await tab.getByPlaceholder('书名、作者或 ISBN').fill('Java')
        await tab.getByRole('button', { name: '搜索', exact: true }).click()
        interactions.push({
          role,
          action: 'catalog search query',
          visible: new URL(tab.url()).searchParams.get('keyword') === 'Java',
        })
        await tab.goto(base + '/books/1001')
        await tab.getByRole('button', { name: '预约待取' }).click()
        await tab.waitForURL('**/login?**', { timeout: 5000 }).catch(() => undefined)
        interactions.push({
          role,
          action: 'reservation login redirect',
          visible: new URL(tab.url()).pathname === '/login',
        })
      }
      if (role === 'READER') {
        await tab.goto(base + '/me/reservations')
        await tab.getByRole('button', { name: '取消预约' }).click()
        const box = await tab.locator('.el-message-box').boundingBox()
        interactions.push({
          role,
          action: 'cancel dialog fits mobile',
          visible: !!box && box.x >= 0 && box.x + box.width <= viewport.width,
        })
      }
      if (role === 'LIBRARIAN') {
        await tab.goto(base + '/staff/categories')
        await tab.getByRole('button', { name: '新增分类' }).click()
        const box = await tab.locator('.el-dialog').boundingBox()
        interactions.push({
          role,
          action: 'category dialog fits mobile',
          visible: !!box && box.x >= 0 && box.x + box.width <= viewport.width,
        })
        await tab.goto(base + '/staff/checkout')
        await tab.getByPlaceholder('输入完整读者用户名').fill('zhangsan')
        await tab.getByRole('button', { name: '查找', exact: true }).click()
        interactions.push({
          role,
          action: 'reader lookup',
          visible: await tab.getByText('张三').isVisible(),
        })
      }
      if (role === 'ADMIN') {
        await tab.goto(base + '/admin/users')
        await tab.getByRole('button', { name: '创建员工' }).click()
        const box = await tab.locator('.el-dialog').boundingBox()
        interactions.push({
          role,
          action: 'account dialog fits mobile',
          visible: !!box && box.x >= 0 && box.x + box.width <= viewport.width,
        })
      }
    }
    await context.close()
  }
}
await browser.close()
await writeFile(join(out, 'results.json'), JSON.stringify(results, null, 2))
await writeFile(join(out, 'interactions.json'), JSON.stringify(interactions, null, 2))
const bad = results.filter((r) => r.overflow || r.errors.length)
const failedInteractions = interactions.filter((i) => !i.visible)
console.log(
  JSON.stringify(
    {
      checked: results.length,
      issues: bad.length + failedInteractions.length,
      interactions,
      details: bad.slice(0, 20),
    },
    null,
    2,
  ),
)
