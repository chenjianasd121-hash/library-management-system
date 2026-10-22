import {
  assert,
  client,
  call,
  book,
  sql,
  randomUUID,
  seededReaders,
  secrets,
  suite,
} from './common.mjs'

const s = suite('lifecycle-extra')
const staff = await client('demo_librarian', secrets.librarian, 'LIBRARIAN')
const readers = await seededReaders(3)
const guest = await client(null, null, 'READER')
try {
  await s.test('Expired pickup releases its copy to the next waiting reader', async () => {
    const b = await book(staff, 'expired-pickup')
    const first = (
      await call(readers[0], 'POST', '/reservations', { bookId: b.id }, randomUUID(), 201)
    ).data
    const second = (
      await call(readers[1], 'POST', '/reservations', { bookId: b.id }, randomUUID(), 201)
    ).data
    assert.equal(first.status, 'READY')
    assert.equal(second.status, 'WAITING')
    // Time fixture only in the isolated QA database; allocation is triggered through the real API.
    sql(`UPDATE reservations SET pickup_deadline='2000-01-01' WHERE id=${first.id};`)
    const third = (
      await call(readers[2], 'POST', '/reservations', { bookId: b.id }, randomUUID(), 201)
    ).data
    const records = (
      await call(
        staff,
        'GET',
        `/reservations?bookId=${b.id}&page=1&size=20`,
        undefined,
        undefined,
        200,
      )
    ).data.items
    assert.equal(records.find((x) => x.id === first.id).status, 'EXPIRED')
    assert.equal(records.find((x) => x.id === second.id).status, 'READY')
    assert.equal(third.status, 'WAITING')
    assert.equal(
      sql(`SELECT COUNT(*) FROM reservations WHERE book_id=${b.id} AND status='READY';`),
      '1',
    )
    await call(readers[1], 'POST', `/reservations/${second.id}/cancel`, {}, randomUUID(), 200)
    await call(readers[2], 'POST', `/reservations/${third.id}/cancel`, {}, randomUUID(), 200)
    assert.equal(sql(`SELECT status FROM book_copies WHERE id=${b.copies[0].id};`), 'AVAILABLE')
  })

  // Start in a fresh server minute; never disable or bypass the actual rate limiter.
  const wait = 60200 - (Date.now() % 60000)
  console.log(`Waiting ${Math.round(wait / 1000)} seconds for a fresh rate-limit window`)
  await new Promise((resolve) => setTimeout(resolve, Math.min(wait, 60000)))
  await s.test('Login rate limit rejects the eleventh attempt for the same username', async () => {
    const username = 'missing_' + randomUUID().replaceAll('-', '').slice(0, 16)
    for (let i = 0; i < 10; i++)
      await call(
        guest,
        'POST',
        '/auth/login',
        { username, password: 'Invalid!Password9', portalRole: 'READER' },
        undefined,
        401,
      )
    const result = await call(
      guest,
      'POST',
      '/auth/login',
      { username, password: 'Invalid!Password9', portalRole: 'READER' },
      undefined,
      429,
    )
    assert.equal(result.code, 'RATE_LIMITED')
  })
  await s.test('Registration rate limit permits five requests then rejects the sixth', async () => {
    const password = randomUUID() + '!Qa9'
    for (let i = 0; i < 6; i++) {
      const result = await call(
        guest,
        'POST',
        '/auth/register',
        {
          username: 'rate_' + randomUUID().replaceAll('-', '').slice(0, 20),
          password,
          displayName: '限流测试读者',
        },
        undefined,
        i < 5 ? 201 : 429,
      )
      if (i === 5) assert.equal(result.code, 'RATE_LIMITED')
    }
  })
} finally {
  await Promise.all([staff, guest, ...readers].map((x) => x.context.dispose()))
  s.finish()
}
