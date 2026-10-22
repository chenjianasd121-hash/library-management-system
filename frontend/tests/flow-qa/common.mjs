import { request, chromium } from 'playwright-core'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, join, relative, isAbsolute, sep } from 'node:path'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'

export { assert, randomUUID, chromium }
export const workspace = resolve(import.meta.dirname, '../../..')
export const run = resolve(
  process.env.QA_RUN ||
    readFileSync(join(workspace, 'output/flow-stress-qa/current-run.txt'), 'utf8').trim(),
)
const runRelative = relative(join(workspace, 'output/flow-stress-qa'), run)
if (
  !runRelative ||
  runRelative === '..' ||
  runRelative.startsWith('..' + sep) ||
  isAbsolute(runRelative)
)
  throw new Error('QA run must remain under workspace output')
export const base = 'http://127.0.0.1:18081'
export const secrets = JSON.parse(readFileSync(join(run, 'credentials.private.json'), 'utf8'))
export const endpoints = {
  READER: 'http://127.0.0.1:5273',
  LIBRARIAN: 'http://127.0.0.2:5274',
  ADMIN: 'http://127.0.0.3:5275',
}
export function save(name, data) {
  writeFileSync(join(run, name), JSON.stringify(data, null, 2))
}
export function sql(statement) {
  return execFileSync(
    'docker',
    [
      'exec',
      '-i',
      'library-flow-qa-mysql-1',
      'sh',
      '-c',
      'export MYSQL_PWD="$MYSQL_PASSWORD"; exec mysql -u "$MYSQL_USER" "$MYSQL_DATABASE" --batch --skip-column-names --default-character-set=utf8mb4',
    ],
    { input: statement, encoding: 'utf8', windowsHide: true },
  ).trim()
}
export async function client(username, password, role) {
  const context = await request.newContext({ baseURL: base, timeout: 20000 })
  const who = { context, role, csrf: '', user: null }
  who.csrf = (await (await context.get('/api/v1/auth/csrf')).json()).data.csrfToken
  if (username) {
    who.user = (
      await call(who, 'POST', '/auth/login', { username, password, portalRole: role })
    ).data.user
    who.csrf = (await (await context.get('/api/v1/auth/csrf')).json()).data.csrfToken
  }
  return who
}
export async function call(who, method, path, data, key, expected) {
  const headers = { 'X-Portal-Role': who.role || 'READER' }
  if (method !== 'GET') headers['X-XSRF-TOKEN'] = who.csrf
  if (key) headers['Idempotency-Key'] = key
  const response = await who.context.fetch('/api/v1' + path, {
    method,
    headers,
    ...(data === undefined ? {} : { data }),
  })
  let body
  try {
    body = await response.json()
  } catch {
    body = { code: 'INVALID_JSON' }
  }
  const result = { status: response.status(), ...body }
  await response.dispose()
  if (expected !== undefined)
    assert.equal(result.status, expected, `${method} ${path}: ${JSON.stringify(result)}`)
  return result
}
export async function book(staff, label = 'flow', copies = 1) {
  const categories = (await call(staff, 'GET', '/categories', undefined, undefined, 200)).data
  const value = (
    await call(
      staff,
      'POST',
      '/books',
      {
        title: `QA ${label} ${randomUUID().slice(0, 8)}`,
        author: '隔离流程测试',
        categoryId: categories[0].id,
        enabled: true,
      },
      undefined,
      201,
    )
  ).data
  const barcodes = Array.from(
    { length: copies },
    () => 'Q' + randomUUID().replaceAll('-', '').slice(0, 22),
  )
  value.copies = copies
    ? (
        await call(
          staff,
          'POST',
          `/books/${value.id}/copies`,
          { barcodes, shelfLocation: 'QA-1' },
          undefined,
          201,
        )
      ).data
    : []
  return value
}
export async function seededReaders(count = 20) {
  // Only in the isolated database. Copy the hash of its own seeded reader, never a production hash.
  const prefix = 'flow_' + randomUUID().slice(0, 7).replaceAll('-', '')
  sql(
    `INSERT INTO users(username,password_hash,display_name,role,status,must_change_password) SELECT CONCAT('${prefix}_',n),password_hash,CONCAT('流程读者',n),'READER','ACTIVE',FALSE FROM users CROSS JOIN (${Array.from({ length: count }, (_, i) => `SELECT ${i} n`).join(' UNION ALL ')}) nums WHERE username='demo_reader';`,
  )
  return await Promise.all(
    Array.from({ length: count }, (_, i) => client(`${prefix}_${i}`, secrets.reader, 'READER')),
  )
}
export function suite(name) {
  const checks = []
  return {
    checks,
    async test(label, fn) {
      const start = performance.now()
      try {
        await fn()
        checks.push({ label, result: 'PASS', milliseconds: Math.round(performance.now() - start) })
        console.log(`PASS ${label}`)
      } catch (error) {
        checks.push({ label, result: 'FAIL', error: error.stack || String(error) })
        console.log(`FAIL ${label}: ${error.message}`)
      }
      save(name + '.json', { name, checkedAt: new Date().toISOString(), checks })
    },
    finish() {
      if (checks.some((x) => x.result === 'FAIL')) process.exitCode = 1
    },
  }
}
