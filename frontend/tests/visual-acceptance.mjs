// Read-only Chrome captures for the selected frontend handoff. Never mock business responses.
import { chromium } from 'playwright-core'
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs'
import { resolve, join, relative, isAbsolute, sep } from 'node:path'
import { createHash } from 'node:crypto'

const workspace = resolve(import.meta.dirname, '../..')
const outputRoot = join(workspace, 'output/visual-acceptance')
mkdirSync(outputRoot, { recursive: true })
const pointer = join(outputRoot, 'current-run.txt')
const preparing = process.argv.includes('--prepare')
const run = preparing
  ? join(outputRoot, 'run-' + new Date().toISOString().replace(/[:.]/g, '-'))
  : resolve(readFileSync(pointer, 'utf8').trim())
const child = relative(outputRoot, run)
if (!child || child === '..' || child.startsWith('..' + sep) || isAbsolute(child))
  throw new Error('Visual output must remain inside the project output directory')
const matrixPath = join(run, 'matrix.json')
const source = join(workspace, 'design/frontend-handoff')
const portals = {
  admin: { base: 'http://127.0.0.3:5175', username: 'test_admin_1022' },
  librarian: { base: 'http://127.0.0.2:5174', username: 'test_librarian_1022' },
  reader: { base: 'http://127.0.0.1:5173', username: 'test_reader1_1022' },
}
const json = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2))
const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
function checkpoint(matrix, phase) {
  json(matrixPath, matrix)
  json(join(run, 'checkpoint.json'), {
    updatedAt: new Date().toISOString(),
    phase,
    capturedScreenshots: matrix.entries.reduce((n, e) => n + (e.captures?.length || 0), 0),
    nextUnfinished:
      matrix.entries.find((e) => e.kind === 'page' && (e.captures?.length || 0) < 3)?.id ||
      'dialogs-and-states',
    reviewStatus: 'pending visual review; screenshot capture is not approval',
  })
}
if (preparing) {
  if (existsSync(run)) throw new Error('Run exists; resume its checkpoint')
  mkdirSync(join(run, 'references'), { recursive: true })
  mkdirSync(join(run, 'current'), { recursive: true })
  mkdirSync(join(run, 'comparisons'), { recursive: true })
  const handoff = JSON.parse(readFileSync(join(source, 'manifest.json'), 'utf8'))
  const entries = handoff.entries.map((entry) => {
    const origin = entry.file ? entry : handoff.entries.find((e) => e.id === entry.reuse_of)
    if (!origin?.file) throw new Error(`Unresolved source: ${entry.id}`)
    const original = join(source, origin.file)
    const hash = digest(original)
    if (hash !== origin.sha256) throw new Error(`Reference hash changed: ${entry.id}`)
    const reference = 'references/' + entry.id + '.png'
    copyFileSync(original, join(run, reference))
    if (digest(join(run, reference)) !== hash) throw new Error('Reference copy mismatch')
    return {
      id: entry.id,
      role: entry.role,
      title: entry.title,
      kind: entry.kind,
      routes: entry.routes,
      original: relative(workspace, original).replaceAll('\\', '/'),
      reference,
      width: entry.width,
      height: entry.height,
      sha256: hash,
      reuseOf: entry.reuse_of,
      note: entry.note,
      targetState: entry.title,
      captureStatus: entry.kind === 'page' ? 'pending' : 'needs-state-setup',
      reviewStatus: 'not-reviewed',
      captures: [],
    }
  })
  const matrix = {
    createdAt: new Date().toISOString(),
    sourceManifest: 'design/frontend-handoff/manifest.json',
    sourceManifestSha256: digest(join(source, 'manifest.json')),
    run,
    method: 'Google Chrome headless; real backend; read-only business requests; sRGB; 100% zoom',
    viewportPolicy: 'Exact source pixels at deviceScaleFactor=1, plus 1366x768 and 1920x1080',
    contentPolicy:
      'Live book titles, counts, account names and dates may differ. Do not use full-image similarity as a fidelity score.',
    entries,
  }
  writeFileSync(pointer, run)
  checkpoint(matrix, 'references-verified-and-matrix-prepared')
  console.log(
    JSON.stringify({
      run,
      references: entries.length,
      pages: entries.filter((e) => e.kind === 'page').length,
      result: 'PREPARED',
    }),
  )
  process.exit(0)
}

const matrix = JSON.parse(readFileSync(matrixPath, 'utf8'))
const revision = process.argv.find((x) => x.startsWith('--revision='))?.slice(11) || 'baseline'
if (!/^[a-z0-9-]+$/.test(revision)) throw new Error('Invalid capture revision')
const verifiedCheckout = process.argv.includes('--verified-checkout')
const requestedSizes = process.argv
  .find((x) => x.startsWith('--sizes='))
  ?.slice(8)
  .split(',')
const selected = process.argv
  .find((x) => x.startsWith('--ids='))
  ?.slice(6)
  .split(',')
