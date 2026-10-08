<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { roleHome } from '@/router'
import {
  Search,
  Menu,
  ArrowDown,
  House,
  Reading,
  Collection,
  Tickets,
  User,
  DataAnalysis,
  Setting,
  Document,
  SwitchButton,
} from '@element-plus/icons-vue'
import type { Component } from 'vue'
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const mobileOpen = ref(false)
const search = ref('')
interface NavLink {
  to: string
  label: string
  icon: Component
  children?: { to: string; label: string }[]
}
const links = computed<NavLink[]>(() => {
  if (auth.user?.role === 'ADMIN' || auth.user?.role === 'LIBRARIAN')
    return [
      { to: '/staff/dashboard', label: '首页概览', icon: House },
      {
        to: '/staff/books',
        label: '图书管理',
        icon: Reading,
        children: [
          { to: '/staff/books', label: '书目列表' },
          { to: '/staff/books/new', label: '新增书目' },
          { to: '/books', label: '公开目录' },
        ],
      },
      {
        to: '/staff/loans',
        label: '借阅管理',
        icon: Collection,
        children: [
          { to: '/staff/checkout', label: '办理借出' },
          { to: '/staff/return', label: '办理归还' },
          { to: '/staff/loans', label: '借阅记录' },
          { to: '/staff/reservations', label: '预约管理' },
        ],
      },
      {
        to: auth.user.role === 'ADMIN' ? '/admin/users' : '/staff/checkout',
        label: auth.user.role === 'ADMIN' ? '读者管理' : '读者查找',
        icon: User,
      },
      { to: '/staff/categories', label: '分类管理', icon: Tickets },
      { to: '/staff/stats', label: '数据统计', icon: DataAnalysis },
      {
        to: '/staff/notices',
        label: '系统设置',
        icon: Setting,
        children: [
          { to: '/staff/notices', label: '公告管理' },
          ...(auth.user.role === 'ADMIN' ? [{ to: '/admin/audit', label: '审计日志' }] : []),
          { to: '/me/profile', label: '个人资料' },
          { to: '/notices', label: '公开公告' },
        ],
      },
    ]
  const base: NavLink[] = [
    { to: '/', label: '首页概览', icon: House },
    { to: '/books', label: '图书目录', icon: Reading },
    { to: '/notices', label: '系统公告', icon: Document },
  ]
  if (auth.user?.role === 'READER')
    base.push(
      { to: '/me/loans', label: '我的借阅', icon: Collection },
      { to: '/me/reservations', label: '我的预约', icon: Tickets },
      { to: '/me/profile', label: '个人中心', icon: User },
    )
  return base
})
function active(link: NavLink) {
  return (
    route.path === link.to ||
    (link.to !== '/' && route.path.startsWith(link.to + '/')) ||
    !!link.children?.some(
      (child) => route.path === child.to || route.path.startsWith(child.to + '/'),
    )
  )
}
function submitSearch() {
  router.push({
    path: '/books',
    query: search.value.trim() ? { keyword: search.value.trim() } : {},
  })
  mobileOpen.value = false
}
async function logout() {
  try {
    await auth.logout()
    await router.replace('/')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '退出失败')
  }
}
</script>
<template>
  <div class="app-layout">
    <div v-if="mobileOpen" class="mobile-scrim" @click="mobileOpen = false" />
    <aside class="sidebar" :class="{ open: mobileOpen }">
      <RouterLink :to="roleHome(auth.user?.role)" class="brand" @click="mobileOpen = false"
        ><span class="brand-mark"><el-icon><Reading /></el-icon></span
        ><span><strong>图书管理系统</strong><small>LIBRARY MANAGEMENT</small></span></RouterLink
      >
      <nav aria-label="主导航">
        <div v-for="link in links" :key="link.to" class="nav-group">
          <RouterLink :to="link.to" :class="{ active: active(link) }" @click="mobileOpen = false"
            ><el-icon><component :is="link.icon" /></el-icon><span>{{ link.label }}</span
            ><span class="nav-arrow">›</span></RouterLink
          >
          <div
            v-if="link.children && active(link) && route.path !== '/staff/dashboard'"
            class="subnav"
          >
            <RouterLink
              v-for="child in link.children"
              :key="child.to"
              :to="child.to"
              @click="mobileOpen = false"
              >{{ child.label }}</RouterLink
            >
          </div>
        </div>
      </nav>
      <div class="sidebar-quote"><p>书籍是人类进步的阶梯</p><span>—— 高尔基</span></div>
    </aside>
    <div class="main-column">
      <header class="topbar">
        <button class="icon-button" aria-label="打开导航" @click="mobileOpen = !mobileOpen">
          <el-icon><Menu /></el-icon>
        </button>
        <form class="top-search" @submit.prevent="submitSearch">
          <el-icon><Search /></el-icon
          ><input
            v-model="search"
            aria-label="搜索图书"
            placeholder="搜索图书、作者、分类等..."
          /><button type="submit" aria-label="搜索">搜索</button>
        </form>
        <div class="top-spacer" />
        <template v-if="auth.user"
          ><el-dropdown trigger="click"
            ><button class="account-button">
              <span class="avatar">{{ auth.user.displayName.slice(0, 1) }}</span
              ><span class="account-name">欢迎回来，{{ auth.user.displayName }}</span
              ><el-icon><ArrowDown /></el-icon></button
            ><template #dropdown
              ><el-dropdown-menu
                ><el-dropdown-item @click="router.push('/me/profile')">个人资料</el-dropdown-item
                ><el-dropdown-item @click="router.push('/change-password')"
                  >修改密码</el-dropdown-item
                ><el-dropdown-item divided @click="logout"
                  ><el-icon><SwitchButton /></el-icon>退出登录</el-dropdown-item
                ></el-dropdown-menu
              ></template
            ></el-dropdown
          ></template
        ><RouterLink v-else to="/login" class="top-login">登录 / 注册</RouterLink>
      </header>
      <main class="page-content" :class="`view-${String(route.name || 'page')}`">
        <el-alert
          v-if="auth.backendError"
          class="backend-alert"
          type="warning"
          :closable="false"
          show-icon
          :title="`后端连接状态：${auth.backendError}`"
          ><template #default
            >页面会如实显示请求失败；后端启动后可点击页面中的“重新加载”。</template
          ></el-alert
        ><slot />
      </main>
    </div>
  </div>
</template>
