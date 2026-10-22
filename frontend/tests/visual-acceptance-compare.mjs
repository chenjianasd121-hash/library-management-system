import { chromium } from 'playwright-core'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const run = readFileSync(join(root, 'output/visual-acceptance/current-run.txt'), 'utf8').trim()
const matrix = JSON.parse(readFileSync(join(run, 'matrix.json'), 'utf8'))
const ids = process.argv
  .find((x) => x.startsWith('--ids='))
  ?.slice(6)
  .split(',') || ['admin-login', 'reader-login', 'librarian-public-login']
if (ids.length > 3) throw new Error('Compare at most three images per phase')
const focus = process.argv.find((x) => x.startsWith('--focus='))?.slice(8) || 'full'
const evidencePath = join(run, 'comparison-manifest.json')
const evidence = existsSync(evidencePath) ? JSON.parse(readFileSync(evidencePath, 'utf8')) : []
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--force-color-profile=srgb'],
})
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1250 },
    deviceScaleFactor: 1,
  })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  for (const id of ids) {
    const entry = matrix.entries.find((e) => e.id === id)
    const current = entry?.captures.find((c) => c.key === 'reference')
    if (!current) throw new Error('No reference-sized capture for ' + id)
    await page.goto('http://127.0.0.1:5280/?entry=' + id, { waitUntil: 'networkidle' })
    await page.locator('#entry').selectOption(id)
    await page.locator('#focus').selectOption(focus)
    await page.locator('#compare-surface img').first().waitFor()
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all(
        [...document.querySelectorAll('#compare-surface img')].map((img) => img.decode()),
      )
    })
    const images = await page
      .locator('#compare-surface img')
      .evaluateAll((nodes) =>
        nodes.map((img) => ({ width: img.naturalWidth, height: img.naturalHeight })),
      )
    if (
      images.length !== 2 ||
      images.some((img) => img.width !== entry.width || img.height !== entry.height)
    )
      throw new Error('Comparison image size mismatch: ' + id)
    const file = 'comparisons/' + id + '-' + focus + '.png'
    await page
      .locator('#compare-surface')
      .screenshot({ path: join(run, file), animations: 'disabled' })
    const index = evidence.findIndex((e) => e.id === id && e.focus === focus)
    const item = {
      id,
      focus,
      file,
      source: entry.reference,
      current: current.file,
      originalPixels: [entry.width, entry.height],
      sourceAndCurrentInSameImage: true,
      capturedAt: new Date().toISOString(),
    }
    if (index < 0) evidence.push(item)
    else evidence[index] = item
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2))
    console.log('Saved ' + file)
  }
  if (errors.length) throw new Error(errors.join('; '))
  await page.locator('#mode').selectOption('overlay')
  await page.locator('#opacity').evaluate((input) => {
    input.value = '35'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.locator('#mode').selectOption('difference')
  if ((await page.locator('#compare-surface img').count()) !== 2)
    throw new Error('Overlay control did not render both images')
  if (!(await page.locator('#compare-surface .pane').first().isVisible()))
    throw new Error('Comparison pane is hidden')
  const boxes = await page.locator('#compare-surface img').evaluateAll((nodes) =>
    nodes.map((node) => {
      const b = node.getBoundingClientRect()
      return { width: b.width, height: b.height }
    }),
  )
  if (
    Math.abs(boxes[0].width - boxes[1].width) > 1 ||
    Math.abs(boxes[0].height - boxes[1].height) > 1
  )
    throw new Error('Overlay images are stretched to different sizes')
} finally {
  await browser.close()
}
