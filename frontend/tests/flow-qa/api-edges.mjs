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
  save,
} from './common.mjs'
const s = suite('api-edges')
const admin = await client('demo_admin', secrets.admin, 'ADMIN')
const staff = await client('demo_librarian', secrets.librarian, 'LIBRARIAN')
const readers = await seededReaders(3)
const guest = await client(null, null, 'READER')
const code = 'E' + randomUUID().slice(0, 8)
const category = (await call(staff, 'GET', '/categories')).data[0]
const input = {
  title: '边界书目 ' + code,
  author: '边界作者',
  categoryId: category.id,
  enabled: true,
}
const b = await book(staff, 'api-boundaries', 3)
const r = readers[0]
try {
  for (const [label, body] of [
    ['Empty book title', { ...input, title: '' }],
    ['Whitespace book title', { ...input, title: '   ' }],
    ['Overlong title', { ...input, title: '书'.repeat(201) }],
    ['Overlong author', { ...input, author: '作'.repeat(121) }],
    ['Overlong description', { ...input, description: '简'.repeat(5001) }],
    ['Invalid ISBN checksum', { ...input, isbn: '9780306406158' }],
    ['Invalid publication date', { ...input, publishedOn: '2026-99-99' }],
    ['Future publication date', { ...input, publishedOn: '2999-01-01' }],
  ])
    await s.test(label, async () => {
      await call(staff, 'POST', '/books', body, undefined, 400)
    })
  for (const query of ['page=0', 'size=0', 'size=101', 'page=abc', 'categoryId=abc'])
    await s.test('Reject invalid catalog ' + query, async () => {
      await call(guest, 'GET', '/books?' + query, undefined, undefined, 400)
    })
  await s.test('Invalid category code and blank category name are rejected', async () => {
    await call(
      staff,
      'POST',
      '/categories',
      { name: '分类', code: '!!!', enabled: true, sortOrder: 1 },
      undefined,
      400,
    )
    await call(
      staff,
      'POST',
      '/categories',
      { name: '  ', code: 'EDGE' + code, enabled: true, sortOrder: 1 },
      undefined,
      400,
    )
  })
  await s.test('Duplicate ISBN is rejected as a conflict', async () => {
    const prefix = '978' + Date.now().toString().slice(-9)
    const sum = [...prefix].reduce(
      (total, ch, index) => total + Number(ch) * (index % 2 ? 3 : 1),
      0,
    )
    const isbn = prefix + ((10 - (sum % 10)) % 10)
    await call(staff, 'POST', '/books', { ...input, isbn }, undefined, 201)
    const x = await call(staff, 'POST', '/books', { ...input, isbn }, undefined, 409)
    assert.equal(x.code, 'ISBN_EXISTS')
  })
  await s.test('Copy batch rolls back when a later barcode is duplicate', async () => {
    const barcode = 'E' + randomUUID().replaceAll('-', '').slice(0, 20)
    await call(
      staff,
      'POST',
      `/books/${b.id}/copies`,
      { barcodes: [barcode, b.copies[0].barcode], shelfLocation: 'EDGE' },
      undefined,
      409,
    )
    assert.equal(sql(`SELECT COUNT(*) FROM book_copies WHERE barcode='${barcode}';`), '0')
  })
  await s.test('Copy input limit, duplicate input and invalid location are rejected', async () => {
    for (const payload of [
      { barcodes: [], shelfLocation: 'A' },
      { barcodes: Array.from({ length: 51 }, (_, i) => 'EDGE' + i), shelfLocation: 'A' },
      { barcodes: ['VALID1'], shelfLocation: ' ' },
    ])
      await call(staff, 'POST', `/books/${b.id}/copies`, payload, undefined, 400)
  })
  await s.test(
    'Optimistic version conflict and illegal manual copy transition are rejected',
    async () => {
      const c = b.copies[2]
      await call(
        staff,
        'PATCH',
        `/copies/${c.id}`,
        { version: c.version, shelfLocation: 'EDGE-2' },
        undefined,
        200,
      )
      await call(
        staff,
        'PATCH',
        `/copies/${c.id}`,
        { version: c.version, shelfLocation: 'stale' },
        undefined,
        409,
      )
      await call(
        staff,
        'PATCH',
        `/copies/${c.id}`,
        { version: c.version + 1, targetStatus: 'BORROWED' },
        undefined,
        409,
      )
    },
  )
  await s.test('Real PNG upload, fake extension and oversized file boundaries', async () => {
    const headers = { 'X-Portal-Role': 'LIBRARIAN', 'X-XSRF-TOKEN': staff.csrf }
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==',
      'base64',
    )
    for (const [name, buffer, status] of [
      ['ok.png', png, 201],
      ['fake.png', Buffer.from('not an image'), 400],
      ['large.png', Buffer.concat([png, Buffer.alloc(2 * 1024 * 1024)]), 400],
    ]) {
      const response = await staff.context.post('/api/v1/media/covers', {
        headers,
        multipart: { file: { name, mimeType: 'image/png', buffer } },
      })
      assert.equal(response.status(), status, await response.text())
    }
  })
  await s.test('Role, portal and CSRF failures do not mutate data', async () => {
    await call(r, 'GET', '/users', undefined, undefined, 403)
    await call(staff, 'GET', '/me/loans', undefined, undefined, 403)
    const wrong = await r.context.get('/api/v1/auth/me', { headers: { 'X-Portal-Role': 'ADMIN' } })
    assert.equal(wrong.status(), 403)
    const missing = await r.context.post('/api/v1/auth/logout', {
      headers: { 'X-Portal-Role': 'READER' },
    })
    assert.equal(missing.status(), 403)
    await call(r, 'GET', '/auth/me', undefined, undefined, 200)
  })
  await s.test(
    'Cancellation ownership, staff reason and active-loan rules are enforced',
    async () => {
      const reserve = (await call(r, 'POST', '/reservations', { bookId: b.id }, randomUUID(), 201))
        .data
      await call(readers[1], 'POST', `/reservations/${reserve.id}/cancel`, {}, randomUUID(), 404)
      await call(staff, 'POST', `/reservations/${reserve.id}/cancel`, {}, randomUUID(), 400)
      const loan = (
        await call(
          staff,
          'POST',
          '/loans',
          { readerId: r.user.id, copyBarcode: reserve.copyBarcode },
          randomUUID(),
          201,
        )
      ).data
      await call(r, 'POST', '/reservations', { bookId: b.id }, randomUUID(), 422)
      await call(
        staff,
        'PATCH',
        `/copies/${loan.copyId}`,
        { version: 1, targetStatus: 'MAINTENANCE' },
        undefined,
        409,
      )
      await call(
        staff,
        'POST',
        `/loans/${loan.id}/return`,
        { copyBarcode: loan.copyBarcode },
        randomUUID(),
        200,
      )
    },
  )
  await s.test('Failed action does not consume its idempotency key', async () => {
    const disabled = (
      await call(
        staff,
        'POST',
        '/books',
        { ...input, title: 'Disabled ' + code, enabled: false },
        undefined,
        201,
      )
    ).data
    const key = randomUUID()
    await call(readers[1], 'POST', '/reservations', { bookId: disabled.id }, key, 422)
    assert.equal(
      sql(`SELECT COUNT(*) FROM idempotency_records WHERE idempotency_key='${key}';`),
      '0',
    )
    await call(staff, 'PATCH', `/books/${disabled.id}`, { ...input, enabled: true }, undefined, 200)
    await call(readers[1], 'POST', '/reservations', { bookId: disabled.id }, key, 201)
  })
  await s.test('Expired idempotency scope can be reused with a different request', async () => {
    const first = await book(staff, 'expired-key-a'),
      second = await book(staff, 'expired-key-b')
    const key = randomUUID()
    await call(readers[2], 'POST', '/reservations', { bookId: first.id }, key, 201)
    sql(
      `UPDATE idempotency_records SET expires_at=UTC_TIMESTAMP()-INTERVAL 1 DAY WHERE idempotency_key='${key}';`,
    )
    const result = await call(readers[2], 'POST', '/reservations', { bookId: second.id }, key, 201)
    assert.equal(result.data.bookId, second.id)
  })
  await s.test(
    'Changed checkout payload conflicts even when the changed reader does not exist',
    async () => {
      const fixture = await book(staff, 'changed-key-target')
      const key = randomUUID()
      const loan = (
        await call(
          staff,
          'POST',
          '/loans',
          { readerId: r.user.id, copyBarcode: fixture.copies[0].barcode },
          key,
          201,
        )
      ).data
      try {
        await call(
          staff,
          'POST',
          '/loans',
          { readerId: '9223372036854775807', copyBarcode: loan.copyBarcode },
          key,
          409,
        )
      } finally {
        await call(
          staff,
          'POST',
          `/loans/${loan.id}/return`,
          { copyBarcode: loan.copyBarcode },
          randomUUID(),
          200,
        )
      }
    },
  )
  await s.test('Persisted checkout keys replay across the earlier backend rebuild', async () => {
    const record = sql(
      `SELECT idempotency_key,JSON_UNQUOTE(JSON_EXTRACT(response_json,'$.readerId')),JSON_UNQUOTE(JSON_EXTRACT(response_json,'$.copyBarcode')) FROM idempotency_records WHERE actor_id=${staff.user.id} AND path='/api/v1/loans' AND response_code=201 AND expires_at>UTC_TIMESTAMP() ORDER BY id LIMIT 1;`,
    ).split('\t')
    assert.equal(record.length, 3)
    await call(
      staff,
      'POST',
      '/loans',
      { readerId: record[1], copyBarcode: record[2] },
      record[0],
      201,
    )
  })
  await s.test('Overview metrics exactly match database aggregation', async () => {
    const overview = (await call(admin, 'GET', '/stats/overview')).data
    const counts = sql(
      "SELECT (SELECT COUNT(*) FROM books),(SELECT COUNT(*) FROM book_copies WHERE status!='RETIRED'),(SELECT COUNT(*) FROM book_copies WHERE status='AVAILABLE'),(SELECT COUNT(*) FROM loans WHERE status='ACTIVE'),(SELECT COUNT(*) FROM reservations WHERE status='READY');",
    )
      .split('\t')
      .map(Number)
    assert.deepEqual(
      [
        overview.bookCount,
        overview.totalCopies,
        overview.availableCopies,
        overview.activeLoans,
        overview.readyReservations,
      ],
      counts,
    )
    assert.equal(typeof overview.bookCount, 'number')
    assert.equal(typeof b.id, 'string')
    save('statistics-exact-counts.json', { overview, counts })
  })
} finally {
  await Promise.all([admin, staff, guest, ...readers].map((x) => x.context.dispose()))
  s.finish()
}
