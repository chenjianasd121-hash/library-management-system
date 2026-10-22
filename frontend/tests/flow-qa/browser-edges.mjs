import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import {
  chromium,
  assert,
  run,
  save,
  secrets,
  endpoints,
  seededReaders,
  client,
  call,
  book,
  sql,
  randomUUID,
  suite,
} from './common.mjs'
const s = suite('browser-edges')
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
})
const context = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  deviceScaleFactor: 1,
})
const p = await context.newPage()
p.setDefaultTimeout(12000)
p.setDefaultNavigationTimeout(60000)
const staff = await client('demo_librarian', secrets.librarian, 'LIBRARIAN')
const readers = await seededReaders(3)
const b = await book(staff, 'lookup-edge', 3)
mkdirSync(join(run, 'edge-screenshots'), { recursive: true })
async function test(label, fn) {
  await s.test(label, async () => {
    try {
      await fn()
    } catch (error) {
      await p.screenshot({ path: join(run, 'edge-screenshots', `${s.checks.length}.png`) })
      save(`edge-failure-${s.checks.length}.json`, {
        label,
        url: p.url(),
        text: await p.locator('body').innerText(),
      })
      throw error
    } finally {
      await p.unrouteAll({ behavior: 'ignoreErrors' })
      await context.setOffline(false)
    }
  })
}
async function goto(path) {
  await p.goto(endpoints.LIBRARIAN + path, { waitUntil: 'networkidle' })
}
async function checkReader(username) {
  await p.getByPlaceholder('请输入完整读者账号').fill(username)
  await p.getByRole('button', { name: '查找', exact: true }).click()
  await p.locator('.verified-identity').first().waitFor()
}
async function checkCopy(barcode) {
  await p.getByPlaceholder('请扫描或输入副本条码').fill(barcode)
  await p.getByRole('button', { name: '核对', exact: true }).click()
  await p.locator('.copy-details').waitFor()
}
async function setup() {
  await goto('/staff/checkout')
  await checkReader(readers[0].user.username)
  await checkCopy(b.copies[0].barcode)
  assert(await p.getByRole('button', { name: '确认借出', exact: true }).isEnabled())
}
try {
  await p.goto(endpoints.LIBRARIAN + '/login', { waitUntil: 'networkidle' })
  await p.locator('input[autocomplete=username]').fill('demo_librarian')
  await p.locator('input[autocomplete=current-password]').fill(secrets.librarian)
  await p.locator('.portal-submit').click()
  await p.waitForURL(/\/staff\/dashboard/)
  await test('Editing a checked reader invalidates checkout confirmation', async () => {
    await setup()
    await p.getByPlaceholder('请输入完整读者账号').fill(readers[1].user.username)
    assert(
      await p.getByRole('button', { name: '确认借出', exact: true }).isDisabled(),
      'A changed username still allows lending to the previously checked reader',
    )
  })
  await test('Editing a checked barcode invalidates checkout confirmation', async () => {
    await setup()
    await p.getByPlaceholder('请扫描或输入副本条码').fill('UNVERIFIED_BARCODE')
    assert(
      await p.getByRole('button', { name: '确认借出', exact: true }).isDisabled(),
      'Changed barcode still permits lending the old copy',
    )
  })
  await test('Editing a checked return barcode invalidates return confirmation', async () => {
    const loan = (
      await call(
        staff,
        'POST',
        '/loans',
        { readerId: readers[2].user.id, copyBarcode: b.copies[1].barcode },
        randomUUID(),
        201,
      )
    ).data
    await goto('/staff/return')
    await p.getByPlaceholder('请扫描或输入副本条码').fill(loan.copyBarcode)
    await p.getByRole('button', { name: '核对', exact: true }).click()
    await p.locator('.return-book').waitFor()
    await p.getByPlaceholder('请扫描或输入副本条码').fill('UNVERIFIED_RETURN')
    assert(
      await p.getByRole('button', { name: '确认归还', exact: true }).isDisabled(),
      'Changed barcode still permits returning the old loan',
    )
  })
  await test('An older reader lookup cannot overwrite a newer lookup', async () => {
    let release, intercepted
    const gate = new Promise((r) => (release = r)),
      seen = new Promise((r) => (intercepted = r))
    await p.route('**/api/v1/readers/lookup?**', async (route) => {
      if (
        new URL(route.request().url()).searchParams.get('username') === readers[0].user.username
      ) {
        const response = await route.fetch()
        intercepted()
        await gate
        await route.fulfill({ response })
      } else await route.continue()
    })
    await goto('/staff/checkout')
    await p.getByPlaceholder('请输入完整读者账号').fill(readers[0].user.username)
    await p.getByPlaceholder('请输入完整读者账号').press('Enter')
    await seen
    await p.getByPlaceholder('请输入完整读者账号').fill(readers[1].user.username)
    await p.getByPlaceholder('请输入完整读者账号').press('Enter')
    await p.waitForFunction(
      (name) => document.querySelector('.verified-identity')?.textContent?.includes(name),
      readers[1].user.username,
    )
    release()
    await p.waitForLoadState('networkidle')
    const text = await p.locator('.verified-identity').first().innerText()
    assert(text.includes(readers[1].user.username), 'Old lookup replaced the newer reader identity')
  })
  await test('An older search cannot overwrite the latest search results', async () => {
    const first = await book(staff, 'search-old'),
      second = await book(staff, 'search-new')
    let release, intercepted
    const gate = new Promise((r) => (release = r)),
      seen = new Promise((r) => (intercepted = r))
    await p.route('**/api/v1/books?**', async (route) => {
      if (new URL(route.request().url()).searchParams.get('keyword') === first.title) {
        const response = await route.fetch()
        intercepted()
        await gate
        await route.fulfill({ response })
      } else await route.continue()
    })
    await p.goto(endpoints.LIBRARIAN + '/books?keyword=' + encodeURIComponent(first.title), {
      waitUntil: 'domcontentloaded',
    })
    await seen
    await p.locator('.catalogue-filter input').first().fill(second.title)
    await p.locator('.catalogue-filter').getByRole('button', { name: '搜索', exact: true }).click()
    await p.getByText(second.title, { exact: true }).waitFor()
    release()
    await p.waitForLoadState('networkidle')
    assert.equal(
      await p.getByText(second.title, { exact: true }).count(),
      1,
      'Old search results replaced the selected query',
    )
    assert.equal(await p.getByText(first.title, { exact: true }).count(), 0)
  })
  await test('Lost checkout response retries with the same key and persists once', async () => {
    const retryBook = await book(staff, 'lost-response')
    await goto('/staff/checkout')
    await checkReader(readers[1].user.username)
    await checkCopy(retryBook.copies[0].barcode)
    let failed = false
    await p.route('**/api/v1/loans', async (route) => {
      if (route.request().method() === 'POST' && !failed) {
        failed = true
        const response = await route.fetch()
        assert.equal(response.status(), 201)
        await route.abort('failed')
      } else await route.continue()
    })
    await p.getByRole('button', { name: '确认借出', exact: true }).click()
    await p.getByText(/无法连接后端服务/).waitFor()
    await p.getByRole('button', { name: '确认借出', exact: true }).click()
    await p.getByText('借出完成', { exact: true }).waitFor()
    assert.equal(sql(`SELECT COUNT(*) FROM loans WHERE book_id=${retryBook.id};`), '1')
  })
  await test('Offline read shows retry and recovers after connectivity returns', async () => {
    await goto('/books')
    await p.route('**/api/v1/books?**', (route) => route.abort('failed'))
    await p.locator('.catalogue-filter input').first().fill('offline-case')
    await p.locator('.catalogue-filter').getByRole('button', { name: '搜索', exact: true }).click()
    await p.getByText(/无法连接后端服务/).waitFor()
    await p.unrouteAll({ behavior: 'ignoreErrors' })
    await p.getByRole('button', { name: /重试|重新加载/ }).click()
    await p.getByText('未找到符合条件的图书', { exact: true }).waitFor()
    assert.equal(await p.getByText(/无法连接后端服务/).count(), 0)
  })
  await test('Request timeout restores retry controls without automatic writes', async () => {
    await goto('/books')
    await p.route('**/api/v1/books?**', () => new Promise((resolve) => setTimeout(resolve, 17000)))
    await p.locator('.catalogue-filter input').first().fill('timeout-case')
    await p.locator('.catalogue-filter').getByRole('button', { name: '搜索', exact: true }).click()
    await p.getByText(/请求超时/).waitFor({ timeout: 19000 })
    assert(await p.getByRole('button', { name: /重试|重新加载/ }).isEnabled())
  })
} finally {
  await browser.close()
  await Promise.all([staff, ...readers].map((x) => x.context.dispose()))
  s.finish()
}
