import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import {
  chromium,
  assert,
  run,
  save,
  endpoints,
  secrets,
  client,
  call,
  book,
  sql,
  randomUUID,
  suite,
} from './common.mjs'
const s = suite('browser-management')
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
})
const context = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  deviceScaleFactor: 1,
})
const a = await context.newPage(),
  l = await context.newPage()
const staff = await client('demo_librarian', secrets.librarian, 'LIBRARIAN')
for (const p of [a, l]) {
  p.setDefaultTimeout(15000)
  p.setDefaultNavigationTimeout(60000)
}
const errors = []
for (const p of [a, l]) p.on('pageerror', (e) => errors.push(e.message))
mkdirSync(join(run, 'management-screenshots'), { recursive: true })
async function test(name, fn) {
  await s.test(name, async () => {
    try {
      await fn()
    } catch (error) {
      for (const [i, p] of [a, l].entries())
        await p.screenshot({
          path: join(run, 'management-screenshots', `${s.checks.length}-${i}.png`),
        })
      save(`management-failure-${s.checks.length}.json`, {
        name,
        admin: await a.locator('body').innerText(),
        librarian: await l.locator('body').innerText(),
      })
      throw error
    }
  })
}
async function login(p, role, name, password) {
  await p.goto(endpoints[role] + '/login', { waitUntil: 'networkidle' })
  await p.locator('input[autocomplete=username]').fill(name)
  await p.locator('input[autocomplete=current-password]').fill(password)
  await p.locator('.portal-submit').click()
  await p.waitForURL((url) => !url.pathname.startsWith('/login'))
  await p.waitForLoadState('networkidle')
}
async function go(p, role, path) {
  await p.goto(endpoints[role] + path, { waitUntil: 'networkidle' })
}
async function confirm(p) {
  await p.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click()
  await p.locator('.el-message-box').waitFor({ state: 'hidden' })
  await p.waitForLoadState('networkidle')
}
const row = (p, text) => p.locator('.el-table__body tr').filter({ hasText: text })
try {
  await login(a, 'ADMIN', 'demo_admin', secrets.admin)
  await login(l, 'LIBRARIAN', 'demo_librarian', secrets.librarian)
  await test('Admin creates staff; first password change, disabling and reset revoke old sessions', async () => {
    const username = 'ui_staff_' + randomUUID().slice(0, 7)
    await go(a, 'ADMIN', '/admin/users')
    await a.getByRole('button', { name: /创建员工/ }).click()
    const dialog = a.getByRole('dialog', { name: '创建员工账号' })
    await dialog.getByLabel('用户名', { exact: true }).fill(username)
    await dialog.getByLabel('显示名', { exact: true }).fill('界面测试员工')
    await dialog.getByLabel('初始密码', { exact: true }).fill(secrets.reader)
    await dialog.getByRole('button', { name: '创建账号', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    await a.getByPlaceholder('搜索用户名 / 显示名').fill(username)
    await a.getByRole('button', { name: '筛选', exact: true }).click()
    await row(a, username).waitFor()
    const employeeContext = await browser.newContext({ viewport: { width: 1366, height: 768 } }),
      employee = await employeeContext.newPage()
    await login(employee, 'LIBRARIAN', username, secrets.reader)
    assert(new URL(employee.url()).pathname === '/change-password')
    await employee.getByLabel('当前密码', { exact: true }).fill(secrets.reader)
    await employee.getByLabel('新密码', { exact: true }).fill(secrets.reader + 'Staff')
    await employee.getByLabel('确认新密码', { exact: true }).fill(secrets.reader + 'Staff')
    await employee.getByRole('button', { name: '确认修改', exact: true }).click()
    await employee.waitForURL(/\/staff\/dashboard/)
    await row(a, username).getByRole('button', { name: '禁用账号', exact: true }).click()
    await confirm(a)
    await row(a, username).getByText('已禁用', { exact: true }).waitFor()
    await employee.reload({ waitUntil: 'networkidle' })
    await employee.waitForURL(/\/login/)
    await row(a, username).getByRole('button', { name: '启用账号', exact: true }).click()
    await confirm(a)
    await row(a, username).getByText('正常', { exact: true }).waitFor()
    await login(employee, 'LIBRARIAN', username, secrets.reader + 'Staff')
    await row(a, username).getByRole('button', { name: '重置密码', exact: true }).click()
    await a.locator('.el-message-box input').fill(secrets.reader + 'Reset')
    await confirm(a)
    await employee.reload({ waitUntil: 'networkidle' })
    await employee.waitForURL(/\/login/)
    await login(employee, 'LIBRARIAN', username, secrets.reader + 'Reset')
    assert.equal(new URL(employee.url()).pathname, '/change-password')
    await employeeContext.close()
  })
  await test('Notice draft, preview, publication and withdrawal work through dialogs', async () => {
    const title = '界面公告' + randomUUID().slice(0, 8)
    await go(l, 'LIBRARIAN', '/staff/notices')
    await l.getByRole('button', { name: /新建公告/ }).click()
    const dialog = l.getByRole('dialog', { name: '新建公告', exact: true })
    await dialog.getByLabel('标题', { exact: true }).fill(title)
    await dialog
      .getByLabel('正文', { exact: true })
      .fill('第一行公告\n第二行说明\n<script>window.qaUnexpectedScript=true</script>')
    await dialog.getByRole('button', { name: '保存草稿', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    const article = l.locator('.managed-notice').filter({ hasText: title })
    await article.getByRole('button', { name: '预览', exact: true }).click()
    const preview = l.getByRole('dialog', { name: '公告预览', exact: true })
    await preview.getByText(title, { exact: true }).waitFor()
    assert.equal(await l.evaluate(() => window.qaUnexpectedScript), undefined)
    await preview.getByRole('button', { name: /关闭|Close/ }).click()
    await article.getByRole('button', { name: '发布', exact: true }).click()
    await confirm(l)
    if (await preview.isVisible()) await preview.getByRole('button', { name: /关闭|Close/ }).click()
    await l.getByRole('tab', { name: '已发布', exact: true }).click()
    await article.getByRole('button', { name: '撤下', exact: true }).click()
    await confirm(l)
    await l.getByRole('tab', { name: '已撤下', exact: true }).click()
    await article.waitFor()
    const guest = await client(null, null, 'READER')
    const results = (await call(guest, 'GET', '/notices?status=PUBLISHED&page=1&size=100')).data
    assert(!results.items.some((x) => x.title === title))
    await guest.context.dispose()
  })
  await test('Copy location, maintenance, recovery and retirement persist via UI', async () => {
    const b = await book(staff, 'ui-copy-status')
    const barcode = b.copies[0].barcode
    await go(l, 'LIBRARIAN', `/staff/books/${b.id}/copies`)
    await row(l, barcode).getByRole('button', { name: /位置/ }).click()
    await l.locator('.el-message-box input').fill('UI-NEW-SHELF')
    await confirm(l)
    await row(l, barcode).getByText('UI-NEW-SHELF', { exact: true }).waitFor()
    await row(l, barcode).getByRole('button', { name: '转维修', exact: true }).click()
    await confirm(l)
    await row(l, barcode)
      .getByRole('button', { name: /恢复|可借/ })
      .click()
    await confirm(l)
    await row(l, barcode).getByRole('button', { name: '退役', exact: true }).click()
    await confirm(l)
    assert.equal(sql(`SELECT status FROM book_copies WHERE id=${b.copies[0].id};`), 'RETIRED')
  })
  await test('Catalog pagination filtering resets the page; disable and enable update public access', async () => {
    const b = await book(staff, 'ui-catalog-filter')
    await go(l, 'LIBRARIAN', '/staff/books')
    await l.locator('.el-pagination .btn-next').click()
    await l.waitForLoadState('networkidle')
    await l.getByPlaceholder('搜索书名、作者或 ISBN').fill(b.title)
    await l.getByRole('button', { name: '查询', exact: true }).click()
    const card = l.locator('.staff-book-card').filter({ hasText: b.title })
    await card.waitFor()
    assert.equal(await l.locator('.el-pagination .is-active').innerText(), '1')
    await card.getByRole('button', { name: '停用', exact: true }).click()
    await confirm(l)
    const guest = await client(null, null, 'READER')
    await call(guest, 'GET', `/books/${b.id}`, undefined, undefined, 404)
    await card.getByRole('button', { name: '上架', exact: true }).click()
    await confirm(l)
    await call(guest, 'GET', `/books/${b.id}`, undefined, undefined, 200)
    await guest.context.dispose()
  })
  await test('Logout and role guards block subsequent private navigation', async () => {
    await go(l, 'LIBRARIAN', '/admin/users')
    assert.equal(new URL(l.url()).pathname, '/403')
    await go(a, 'ADMIN', '/staff/dashboard')
    await a.locator('.account-button').click()
    await a.getByText('退出登录', { exact: true }).click()
    await a.waitForURL(/\/login/)
    await go(a, 'ADMIN', '/admin/users')
    assert.equal(new URL(a.url()).pathname, '/login')
    assert.equal(errors.length, 0)
  })
} finally {
  save('browser-management-errors.json', errors)
  await browser.close()
  await staff.context.dispose()
  s.finish()
}