const pages = matrix.entries.filter(
  (e) => e.kind === 'page' && (!selected || selected.includes(e.id)),
)
if (!pages.length) throw new Error('No selected page references')
const credentials = JSON.parse(
  readFileSync(join(workspace, 'output/runtime/local-test-seed/accounts.private.json'), 'utf8'),
)
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--force-color-profile=srgb'],
})
const contexts = new Map()
const errors = []
let pendingPhase = 0
async function session(role, guest) {
  const key = role + (guest ? '-guest' : '-signed-in')
  if (contexts.has(key)) return contexts.get(key)
  const context = await browser.newContext({
    viewport: { width: 1487, height: 1058 },
    deviceScaleFactor: 1,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  })
  await context.route('**/api/v1/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    if (
      req.method() !== 'GET' &&
      !['/api/v1/auth/login', '/api/v1/auth/logout'].includes(url.pathname)
    ) {
      errors.push({
        type: 'unexpected-business-write-blocked',
        path: url.pathname,
        method: req.method(),
      })
      await route.abort('blockedbyclient')
    } else await route.continue()
  })
  const page = await context.newPage()
  page.setDefaultNavigationTimeout(60000)
  page.setDefaultTimeout(12000)
  page.on('pageerror', (e) => errors.push({ type: 'pageerror', role, message: e.message }))
  if (!guest) {
    await page.goto(portals[role].base + '/login', { waitUntil: 'networkidle' })
    await page.locator('input[autocomplete="username"]').fill(portals[role].username)
    await page.locator('input[autocomplete="current-password"]').fill(credentials.password)
    await page.locator('.portal-submit').click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'))
    await page.locator('.el-message').waitFor({ state: 'hidden' })
  }
  const value = { context, page }
  contexts.set(key, value)
  return value
}
const samples = {}
const checkoutBarcodes = {}
async function prepareCheckout(entry, page) {
  if (!entry.id.endsWith('-checkout'))
    throw new Error('Verified checkout setup requires a checkout page')
  if (!checkoutBarcodes[entry.role]) {
    checkoutBarcodes[entry.role] = await page.evaluate(
      async ({ role, username }) => {
        const get = async (path) =>
          (
            await (
              await fetch('/api/v1' + path, { headers: { 'X-Portal-Role': role.toUpperCase() } })
            ).json()
          ).data
        const books = await get('/books?page=1&size=100')
        const loans = await get(
          '/loans?status=ACTIVE&readerKeyword=' + username + '&page=1&size=100',
        )
        const active = new Set(loans.items.map((l) => l.bookId))
        for (const book of books.items.filter((b) => b.availableCopies > 0 && !active.has(b.id))) {
          const copies = await get('/books/' + book.id + '/copies?page=1&size=100')
          const available = copies.items.find((c) => c.status === 'AVAILABLE')
          if (available) return available.barcode
        }
        throw new Error('No available live copy for read-only checkout verification')
      },
      { role: entry.role, username: portals.reader.username },
    )
  }
  await page.getByPlaceholder('请输入完整读者账号').fill(portals.reader.username)
  await page.getByRole('button', { name: '查找', exact: true }).click()
  await page.locator('.verified-identity').first().waitFor()
  await page.getByPlaceholder('请扫描或输入副本条码').fill(checkoutBarcodes[entry.role])
  await page.getByRole('button', { name: '核对', exact: true }).click()
  await page.locator('.verified-identity').nth(1).waitFor()
  if (!(await page.getByRole('button', { name: '确认借出', exact: true }).isEnabled()))
    throw new Error('Live reader/copy are not eligible for the source checkout state')
  // Never click Confirm: matching the verified state needs only GET requests.
}
async function materialize(entry, page) {
  if (!samples[entry.role]) {
    samples[entry.role] = await page.evaluate(async (role) => {
      const headers = { 'X-Portal-Role': role.toUpperCase() }
      const books = await (await fetch('/api/v1/books?page=1&size=1', { headers })).json()
      const notices = await (
        await fetch('/api/v1/notices?status=PUBLISHED&page=1&size=1', { headers })
      ).json()
      return { book: books.data?.items?.[0]?.id, notice: notices.data?.items?.[0]?.id }
    }, entry.role)
  }
  let path = entry.routes[0]
  if (path.includes(':pathMatch')) return '/visual-acceptance-not-found'
  if (path.includes(':id')) {
    const value = path.includes('notices') ? samples[entry.role].notice : samples[entry.role].book
    if (!value) throw new Error(`No live item for ${entry.id}`)
    path = path.replace(':id', value)
  }
  return path
}
try {
  matrix.chromeVersion = browser.version()
  for (const entry of pages) {
    const guest = ['/login', '/register'].includes(entry.routes[0])
    const { page } = await session(entry.role, guest)
    const route = await materialize(entry, page)
    for (const size of [
      { key: 'reference', width: entry.width, height: entry.height },
      { key: '1366', width: 1366, height: 768 },
      { key: '1920', width: 1920, height: 1080 },
    ]) {
      if (requestedSizes && !requestedSizes.includes(size.key)) continue
      if (
        entry.captures.some(
          (c) =>
            c.key === size.key &&
            c.status === 'captured' &&
            (!verifiedCheckout || c.state === 'reader-and-copy-verified') &&
            (revision === 'baseline' || c.revision === revision),
        )
      )
        continue
      await page.setViewportSize({ width: size.width, height: size.height })
      await page.goto(portals[entry.role].base + route, { waitUntil: 'networkidle' })
      if (!guest && page.url().includes('/login')) throw new Error('Unexpected session loss')
      if (verifiedCheckout) await prepareCheckout(entry, page)
      await page.evaluate(async () => {
        await document.fonts.ready
        await Promise.all([...document.images].map((img) => img.decode().catch(() => {})))
        const main = document.querySelector('.page-content')
        if (main) main.scrollTo(0, 0)
        window.scrollTo(0, 0)
      })
      await page.waitForTimeout(300)
      const metadata = await page.evaluate(() => {
        const selectors = [
          '.sidebar',
          '.topbar',
          '.page-content',
          '.portal-visual',
          '.portal-form-card',
          '.portal-form-card h2',
          '.page-heading h1',
          '.hero',
          '.home-hero',
          '.metric',
          '.el-button--primary',
        ]
        const elements = Object.fromEntries(
          selectors.map((selector) => {
            const node = document.querySelector(selector)
            if (!node) return [selector, null]
            const s = getComputedStyle(node),
              b = node.getBoundingClientRect()
            return [
              selector,
              {
                x: b.x,
                y: b.y,
                width: b.width,
                height: b.height,
                font: s.fontFamily,
                fontSize: s.fontSize,
                fontWeight: s.fontWeight,
                lineHeight: s.lineHeight,
                color: s.color,
                background: s.backgroundColor,
                radius: s.borderRadius,
              },
            ]
          }),
        )
        return {
          width: innerWidth,
          height: innerHeight,
          dpr: devicePixelRatio,
          zoom: getComputedStyle(document.documentElement).zoom,
          scrollWidth: document.documentElement.scrollWidth,
          elements,
          brokenImages: [...document.images]
            .filter((img) => !img.complete || img.naturalWidth === 0)
            .map((img) => img.getAttribute('src')),
        }
      })
      if (metadata.dpr !== 1 || metadata.width !== size.width)
        throw new Error('Capture density mismatch')
      if (verifiedCheckout) {
        const action = await page
          .getByRole('button', { name: '确认借出', exact: true })
          .boundingBox()
        metadata.confirmAction = action
        if (size.height <= 900 && (!action || action.y + action.height > size.height))
          throw new Error('Verified checkout confirmation extends below the short desktop viewport')
      }
      const folder = join(run, 'current', entry.id)
      mkdirSync(folder, { recursive: true })
      const filename =
        'current/' +
        entry.id +
        '/' +
        (revision === 'baseline' ? '' : revision + '-') +
        size.key +
        '.png'
      const previous = entry.captures.find((c) => c.key === size.key)
      if (previous) {
        const archived =
          previous.file === filename
            ? 'current/' + entry.id + '/initial-' + size.key + '.png'
            : previous.file
        if (previous.file === filename) copyFileSync(join(run, previous.file), join(run, archived))
        entry.previousStates ||= []
        entry.previousStates.push({ ...previous, file: archived })
      }
      await page.screenshot({
        path: join(run, filename),
        animations: 'disabled',
        caret: 'hide',
        fullPage: false,
      })
      entry.captures = entry.captures.filter((c) => c.key !== size.key)
      entry.captures.push({
        key: size.key,
        status: 'captured',
        file: filename,
        url: page.url(),
        capturedAt: new Date().toISOString(),
        state: verifiedCheckout ? 'reader-and-copy-verified' : 'initial-route-state',
        revision,
        sha256: digest(join(run, filename)),
        ...metadata,
      })
      entry.captureStatus = entry.captures.length === 3 ? 'captured-unreviewed' : 'partial'
      pendingPhase++
      if (pendingPhase === 3) {
        checkpoint(matrix, 'capture-baseline-in-progress')
        json(join(run, 'capture-errors.json'), errors)
        console.log(
          `CHECKPOINT ${entry.id}: ${matrix.entries.reduce((n, e) => n + e.captures.length, 0)} saved screenshots`,
        )
        pendingPhase = 0
      }
    }
  }
  checkpoint(matrix, 'selected-page-baselines-captured')
} catch (e) {
  errors.push({ type: 'capture-blocker', message: e.stack })
  checkpoint(matrix, 'capture-blocked-resume-from-last-checkpoint')
  throw e
} finally {
  json(join(run, 'capture-errors.json'), errors)
  await browser.close()
}
console.log(
  JSON.stringify({
    captured: matrix.entries.reduce((n, e) => n + e.captures.length, 0),
    pageErrors: errors.length,
    status: 'CAPTURED_NOT_REVIEWED',
  }),
)
if (errors.length) process.exitCode = 1
