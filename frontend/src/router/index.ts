import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/api/types'
import { portal, portalHome, portalRole, portalTitle } from '@/portal'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    roles?: Role[]
  }
}
const staff: Role[] = ['LIBRARIAN', 'ADMIN']
const reader: Role[] = ['READER']
const admin: Role[] = ['ADMIN']
const route = (
  path: string,
  name: string,
  component: () => Promise<unknown>,
  title: string,
  roles?: Role[],
) => ({ path, name, component, meta: { title, requiresAuth: !!roles, roles } })
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    route('/', 'home', () => import('@/views/HomeView.vue'), '首页'),
    route('/login', 'login', () => import('@/views/LoginView.vue'), '登录'),
    route('/register', 'register', () => import('@/views/RegisterView.vue'), '读者注册'),
    route('/books', 'books', () => import('@/views/BooksView.vue'), '图书目录'),
    route('/books/:id', 'book-detail', () => import('@/views/BookDetailView.vue'), '图书详情'),
    route('/notices', 'notices', () => import('@/views/NoticesView.vue'), '系统公告'),
    route(
      '/notices/:id',
      'notice-detail',
      () => import('@/views/NoticeDetailView.vue'),
      '公告详情',
    ),
    route('/me/loans', 'my-loans', () => import('@/views/MyLoansView.vue'), '我的借阅', reader),
    route(
      '/me/reservations',
      'my-reservations',
      () => import('@/views/MyReservationsView.vue'),
      '我的预约',
      reader,
    ),
    route('/me/profile', 'profile', () => import('@/views/ProfileView.vue'), '个人资料', [
      ...reader,
      ...staff,
    ]),
    route(
      '/change-password',
      'change-password',
      () => import('@/views/ChangePasswordView.vue'),
      '修改密码',
      [...reader, ...staff],
    ),
    route(
      '/staff/dashboard',
      'dashboard',
      () => import('@/views/DashboardView.vue'),
      '工作台',
      staff,
    ),
    route(
      '/staff/books',
      'staff-books',
      () => import('@/views/StaffBooksView.vue'),
      '书目管理',
      staff,
    ),
    route(
      '/staff/books/new',
      'book-new',
      () => import('@/views/BookFormView.vue'),
      '新增书目',
      staff,
    ),
    route(
      '/staff/books/:id/edit',
      'book-edit',
      () => import('@/views/BookFormView.vue'),
      '编辑书目',
      staff,
    ),
    route(
      '/staff/books/:id/copies',
      'copies',
      () => import('@/views/CopiesView.vue'),
      '副本管理',
      staff,
    ),
    route(
      '/staff/categories',
      'categories',
      () => import('@/views/CategoriesView.vue'),
      '分类管理',
      staff,
    ),
    route(
      '/staff/checkout',
      'checkout',
      () => import('@/views/CheckoutView.vue'),
      '办理借出',
      staff,
    ),
    route('/staff/return', 'return', () => import('@/views/ReturnView.vue'), '办理归还', staff),
    route(
      '/staff/loans',
      'staff-loans',
      () => import('@/views/StaffLoansView.vue'),
      '借阅管理',
      staff,
    ),
    route(
      '/staff/reservations',
      'staff-reservations',
      () => import('@/views/StaffReservationsView.vue'),
      '预约管理',
      staff,
    ),
    route(
      '/staff/notices',
      'staff-notices',
      () => import('@/views/StaffNoticesView.vue'),
      '公告管理',
      staff,
    ),
    route('/staff/stats', 'stats', () => import('@/views/StatsView.vue'), '数据统计', staff),
    route('/admin/users', 'users', () => import('@/views/UsersView.vue'), '账号管理', admin),
    route('/admin/audit', 'audit', () => import('@/views/AuditView.vue'), '审计日志', admin),
    route('/403', 'forbidden', () => import('@/views/ForbiddenView.vue'), '无权限'),
    route('/:pathMatch(.*)*', 'not-found', () => import('@/views/NotFoundView.vue'), '页面不存在'),
  ],
})

export function safeRedirect(value: unknown) {
  return typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\')
    ? value
    : '/'
}
export function roleHome(role?: Role) {
  return role === 'READER'
    ? '/me/loans'
    : role === 'LIBRARIAN' || role === 'ADMIN'
      ? '/staff/dashboard'
      : '/'
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.restore()
  if (auth.user && auth.user.role !== portalRole) auth.clear()
  if (portal !== 'reader' && to.path === '/register') return '/login'
  if (portal === 'reader' && /^\/(staff|admin)(\/|$)/.test(to.path)) return '/403'
  if (portal !== 'reader' && !auth.user && to.path !== '/login')
    return { path: '/login', query: { redirect: to.fullPath } }
  if (portal !== 'reader' && to.path === '/') return portalHome
  if (auth.user?.mustChangePassword && to.path !== '/change-password')
    return { path: '/change-password', query: { redirect: to.fullPath } }
  if (to.meta.requiresAuth && !auth.user)
    return { path: '/login', query: { redirect: to.fullPath } }
  if (to.meta.roles?.length && auth.user && !to.meta.roles.includes(auth.user.role)) return '/403'
  if ((to.path === '/login' || to.path === '/register') && auth.user)
    return roleHome(auth.user.role)
})
router.afterEach((to) => {
  document.title = `${to.meta.title || '图书管理系统'} · ${portalTitle}`
})

export default router
