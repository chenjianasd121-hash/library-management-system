import { appendFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  assert,
  randomUUID,
  run,
  save,
  sql,
  client,
  call,
  book,
  seededReaders,
  secrets,
  suite,
} from './common.mjs'

const s = suite('concurrency')
const staff = await client('demo_librarian', secrets.librarian, 'LIBRARIAN')
const readers = await seededReaders(20)
const iterations = Number(process.env.QA_ROUNDS || 20)
const cleanup = async (loan) =>
  call(
    staff,
    'POST',
    `/loans/${loan.id}/return`,
    { copyBarcode: loan.copyBarcode },
    randomUUID(),
    200,
  )
const cancel = async (reservation) =>
  call(
    staff,
    'POST',
    `/reservations/${reservation.id}/cancel`,
    { reason: 'QA round cleanup' },
    randomUUID(),
    200,
  )
const log = (label, round, results) =>
  appendFileSync(join(run, 'race-rounds.jsonl'), JSON.stringify({ label, round, results }) + '\n')
async function clearReaders() {
  const ids = readers.map((x) => x.user.id).join(',')
  const reservations = sql(
    `SELECT id FROM reservations WHERE reader_id IN (${ids}) AND status IN ('WAITING','READY') ORDER BY (status='READY'),id DESC;`,
  )
  for (const id of reservations.split('\n').filter(Boolean)) await cancel({ id })
  const loans = sql(
    `SELECT l.id,c.barcode FROM loans l JOIN book_copies c ON c.id=l.copy_id WHERE l.reader_id IN (${ids}) AND l.status='ACTIVE';`,
  )
  for (const row of loans.split('\n').filter(Boolean)) {
    const [id, copyBarcode] = row.split('\t')
    await cleanup({ id, copyBarcode })
  }
}
async function rounds(label, fn) {
  await s.test(label, async () => {
    for (let round = 1; round <= iterations; round++) {
      await fn(round)
      if (round % 5 === 0) console.log(`${label}: ${round}/${iterations}`)
    }
  })
  await clearReaders()
}
try {
  await rounds('20 concurrent checkouts have exactly one winner', async (round) => {
    const b = await book(staff, 'checkout-race')
    const results = await Promise.all(
      readers.map((r) =>
        call(
          staff,
          'POST',
          '/loans',
          { readerId: r.user.id, copyBarcode: b.copies[0].barcode },
          randomUUID(),
        ),
      ),
    )
    log('checkout', round, results)
    assert.equal(results.filter((x) => x.status === 201).length, 1)
    assert(results.every((x) => [201, 409, 422].includes(x.status)))
    assert.equal(
      sql(`SELECT COUNT(*) FROM loans WHERE copy_id=${b.copies[0].id} AND status='ACTIVE';`),
      '1',
    )
    await cleanup(results.find((x) => x.status === 201).data)
  })
  await rounds(
    '20 simultaneous reservations preserve unique READY and queue positions',
    async (round) => {
      const b = await book(staff, 'reservation-race')
      const results = await Promise.all(
        readers.map((r) => call(r, 'POST', '/reservations', { bookId: b.id }, randomUUID())),
      )
      log('reservation', round, results)
      assert(results.every((x) => x.status === 201))
      const ready = results.filter((x) => x.data.status === 'READY')
      const waiting = results.filter((x) => x.data.status === 'WAITING')
      assert.equal(ready.length, 1)
      assert.equal(waiting.length, 19)
      // Creation responses describe different commit instants; compare positions after all commits.
      const settled = (
        await call(
          staff,
          'GET',
          `/reservations?bookId=${b.id}&status=WAITING&page=1&size=100`,
          undefined,
          undefined,
          200,
        )
      ).data.items
      log('settled-queue', round, settled)
      assert.equal(new Set(settled.map((x) => x.queuePosition)).size, 19)
      for (const r of waiting) await cancel(r.data)
      await cancel(ready[0].data)
    },
  )
  await rounds('20 simultaneous returns close a loan once', async (round) => {
    const b = await book(staff, 'return-race')
    const loan = (
      await call(
        staff,
        'POST',
        '/loans',
        { readerId: readers[0].user.id, copyBarcode: b.copies[0].barcode },
        randomUUID(),
        201,
      )
    ).data
    const results = await Promise.all(
      readers.map(() =>
        call(
          staff,
          'POST',
          `/loans/${loan.id}/return`,
          { copyBarcode: loan.copyBarcode },
          randomUUID(),
        ),
      ),
    )
    log('return', round, results)
    assert.equal(results.filter((x) => x.status === 200).length, 1)
    assert(results.every((x) => [200, 409].includes(x.status)))
    assert.equal(sql(`SELECT status FROM book_copies WHERE id=${b.copies[0].id};`), 'AVAILABLE')
  })
  await rounds(
    'Concurrent same-key reservation, cancellation, checkout, renewal and return replay safely',
    async (round) => {
      const b = await book(staff, 'idempotency-race')
      const r = readers[1]
      let key = randomUUID()
      const reserved = await Promise.all(
        Array.from({ length: 20 }, () => call(r, 'POST', '/reservations', { bookId: b.id }, key)),
      )
      log('idempotent-reservation', round, reserved)
      assert(reserved.every((x) => x.status === 201))
      assert.equal(new Set(reserved.map((x) => x.data.id)).size, 1)
      const conflict = await call(r, 'POST', '/reservations', { bookId: '1' }, key)
      assert.equal(conflict.status, 409)
      key = randomUUID()
      const cancelled = await Promise.all(
        Array.from({ length: 20 }, () =>
          call(r, 'POST', `/reservations/${reserved[0].data.id}/cancel`, {}, key),
        ),
      )
      log('idempotent-cancel', round, cancelled)
      assert(cancelled.every((x) => x.status === 200))
      key = randomUUID()
      const borrowed = await Promise.all(
        Array.from({ length: 20 }, () =>
          call(
            staff,
            'POST',
            '/loans',
            { readerId: r.user.id, copyBarcode: b.copies[0].barcode },
            key,
          ),
        ),
      )
      log('idempotent-checkout', round, borrowed)
      assert(borrowed.every((x) => x.status === 201))
      assert.equal(new Set(borrowed.map((x) => x.data.id)).size, 1)
      const loan = borrowed[0].data
      key = randomUUID()
      const renewed = await Promise.all(
        Array.from({ length: 20 }, () => call(r, 'POST', `/loans/${loan.id}/renew`, {}, key)),
      )
      log('idempotent-renew', round, renewed)
      assert(renewed.every((x) => x.status === 200 && x.data.renewalCount === 1))
      key = randomUUID()
      const returned = await Promise.all(
        Array.from({ length: 20 }, () =>
          call(staff, 'POST', `/loans/${loan.id}/return`, { copyBarcode: loan.copyBarcode }, key),
        ),
      )
      log('idempotent-return', round, returned)
      assert(returned.every((x) => x.status === 200))
    },
  )
  await rounds(
    'Renewal versus a new waiting reservation yields a valid serial outcome',
    async (round) => {
      const b = await book(staff, 'renew-queue-race')
      const loan = (
        await call(
          staff,
          'POST',
          '/loans',
          { readerId: readers[2].user.id, copyBarcode: b.copies[0].barcode },
          randomUUID(),
          201,
        )
      ).data
      const results = await Promise.all([
        call(readers[2], 'POST', `/loans/${loan.id}/renew`, {}, randomUUID()),
        call(readers[3], 'POST', '/reservations', { bookId: b.id }, randomUUID()),
      ])
      log('renew-versus-queue', round, results)
      assert([200, 422].includes(results[0].status))
      assert.equal(results[1].status, 201)
      assert.equal(results[1].data.status, 'WAITING')
      await cleanup(loan)
      assert.equal(sql(`SELECT status FROM reservations WHERE id=${results[1].data.id};`), 'READY')
      await cancel(results[1].data)
    },
  )
  const limitBooks = await Promise.all(Array.from({ length: 20 }, () => book(staff, 'limit-race')))
  await rounds('Concurrent checkouts never exceed the five-book reader limit', async (round) => {
    const r = readers[4]
    const results = await Promise.all(
      limitBooks.map((b) =>
        call(
          staff,
          'POST',
          '/loans',
          { readerId: r.user.id, copyBarcode: b.copies[0].barcode },
          randomUUID(),
        ),
      ),
    )
    log('loan-limit', round, results)
    assert.equal(results.filter((x) => x.status === 201).length, 5)
    assert(
      results.every(
        (x) => x.status === 201 || (x.status === 422 && x.code === 'BORROW_LIMIT_REACHED'),
      ),
    )
    assert.equal(
      sql(`SELECT COUNT(*) FROM loans WHERE reader_id=${r.user.id} AND status='ACTIVE';`),
      '5',
    )
    for (const x of results.filter((x) => x.status === 201)) await cleanup(x.data)
  })
  await rounds(
    'Concurrent reservations never exceed the three-reservation reader limit',
    async (round) => {
      const results = await Promise.all(
        limitBooks.map((b) =>
          call(readers[5], 'POST', '/reservations', { bookId: b.id }, randomUUID()),
        ),
      )
      log('reservation-limit', round, results)
      assert.equal(results.filter((x) => x.status === 201).length, 3)
      assert(
        results.every(
          (x) => x.status === 201 || (x.status === 422 && x.code === 'RESERVATION_LIMIT_REACHED'),
        ),
      )
      for (const x of results.filter((x) => x.status === 201)) await cancel(x.data)
    },
  )
  await s.test('Database cross-table invariants remain valid after all races', async () => {
    const invalid = sql(
      `SELECT COUNT(*) FROM book_copies c WHERE (c.status='BORROWED') != EXISTS(SELECT 1 FROM loans l WHERE l.copy_id=c.id AND l.status='ACTIVE'); SELECT COUNT(*) FROM book_copies c WHERE (c.status='READY') != EXISTS(SELECT 1 FROM reservations r WHERE r.copy_id=c.id AND r.status='READY'); SELECT COUNT(*) FROM (SELECT reader_id FROM loans WHERE status='ACTIVE' GROUP BY reader_id HAVING COUNT(*)>5) x; SELECT COUNT(*) FROM (SELECT reader_id FROM reservations WHERE status IN ('WAITING','READY') GROUP BY reader_id HAVING COUNT(*)>3) x;`,
    )
    save('concurrency-invariants.json', { invalidCounts: invalid.split(/\r?\n/).map(Number) })
    assert(invalid.split(/\r?\n/).every((x) => x === '0'))
  })
} finally {
  await Promise.all([staff, ...readers].map((x) => x.context.dispose()))
  s.finish()
}
