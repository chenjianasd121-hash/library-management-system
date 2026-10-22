<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Search,
  Fold,
  Expand,
  ArrowDown,
  ArrowRight,
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
import { useAuthStore } from '@/stores/auth'
import { portal, portalHome } from '@/portal'
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
const search = ref('')
const staff = portal !== 'reader'
const roleLabel = { reader: '读者端', librarian: '馆员端', admin: '管理员端' }[portal]
interface NavLink {
  to: string
  label: string
  icon: Component
  children?: { to: string; label: string }[]
}
const links = computed<NavLink[]>(() =>
  staff
    ? [
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
          to: portal === 'admin' ? '/admin/users' : '/staff/checkout?focus=reader',
          label: portal === 'admin' ? '读者管理' : '读者查找',
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
            ...(portal === 'admin' ? [{ to: '/admin/audit', label: '审计日志' }] : []),
            { to: '/me/profile', label: '个人资料' },
            { to: '/change-password', label: '修改密码' },
            { to: '/notices', label: '公开公告' },
          ],
        },
      ]
    : [
        { to: '/', label: '首页概览', icon: House },
        { to: '/books', label: '图书目录', icon: Reading },
        { to: '/notices', label: '系统公告', icon: Document },
        { to: '/me/loans', label: '我的借阅', icon: Collection },
        { to: '/me/reservations', label: '我的预约', icon: Tickets },
        {
          to: '/me/profile',
          label: '个人中心',
          icon: User,
          children: [
            { to: '/me/profile', label: '个人资料' },
            { to: '/change-password', label: '修改密码' },
          ],
        },
      ],
)
function active(link: NavLink) {
  if (link.to.includes('?')) return route.fullPath === link.to
  if (route.path === '/staff/checkout' && route.query.focus === 'reader') return false
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
}
async function logout() {
  try {
    await auth.logout()
    await router.replace('/login')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '退出失败')
  }
}
</script>
<template>
  <div class="app-layout" :class="['shell-' + portal, { 'sidebar-collapsed': collapsed }]">
    <aside class="sidebar">
      <RouterLink :to="staff ? portalHome : '/'" class="brand">
        <img class="brand-mark" :src="'/design/brand-mark.png'" alt="" />
        <span class="brand-text"
          ><strong>图书管理系统</strong><small>LIBRARY MANAGEMENT</small></span
        >
      </RouterLink>
      <div v-if="!staff" class="portal-badge">{{ roleLabel }}</div>
      <nav aria-label="主导航">
        <div v-for="link in links" :key="link.label" class="nav-group">
          <RouterLink :to="link.to" :class="{ active: active(link) }" :title="link.label">
            <el-icon><component :is="link.icon" /></el-icon><span>{{ link.label }}</span>
            <el-icon v-if="link.children" class="nav-arrow"><ArrowDown /></el-icon>
            <el-icon v-else class="nav-arrow"><ArrowRight /></el-icon>
          </RouterLink>
          <div v-if="link.children && active(link) && !collapsed" class="subnav">
            <RouterLink
              v-for="child in link.children"
              :key="child.to"
              :to="child.to"
              :class="{ selected: route.path === child.to }"
              >{{ child.label }}</RouterLink
            >
          </div>
        </div>
      </nav>
      <div class="sidebar-quote">
        <p>书籍是人类进步的阶梯</p>
        <span>—— 高尔基</span>
      </div>
    </aside>
    <div class="main-column">
      <header class="topbar">
        <button
          class="icon-button"
          :aria-label="collapsed ? '展开导航' : '收起导航'"
          @click="collapsed = !collapsed"
        >
          <el-icon><Expand v-if="collapsed" /><Fold v-else /></el-icon>
        </button>
        <form class="top-search" @submit.prevent="submitSearch">
          <el-icon><Search /></el-icon
          ><input v-model="search" aria-label="搜索图书" placeholder="搜索图书、作者、分类等..." />
          <button type="submit" aria-label="搜索">搜索</button>
        </form>
        <div class="top-spacer" />
        <el-dropdown v-if="auth.user" trigger="click">
          <button class="account-button">
            <span class="avatar">{{ auth.user.displayName.slice(0, 1) }}</span
            ><span class="account-name"
              ><strong>欢迎回来，{{ auth.user.displayName }}</strong
              ><small>{{ roleLabel.replace('端', '') }}</small></span
            ><el-icon><ArrowDown /></el-icon>
          </button>
          <template #dropdown
            ><el-dropdown-menu>
              <el-dropdown-item @click="router.push('/me/profile')">个人资料</el-dropdown-item>
              <el-dropdown-item @click="router.push('/change-password')">修改密码</el-dropdown-item>
              <el-dropdown-item divided @click="logout"
                ><el-icon><SwitchButton /></el-icon>退出登录</el-dropdown-item
              >
            </el-dropdown-menu></template
          >
        </el-dropdown>
        <RouterLink v-else to="/login" class="top-login">登录 / 注册</RouterLink>
      </header>
      <main class="page-content" :class="'view-' + String(route.name || 'page')">
        <div class="page-inner">
          <el-alert
            v-if="auth.backendError"
            class="backend-alert"
            type="warning"
            :closable="false"
            show-icon
            :title="'后端连接状态：' + auth.backendError"
            ><template #default>后端启动后可点击页面中的“重新加载”。</template></el-alert
          >
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
