import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request, refreshCsrf, ApiError, clearCsrf } from '@/api/http'
import { dateTime, dueDate, expectedDueDate, statusLabel } from '@/utils/format'
import { safeRedirect } from '@/router'
import router from '@/router'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

describe('front-end contracts', () => {
  beforeEach(() => {
    clearCsrf()
    vi.restoreAllMocks()
  })
  it('rejects external post-login redirects', () => {
    expect(safeRedirect('//evil.example')).toBe('/')
    expect(safeRedirect('/\\evil.example')).toBe('/')
    expect(safeRedirect('/books/12')).toBe('/books/12')
  })
  it('blocks reader access to staff routes and requires first password change', async () => {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.initialized = true
    auth.user = {
      id: '1',
      username: 'reader',
      displayName: '读者',
      role: 'READER',
      mustChangePassword: false,
    }
    await router.push('/staff/dashboard')
    expect(router.currentRoute.value.path).toBe('/403')
    auth.user.mustChangePassword = true
    await router.push('/books')
    expect(router.currentRoute.value.path).toBe('/change-password')
  })
  it('formats timestamps in Shanghai and dates with end-of-day meaning', () => {
    expect(dateTime('2026-09-26T00:00:00Z')).toContain('08:00')
    expect(dueDate('2026-10-26')).toBe('2026-10-26 当日结束前')
    expect(expectedDueDate(30, new Date('2026-09-26T16:30:00Z'))).toBe('2026-10-27')
    expect(statusLabel.READY).toBe('待取')
  })
  it('attaches CSRF and preserves idempotency key on writes', async () => {
    const mock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 'OK',
            message: '成功',
            data: { csrfToken: 'token-1' },
            traceId: 'x',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 'OK', message: '成功', data: { id: '100' }, traceId: 'y' }),
          { status: 201 },
        ),
      )
    await refreshCsrf()
    await request('/reservations', {
      method: 'POST',
      body: { bookId: '123' },
      idempotencyKey: 'same-key',
    })
    expect(mock.mock.calls[1]?.[1]?.headers).toMatchObject({
      'X-XSRF-TOKEN': 'token-1',
      'Idempotency-Key': 'same-key',
    })
  })
  it('preserves business errors, field details and trace ID', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'ISBN_EXISTS',
          message: 'ISBN 已存在',
          traceId: 'trace-1',
          details: [{ field: 'isbn', message: '重复' }],
        }),
        { status: 409 },
      ),
    )
    await expect(request('/books')).rejects.toMatchObject({
      status: 409,
      code: 'ISBN_EXISTS',
      traceId: 'trace-1',
      details: [{ field: 'isbn', message: '重复' }],
    } satisfies Partial<ApiError>)
  })
})
