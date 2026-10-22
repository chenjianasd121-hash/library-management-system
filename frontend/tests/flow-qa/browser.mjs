import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  chromium,
  assert,
  run,
  save,
  endpoints,
  secrets,
  seededReaders,
  client,
  book,
  sql,
  randomUUID,
  suite,
} from './common.mjs'

const s = suite('browser')
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
})
const context = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  deviceScaleFactor: 1,
})
const readerContext = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  deviceScaleFactor: 1,
})
const a = await context.newPage(),
  l = await context.newPage(),
  r = await context.newPage(),
  r2 = await readerContext.newPage()
const staff = await client('demo_librarian', secrets.librarian, 'LIBRARIAN')
const readers = await seededReaders(4)
const pages = [a, l, r, r2]
const logs = []
let current = ''
for (const [index, p] of pages.entries()) {
  p.setDefaultTimeout(12000)
  p.setDefaultNavigationTimeout(60000)
  p.on('pageerror', (error) =>
    logs.push({ type: 'pageerror', case: current, page: index, error: error.message }),
  )
  p.on('response', (response) => {
    if (response.url().includes('/api/v1/') && response.status() >= 400)
      logs.push({
        type: 'http',
        case: current,
        page: index,
        status: response.status(),
        url: response.url(),
      })
  })
}
mkdirSync(join(run, 'screenshots'), { recursive: true })
async function test(label, fn) {
  current = label
  await s.test(label, async () => {
    try {
      await fn()
    } catch (error) {
      for (const [i, p] of pages.entries()) {
        await p
          .screenshot({ path: join(run, 'screenshots', `failure-${s.checks.length}-${i}.png`) })
          .catch(() => {})
        writeFileSync(
          join(run, `failure-${s.checks.length}-${i}.txt`),
          await p
            .locator('body')
            .innerText()
            .catch(() => ''),
        )
      }
      throw error
    } finally {
      save('browser-network.json', logs)
    }
  })
}
async function login(page, role, username, password) {
  await page.goto(endpoints[role] + '/login', { waitUntil: 'networkidle' })
  await page.locator('input[autocomplete="username"]').fill(username)
  await page.locator('input[autocomplete="current-password"]').fill(password)
  await page.locator('.portal-submit').click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
  await page.waitForLoadState('networkidle')
}
const goto = async (page, role, path) => {
  await page.goto(endpoints[role] + path, { waitUntil: 'networkidle' })
}
const confirm = async (page) => {
  await page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click()
  await page.waitForLoadState('networkidle')
}
const row = (page, text) => page.locator('.el-table__body tr').filter({ hasText: text })
async function reserve(page, id) {
  await goto(page, 'READER', `/books/${id}`)
  const response = page.waitForResponse(
    (x) => x.request().method() === 'POST' && x.url().endsWith('/api/v1/reservations'),
  )
  await page.getByRole('button', { name: /^预约(待取|排队)$/ }).click()
  assert.equal((await response).status(), 201)
}
async function checkout(username, barcode) {
  await goto(l, 'LIBRARIAN', '/staff/checkout')
  await l.getByPlaceholder('请输入完整读者账号').fill(username)
  await l.getByRole('button', { name: '查找', exact: true }).click()
  await l.locator('.verified-identity').first().waitFor()
  await l.getByPlaceholder('请扫描或输入副本条码').fill(barcode)
  await l.getByRole('button', { name: '核对', exact: true }).click()
  await l.getByRole('button', { name: '确认借出', exact: true }).waitFor({ state: 'visible' })
  await l.getByRole('button', { name: '确认借出', exact: true }).click()
  await l.getByText('借出完成', { exact: true }).waitFor()
}
async function returnCopy(barcode) {
  await goto(l, 'LIBRARIAN', '/staff/return')
  await l.getByPlaceholder('请扫描或输入副本条码').fill(barcode)
  await l.getByRole('button', { name: '核对', exact: true }).click()
  await l.locator('.return-book').waitFor()
  await l.getByRole('button', { name: '确认归还', exact: true }).click()
  await l.getByText('归还完成', { exact: true }).waitFor()
}
let uiBookId, uiBarcode, uiTitle
try {
  await test('Three portals log in and retain independent sessions on refresh', async () => {
    await login(a, 'ADMIN', 'demo_admin', secrets.admin)
    await login(l, 'LIBRARIAN', 'demo_librarian', secrets.librarian)
    await login(r, 'READER', readers[0].user.username, secrets.reader)
    await login(r2, 'READER', readers[1].user.username, secrets.reader)
    for (const p of pages) {
      await p.reload({ waitUntil: 'networkidle' })
      assert(!p.url().includes('/login'))
    }
  })
  await test('Librarian creates category, book, cover and copy through the UI', async () => {
    const code = 'UI' + randomUUID().slice(0, 7)
    await goto(l, 'LIBRARIAN', '/staff/categories')
    await l.getByRole('button', { name: /新增分类/ }).click()
    const d = l.getByRole('dialog')
    await d.getByLabel('分类名称', { exact: true }).fill('界面分类' + code)
    await d.getByLabel('分类编码', { exact: true }).fill(code)
    await d.getByRole('button', { name: '保存', exact: true }).click()
    await d.waitFor({ state: 'hidden' })
    await goto(l, 'LIBRARIAN', '/staff/books/new')
    uiTitle = '界面流程书目' + code
    await l.getByLabel('书名', { exact: true }).fill(uiTitle)
    await l.getByLabel('作者', { exact: true }).fill('界面测试作者')
    await l.locator('.staff-form-grid .el-select').first().click()
    await l.getByRole('option', { name: '界面分类' + code, exact: true }).click()
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==',
      'base64',
    )
    const upload = l.waitForResponse(
      (x) => x.url().endsWith('/media/covers') && x.request().method() === 'POST',
    )
    await l
      .locator('input[type=file]')
      .setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: png })
    assert.equal((await upload).status(), 201)
    await l.getByRole('button', { name: '保存书目', exact: true }).click()
    await l.waitForURL(/\/staff\/books\/\d+\/copies/)
    uiBookId = l.url().match(/books\/(\d+)/)[1]
    uiBarcode = 'UI' + randomUUID().replaceAll('-', '').slice(0, 18)
    await l.locator('#copy-barcodes').fill(uiBarcode)
    await l.locator('#copy-location').fill('UI-A-1')
    await l.getByRole('button', { name: '添加副本', exact: true }).click()
    await row(l, uiBarcode).waitFor()
  })
  await test('Two readers reserve, librarian lends and returns, next reader receives pickup', async () => {
    assert(uiBookId, 'Book creation prerequisite failed')
    await reserve(r, uiBookId)
    await reserve(r2, uiBookId)
    await goto(r2, 'READER', '/me/reservations')
    await r2.getByText('排队中', { exact: true }).first().click()
    await row(r2, uiTitle).waitFor()
    await checkout(readers[0].user.username, uiBarcode)
    await goto(r, 'READER', '/me/loans')
    await row(r, uiTitle).waitFor()
    assert.equal(
      await row(r, uiTitle).getByRole('button', { name: '续借', exact: true }).count(),
      0,
    )
    await returnCopy(uiBarcode)
    await goto(r2, 'READER', '/me/reservations')
    await row(r2, uiBarcode).waitFor()
    await checkout(readers[1].user.username, uiBarcode)
    await goto(r2, 'READER', '/me/loans')
    await row(r2, uiTitle).getByRole('button', { name: '续借', exact: true }).click()
    await confirm(r2)
    await r2.getByText(/续借成功/).waitFor()
    await returnCopy(uiBarcode)
    assert.equal(
      sql(`SELECT COUNT(*) FROM loans WHERE book_id=${uiBookId} AND status='RETURNED';`),
      '2',
    )
  })
  await test('Reader cancels a pickup reservation through confirmation dialog', async () => {
    const b = await book(staff, 'ui-cancel')
    await reserve(r, b.id)
    await goto(r, 'READER', '/me/reservations')
    await row(r, b.title).getByRole('button', { name: '取消预约', exact: true }).click()
    await confirm(r)
    await row(r, b.title).waitFor({ state: 'hidden' })
    assert.equal(sql(`SELECT status FROM reservations WHERE book_id=${b.id};`), 'CANCELLED')
  })
  await test('Registration, profile editing and password change work in browser', async () => {
    const guestContext = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      deviceScaleFactor: 1,
    })
    const p = await guestContext.newPage()
    const name = 'ui_' + randomUUID().slice(0, 8)
    await goto(p, 'READER', '/register')
    await p.getByLabel('用户名', { exact: true }).fill(name)
    await p.getByLabel('显示名', { exact: true }).fill('界面新读者')
    await p.getByLabel('密码', { exact: true }).fill(secrets.reader)
    await p.getByLabel('确认密码', { exact: true }).fill(secrets.reader)
    await p.getByRole('button', { name: '注册账号', exact: true }).click()
    await p.waitForURL(/\/login/)
    await login(p, 'READER', name, secrets.reader)
    await goto(p, 'READER', '/me/profile')
    await p.getByLabel('显示名', { exact: true }).fill('界面资料已修改')
    await p.getByRole('button', { name: /保存/ }).click()
    await p.reload({ waitUntil: 'networkidle' })
    assert.equal(await p.getByLabel('显示名', { exact: true }).inputValue(), '界面资料已修改')
    await goto(p, 'READER', '/change-password')
    await p.getByLabel('当前密码', { exact: true }).fill(secrets.reader)
    await p.getByLabel('新密码', { exact: true }).fill(secrets.reader + 'New')
    await p.getByLabel('确认新密码', { exact: true }).fill(secrets.reader + 'New')
    await p.getByRole('button', { name: '确认修改', exact: true }).click()
    await p.waitForURL((url) => url.pathname != '/change-password')
    await guestContext.close()
  })
  await test('All role routes render in both desktop viewports without page errors or document overflow', async () => {
    const routes = [
      [
        a,
        'ADMIN',
        ['/staff/dashboard', '/admin/users', '/admin/audit', '/staff/stats', '/staff/notices'],
      ],
      [
        l,
        'LIBRARIAN',
        [
          '/staff/dashboard',
          '/staff/books',
          '/staff/books/new',
          '/staff/categories',
          '/staff/checkout',
          '/staff/return',
          '/staff/loans',
          '/staff/reservations',
          '/staff/stats',
          '/staff/notices',
          '/books',
          '/notices',
          '/me/profile',
          ...(uiBookId ? [`/staff/books/${uiBookId}/edit`, `/staff/books/${uiBookId}/copies`] : []),
        ],
      ],
      [
        r,
        'READER',
        [
          '/',
          '/books',
          '/notices',
          '/me/loans',
          '/me/reservations',
          '/me/profile',
          '/change-password',
          '/403',
          '/not-a-route',
          ...(uiBookId ? [`/books/${uiBookId}`] : []),
        ],
      ],
    ]
    const layout = []
    for (const viewport of [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
    ]) {
      for (const [p, role, paths] of routes) {
        await p.setViewportSize(viewport)
        for (const path of paths) {
          await goto(p, role, path)
          assert(!p.url().includes('/login'), `${role} ${path}: unexpected login`)
          const dimensions = await p.evaluate(() => ({
            scroll: document.documentElement.scrollWidth,
            width: innerWidth,
            height: innerHeight,
            bodyText: document.body.innerText.length,
          }))
          layout.push({ role, path, viewport, ...dimensions })
          assert(dimensions.bodyText > 40)
          assert(dimensions.scroll <= dimensions.width, `${role} ${path}: document overflow`)
          if (['/staff/checkout', '/staff/dashboard', '/books', '/me/reservations'].includes(path))
            await p.screenshot({
              path: join(
                run,
                'screenshots',
                `${role}-${path.replaceAll('/', '-')}-${viewport.width}.png`,
              ),
            })
        }
      }
    }
    save('browser-layout.json', layout)
    assert.equal(logs.filter((x) => x.type === 'pageerror').length, 0)
  })
} finally {
  save('browser-network.json', logs)
  await browser.close()
  await Promise.all([staff, ...readers].map((x) => x.context.dispose()))
  s.finish()
}
