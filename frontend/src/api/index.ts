import { query, request } from './http'
import type {
  AdminUser,
  AuditLog,
  BookDetail,
  BookInput,
  BookSummary,
  Category,
  Copy,
  CopyLookup,
  Id,
  LoanItem,
  Notice,
  Overview,
  Page,
  Policy,
  ReaderLookup,
  ReservationItem,
  Role,
  ReturnResult,
  TopBook,
  TrendPoint,
  User,
} from './types'

type Params = Record<string, string | number | boolean | undefined | null>
const getPage = <T>(path: string, params: Params) => request<Page<T>>(path + query(params))
export const api = {
  policy: () => request<Policy>('/policy'),
  register: (data: { username: string; password: string; displayName: string; phone?: string }) =>
    request<{ userId: Id }>('/auth/register', { method: 'POST', body: data }),
  login: (data: { username: string; password: string; portalRole: Role }) =>
    request<{ user: User }>('/auth/login', { method: 'POST', body: data }),
  logout: () => request<null>('/auth/logout', { method: 'POST' }),
  me: () => request<User>('/auth/me'),
  profile: (data: { displayName: string; phone?: string }) =>
    request<User>('/me/profile', { method: 'PATCH', body: data }),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    request<null>('/me/change-password', { method: 'POST', body: data }),
  categories: (enabled?: boolean) => request<Category[]>('/categories' + query({ enabled })),
  saveCategory: (data: Omit<Category, 'id'>, id?: Id) =>
    request<Category>(id ? `/categories/${id}` : '/categories', {
      method: id ? 'PATCH' : 'POST',
      body: data,
    }),
  books: (params: Params) => getPage<BookSummary>('/books', params),
  book: (id: Id) => request<BookDetail>(`/books/${id}`),
  saveBook: (data: BookInput, id?: Id) =>
    request<BookDetail>(id ? `/books/${id}` : '/books', {
      method: id ? 'PATCH' : 'POST',
      body: data,
    }),
  copies: (id: Id, params: Params) => getPage<Copy>(`/books/${id}/copies`, params),
  lookupCopy: (barcode: string) => request<CopyLookup>('/copies/lookup' + query({ barcode })),
  addCopies: (id: Id, barcodes: string[], shelfLocation: string) =>
    request<Copy[]>(`/books/${id}/copies`, { method: 'POST', body: { barcodes, shelfLocation } }),
  updateCopy: (id: Id, data: { shelfLocation?: string; targetStatus?: string; version: number }) =>
    request<Copy>(`/copies/${id}`, { method: 'PATCH', body: data }),
  uploadCover: (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request<{ coverPath: string }>('/media/covers', { method: 'POST', body })
  },
  reader: (username: string) => request<ReaderLookup>('/readers/lookup' + query({ username })),
  checkout: (readerId: Id, copyBarcode: string, key: string) =>
    request<LoanItem>('/loans', {
      method: 'POST',
      body: { readerId, copyBarcode },
      idempotencyKey: key,
    }),
  returnLoan: (id: Id, copyBarcode: string, key: string) =>
    request<ReturnResult>(`/loans/${id}/return`, {
      method: 'POST',
      body: { copyBarcode },
      idempotencyKey: key,
    }),
  loans: (params: Params) => getPage<LoanItem>('/loans', params),
  myLoans: (params: Params) => getPage<LoanItem>('/me/loans', params),
  renew: (id: Id, key: string) =>
    request<{ dueDate: string; renewalCount: number }>(`/loans/${id}/renew`, {
      method: 'POST',
      idempotencyKey: key,
    }),
  reservations: (params: Params) => getPage<ReservationItem>('/reservations', params),
  myReservations: (params: Params) => getPage<ReservationItem>('/me/reservations', params),
  reserve: (bookId: Id, key: string) =>
    request<ReservationItem>('/reservations', {
      method: 'POST',
      body: { bookId },
      idempotencyKey: key,
    }),
  cancelReservation: (id: Id, reason: string | undefined, key: string) =>
    request<ReservationItem>(`/reservations/${id}/cancel`, {
      method: 'POST',
      body: reason ? { reason } : {},
      idempotencyKey: key,
    }),
  notices: (params: Params) => getPage<Notice>('/notices', params),
  notice: (id: Id) => request<Notice>(`/notices/${id}`),
  saveNotice: (data: { title: string; content: string }, id?: Id) =>
    request<Notice>(id ? `/notices/${id}` : '/notices', {
      method: id ? 'PATCH' : 'POST',
      body: data,
    }),
  noticeAction: (id: Id, action: 'publish' | 'withdraw') =>
    request<Notice>(`/notices/${id}/${action}`, { method: 'POST' }),
  overview: () => request<Overview>('/stats/overview'),
  trend: () => request<TrendPoint[]>('/stats/loans-trend?days=30'),
  topBooks: () => request<TopBook[]>('/stats/top-books?days=30&limit=10'),
  users: (params: Params) => getPage<AdminUser>('/users', params),
  createUser: (data: {
    username: string
    initialPassword: string
    displayName: string
    role: 'ADMIN' | 'LIBRARIAN'
  }) => request<AdminUser>('/users', { method: 'POST', body: data }),
  updateUser: (id: Id, data: { displayName?: string; phone?: string; status?: string }) =>
    request<AdminUser>(`/users/${id}`, { method: 'PATCH', body: data }),
  resetPassword: (id: Id, newPassword: string) =>
    request<{ mustChangePassword: true }>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: { newPassword },
    }),
  audit: (params: Params) => getPage<AuditLog>('/audit-logs', params),
}
