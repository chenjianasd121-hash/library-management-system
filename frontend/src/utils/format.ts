import type { CopyStatus, LoanStatus, NoticeStatus, ReservationStatus } from '@/api/types'
export function dateTime(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(value))
    : '—'
}
export function dueDate(value?: string | null) {
  return value ? `${value} 当日结束前` : '—'
}
export function expectedDueDate(days: number, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const part = (name: string) => Number(parts.find((p) => p.type === name)?.value)
  return new Date(Date.UTC(part('year'), part('month') - 1, part('day') + days))
    .toISOString()
    .slice(0, 10)
}
export const statusLabel: Record<
  CopyStatus | LoanStatus | ReservationStatus | NoticeStatus,
  string
> = {
  AVAILABLE: '可借',
  READY: '待取',
  BORROWED: '借出',
  MAINTENANCE: '维修',
  RETIRED: '退役',
  ACTIVE: '在借',
  RETURNED: '已归还',
  WAITING: '排队中',
  FULFILLED: '已履约',
  CANCELLED: '已取消',
  EXPIRED: '已过期',
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  WITHDRAWN: '已撤下',
}
export function statusTone(value: string) {
  return ['AVAILABLE', 'PUBLISHED', 'RETURNED', 'FULFILLED'].includes(value)
    ? 'success'
    : ['READY', 'ACTIVE', 'WAITING'].includes(value)
      ? 'primary'
      : ['MAINTENANCE', 'DRAFT'].includes(value)
        ? 'warning'
        : ['BORROWED', 'EXPIRED'].includes(value)
          ? 'danger'
          : 'info'
}
export function reasonLabel(code?: string) {
  const reasons: Record<string, string> = {
    OVERDUE_BLOCKED: '存在逾期借阅，请先到馆归还',
    RENEWAL_NOT_ALLOWED: '当前不符合续借条件',
    ACTIVE_RESERVATION_EXISTS: '已有该书有效预约',
    ACTIVE_LOAN_EXISTS: '已借阅该书',
    BORROW_LIMIT_REACHED: '已达到借阅上限',
    RESERVATION_LIMIT_REACHED: '已达到预约上限',
    COPY_NOT_AVAILABLE: '副本当前不可借',
    HOLD_EXPIRED: '待取预约已过期',
  }
  return code ? reasons[code] || code : ''
}
export function newKey() {
  return crypto.randomUUID()
}
