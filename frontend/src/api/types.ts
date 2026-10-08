export type Id = string
export type Role = 'ADMIN' | 'LIBRARIAN' | 'READER'
export type CopyStatus = 'AVAILABLE' | 'READY' | 'BORROWED' | 'MAINTENANCE' | 'RETIRED'
export type LoanStatus = 'ACTIVE' | 'RETURNED'
export type ReservationStatus = 'WAITING' | 'READY' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED'
export type NoticeStatus = 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN'
export type AccountStatus = 'ACTIVE' | 'DISABLED'
export interface FieldError {
  field: string
  message: string
}
export interface ApiResponse<T> {
  code: string
  message: string
  data: T
  traceId: string
  details?: FieldError[]
}
export interface Page<T> {
  items: T[]
  page: number
  size: number
  total: number
}
export interface User {
  id: Id
  username: string
  displayName: string
  phone?: string | null
  role: Role
  status?: AccountStatus
  mustChangePassword: boolean
}
export interface Category {
  id: Id
  name: string
  code: string
  enabled: boolean
  sortOrder: number
}
export interface BookSummary {
  id: Id
  isbn: string | null
  title: string
  author: string
  categoryId: Id
  categoryName: string
  coverPath: string | null
  totalCopies: number
  availableCopies: number
  readyCopies: number
  borrowedCopies: number
  enabled: boolean
}
export interface BookDetail extends BookSummary {
  publisher: string | null
  publishedOn: string | null
  description: string | null
  keywords: string | null
}
export interface BookInput {
  isbn?: string | null
  title: string
  author: string
  publisher?: string | null
  publishedOn?: string | null
  description?: string | null
  categoryId: Id
  keywords?: string | null
  coverPath?: string | null
  enabled: boolean
}
export interface Copy {
  id: Id
  barcode: string
  shelfLocation: string
  status: CopyStatus
  version: number
}
export interface CopyLookup {
  copy: Copy & { bookId: Id; bookTitle: string }
  readyForReaderId?: Id | null
  activeLoan?: {
    id: Id
    readerId: Id
    readerName: string
    borrowedAt: string
    dueDate: string
  } | null
}
export interface ReaderLookup {
  id: Id
  username: string
  displayName: string
  status: AccountStatus
  activeLoanCount: number
  overdueLoanCount: number
}
export interface LoanItem {
  id: Id
  bookId: Id
  copyId: Id
  readerId: Id
  bookTitle: string
  readerName?: string
  copyBarcode: string
  borrowedAt: string
  dueDate: string
  returnedAt: string | null
  renewalCount: number
  status: LoanStatus
  overdueDays: number
  allowedActions: { canRenew: boolean; reasonCode?: string }
}
export interface ReturnResult extends LoanItem {
  copyStatus: 'AVAILABLE' | 'READY'
}
export interface ReservationItem {
  id: Id
  bookId: Id
  readerId: Id
  readerName?: string
  bookTitle: string
  status: ReservationStatus
  requestedAt: string
  readyAt: string | null
  queuePosition: number | null
  copyId: Id | null
  copyBarcode: string | null
  shelfLocation: string | null
  pickupDeadline: string | null
  allowedActions: { canCancel: boolean; reasonCode?: string }
}
export interface Notice {
  id: Id
  title: string
  content: string
  status: NoticeStatus
  publishedAt: string | null
  createdAt?: string
  updatedAt?: string
}
export interface Overview {
  bookCount: number
  totalCopies: number
  availableCopies: number
  activeLoans: number
  overdueLoans: number
  readyReservations: number
  readerCount: number
  generatedAt: string
}
export interface TrendPoint {
  date: string
  borrowedCount: number
  returnedCount: number
}
export interface TopBook {
  bookId: Id
  title: string
  borrowCount: number
}
export interface Policy {
  maxActiveLoans: number
  loanDays: number
  renewalDays: number
  maxRenewals: number
  maxActiveReservations: number
  pickupDays: number
  timeZone: string
}
export interface AuditLog {
  id: Id
  actorId: Id | null
  actorName: string | null
  action: string
  entityType: string
  entityId: Id
  traceId: string
  occurredAt: string
}
export interface AdminUser extends User {
  phone?: string | null
  status: AccountStatus
}
