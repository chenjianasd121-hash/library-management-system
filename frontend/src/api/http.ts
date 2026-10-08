import type { ApiResponse, FieldError } from './types'
import { portalRole } from '@/portal'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public traceId = '',
    public details: FieldError[] = [],
  ) {
    super(message)
  }
}

let csrfToken = ''
let csrfPromise: Promise<string> | null = null
const base = '/api/v1'
const unsafe = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

function cookieToken() {
  return (
    document.cookie
      .split('; ')
      .find((part) => part.startsWith('XSRF-TOKEN='))
      ?.split('=')
      .slice(1)
      .join('=') || ''
  )
}

export async function refreshCsrf(): Promise<string> {
  if (!csrfPromise)
    csrfPromise = (async () => {
      const response = await fetch(`${base}/auth/csrf`, { credentials: 'same-origin' })
      const body = (await response.json()) as ApiResponse<{ csrfToken: string }>
      if (!response.ok)
        throw new ApiError(response.status, body.code, body.message, body.traceId, body.details)
      csrfToken = body.data.csrfToken || decodeURIComponent(cookieToken())
      return csrfToken
    })().finally(() => {
      csrfPromise = null
    })
  return csrfPromise
}

export function clearCsrf() {
  csrfToken = ''
}

export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; idempotencyKey?: string; signal?: AbortSignal } = {},
): Promise<T> {
  const method = options.method || 'GET'
  if (unsafe.has(method) && !csrfToken) await refreshCsrf()
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 15000)
  options.signal?.addEventListener('abort', () => controller.abort(), { once: true })
  const headers: Record<string, string> = {}
  headers['X-Portal-Role'] = portalRole
  if (unsafe.has(method)) headers['X-XSRF-TOKEN'] = csrfToken || decodeURIComponent(cookieToken())
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey
  if (options.body !== undefined && !(options.body instanceof FormData))
    headers['Content-Type'] = 'application/json'
  try {
    const response = await fetch(base + path, {
      method,
      credentials: 'same-origin',
      headers,
      body:
        options.body instanceof FormData
          ? options.body
          : options.body === undefined
            ? undefined
            : JSON.stringify(options.body),
      signal: controller.signal,
    })
    if (response.status === 204) return undefined as T
    const body = (await response.json()) as ApiResponse<T>
    if (!response.ok || body.code !== 'OK') {
      const error = new ApiError(
        response.status,
        body.code || 'HTTP_ERROR',
        body.message || '请求未完成',
        body.traceId,
        body.details,
      )
      if (response.status === 401 && path !== '/auth/login')
        window.dispatchEvent(new Event('session-expired'))
      if (
        response.status === 403 &&
        (body.code === 'ACCOUNT_DISABLED' || body.code === 'PORTAL_ROLE_MISMATCH')
      )
        window.dispatchEvent(new Event('session-expired'))
      else if (response.status === 403 && body.code === 'PASSWORD_CHANGE_REQUIRED')
        window.dispatchEvent(new Event('password-change-required'))
      else if (response.status === 403) window.dispatchEvent(new Event('forbidden'))
      throw error
    }
    return body.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      controller.signal.aborted ? '请求超时，请重试' : '无法连接后端服务，请检查服务后重试',
    )
  } finally {
    window.clearTimeout(timeout)
  }
}

export function query(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params))
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  return search.size ? `?${search}` : ''
}

export function errorText(error: unknown) {
  if (error instanceof ApiError)
    return `${error.message}${error.traceId ? `（追踪号 ${error.traceId}）` : ''}`
  return '请求失败，请重试'
}

export function fieldErrors(error: unknown) {
  return error instanceof ApiError ? error.details : []
}
