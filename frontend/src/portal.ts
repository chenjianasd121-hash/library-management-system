import type { Role } from '@/api/types'

export type Portal = 'reader' | 'librarian' | 'admin'

const configured = import.meta.env.VITE_PORTAL
export const portal: Portal =
  configured === 'admin' || configured === 'librarian' ? configured : 'reader'

export const portalRole: Role =
  portal === 'admin' ? 'ADMIN' : portal === 'librarian' ? 'LIBRARIAN' : 'READER'

export const portalHome = portal === 'reader' ? '/me/loans' : '/staff/dashboard'

export const portalTitle =
  portal === 'admin' ? '管理员入口' : portal === 'librarian' ? '馆员入口' : '读者入口'
