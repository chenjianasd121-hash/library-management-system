import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { appendFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  assert,
  run,
  save,
  client,
  call,
  book,
  seededReaders,
  secrets,
  randomUUID,
  sql,
} from './common.mjs'
const execute = promisify(execFile)
writeFileSync(join(run, 'stress-requests.jsonl'), '')
const staff = await client('demo_librarian', secrets.librarian, 'LIBRARIAN')
const readers = await seededReaders(20)
const books = []
for (let i = 0; i < 20; i++) books.push(await book(staff, 'stress-worker-' + i))
save('stress-fixtures.json', {
  readers: readers.map((x) => ({ id: x.user.id, username: x.user.username })),
  books,
})
const stages = [],
  resources = [],
  errors = []
let running = true,
  healthFailures = 0,
  stopReason = '',
  samples = []
const health = await client(null, null, 'READER')
health.context.setTimeout?.(3000)
let sampleBusy = false
const monitor = setInterval(async () => {
  if (sampleBusy) return
  sampleBusy = true
  try {
    const response = await health.context.get('/api/v1/policy', { timeout: 3000 })
    healthFailures = response.ok() ? 0 : healthFailures + 1
    const result = await execute(
      'docker',
      [
        'stats',
        '--no-stream',
        '--format',
        '{{json .}}',
        'library-flow-qa-backend-1',
        'library-flow-qa-mysql-1',
      ],
      { windowsHide: true, timeout: 10000 },
    )
    const snapshot = {
      at: new Date().toISOString(),
      containers: result.stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((x) => JSON.parse(x)),
    }
    resources.push(snapshot)
    save('stress-resources.json', resources)
  } catch (error) {
    healthFailures++
    resources.push({ at: new Date().toISOString(), error: error.message })
  } finally {
    sampleBusy = false
    if (healthFailures >= 3) {
      running = false
      stopReason = 'Three consecutive health probes failed'
    }
  }
}, 5000)
const percentile = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null)
async function measured(who, method, path, data, key, expected) {
  const start = performance.now()
  let result
  try {
    result = await call(who, method, path, data, key)
    if (result.status !== expected)
      throw new Error(`${method} ${path}: ${result.status}/${result.code}, expected ${expected}`)
    samples.push({ milliseconds: performance.now() - start, method, status: result.status })
    return result.data
  } catch (error) {
    samples.push({
      milliseconds: performance.now() - start,
      method,
      status: result?.status || 0,
      error: true,
    })
    errors.push({
      at: new Date().toISOString(),
      method,
      path,
      status: result?.status || 0,
      error: error.message,
    })
    save('stress-errors.json', errors)
    const recent = samples.slice(-200)
    if (recent.length >= 20 && recent.filter((x) => x.error).length / recent.length > 0.05) {
      running = false
      stopReason = 'Unexpected errors exceeded 5% of the recent request window'
    }
    throw error
  }
}
try {
  for (const concurrency of [5, 10, 20]) {
    samples = []
    const start = performance.now(),
      end = start + 60000
    const progress = setInterval(
      () =>
        console.log(
          `Stress ${concurrency}: ${Math.round((performance.now() - start) / 1000)}s, ${samples.length} requests, ${samples.filter((x) => x.error).length} unexpected errors`,
        ),
      20000,
    )
    await Promise.all(
      Array.from({ length: concurrency }, async (_, index) => {
        const reader = readers[index],
          b = books[index]
        let step = index
        while (performance.now() < end && running) {
          try {
            const action = step % 10
            step += 1
            switch (action) {
              case 0:
              case 1:
              case 2:
              case 3:
                await measured(reader, 'GET', '/books?page=1&size=10', undefined, undefined, 200)
                break
              case 4:
                await measured(reader, 'GET', `/books/${b.id}`, undefined, undefined, 200)
                break
              case 5:
                await measured(staff, 'GET', '/stats/overview', undefined, undefined, 200)
                break
              case 6:
                await measured(reader, 'GET', '/me/loans?page=1&size=10', undefined, undefined, 200)
                break
              case 7: {
                const r = await measured(
                  reader,
                  'POST',
                  '/reservations',
                  { bookId: b.id },
                  randomUUID(),
                  201,
                )
                await measured(
                  reader,
                  'POST',
                  `/reservations/${r.id}/cancel`,
                  {},
                  randomUUID(),
                  200,
                )
                break
              }
              case 8: {
                const l = await measured(
                  staff,
                  'POST',
                  '/loans',
                  { readerId: reader.user.id, copyBarcode: b.copies[0].barcode },
                  randomUUID(),
                  201,
                )
                await measured(
                  staff,
                  'POST',
                  `/loans/${l.id}/return`,
                  { copyBarcode: l.copyBarcode },
                  randomUUID(),
                  200,
                )
                break
              }
              case 9:
                await measured(
                  reader,
                  'GET',
                  '/notices?status=PUBLISHED&page=1&size=10',
                  undefined,
                  undefined,
                  200,
                )
                break
            }
          } catch {
            if (!running) break
          }
        }
      }),
    )
    clearInterval(progress)
    const elapsed = (performance.now() - start) / 1000
    const latencies = samples.map((x) => x.milliseconds).sort((a, b) => a - b)
    const result = {
      concurrency,
      targetSeconds: 60,
      actualSeconds: Number(elapsed.toFixed(2)),
      requests: samples.length,
      requestsPerSecond: Number((samples.length / elapsed).toFixed(2)),
      readRequests: samples.filter((x) => x.method === 'GET').length,
      writeRequests: samples.filter((x) => x.method !== 'GET').length,
      unexpectedErrors: samples.filter((x) => x.error).length,
      p50ms: Math.round(percentile(latencies, 0.5)),
      p95ms: Math.round(percentile(latencies, 0.95)),
      p99ms: Math.round(percentile(latencies, 0.99)),
    }
    stages.push(result)
    save('stress.json', {
      result: errors.length || !running ? 'FAIL' : 'PASS',
      stages,
      stopReason,
      errors,
    })
    console.log(JSON.stringify(result))
    appendFileSync(
      join(run, 'stress-requests.jsonl'),
      samples.map((x) => JSON.stringify({ ...x, concurrency })).join('\n') + '\n',
    )
    if (!running) break
  }
  const invariantCounts = sql(
    "SELECT COUNT(*) FROM book_copies c WHERE (c.status='BORROWED') != EXISTS(SELECT 1 FROM loans l WHERE l.copy_id=c.id AND l.status='ACTIVE'); SELECT COUNT(*) FROM book_copies c WHERE (c.status='READY') != EXISTS(SELECT 1 FROM reservations r WHERE r.copy_id=c.id AND r.status='READY');",
  )
    .split('\n')
    .map(Number)
  save('stress-invariants.json', { invariantCounts })
  assert(invariantCounts.every((x) => x === 0))
  assert.equal(stages.length, 3)
  assert.equal(errors.length, 0)
} finally {
  clearInterval(monitor)
  await Promise.all([staff, health, ...readers].map((x) => x.context.dispose()))
}
