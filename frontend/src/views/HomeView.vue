<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import { errorText } from '@/api/http'
import type { BookSummary, Notice } from '@/api/types'
import { dateTime } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'
import BookCard from '@/components/BookCard.vue'
import LoadState from '@/components/LoadState.vue'
import { Search, Reading, Calendar, Bell, ArrowRight } from '@element-plus/icons-vue'
const router = useRouter()
const auth = useAuthStore()
const keyword = ref('')
const books = ref<BookSummary[]>([])
const notices = ref<Notice[]>([])
const loading = ref(true)
const error = ref('')
async function load() {
  loading.value = true
  error.value = ''
  try {
    const [b, n] = await Promise.all([
      api.books({ page: 1, size: 4 }),
      api.notices({ page: 1, size: 3, status: 'PUBLISHED' }),
    ])
    books.value = b.items
    notices.value = n.items
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}
function search() {
  router.push({
    path: '/books',
    query: keyword.value.trim() ? { keyword: keyword.value.trim() } : {},
  })
}
onMounted(load)
</script>
<template>
  <section class="hero home-hero">
    <h1>让阅读，遇见更好的自己</h1>
    <p>搜索馆藏，找到下一本想读的书</p>
    <form class="home-search" @submit.prevent="search">
      <el-input v-model="keyword" placeholder="输入书名、作者或 ISBN 搜索馆藏" clearable
        ><template #prefix
          ><el-icon><Search /></el-icon></template
      ></el-input>
      <el-button type="primary" native-type="submit" :icon="Search">搜索图书</el-button>
    </form>
    <div class="home-shortcuts">
      <RouterLink to="/books"
        >浏览图书目录 <el-icon><ArrowRight /></el-icon></RouterLink
      ><RouterLink to="/notices"
        >查看系统公告 <el-icon><ArrowRight /></el-icon></RouterLink
      ><RouterLink v-if="auth.user?.role === 'READER'" to="/me/reservations"
        >我的预约 <el-icon><ArrowRight /></el-icon
      ></RouterLink>
    </div>
  </section>
  <div class="home-columns">
    <section class="panel home-books">
      <div class="section-head">
        <h2>
          <el-icon><Reading /></el-icon>新到馆藏
        </h2>
        <RouterLink to="/books"
          >查看全部 <el-icon><ArrowRight /></el-icon
        ></RouterLink>
      </div>
      <LoadState :loading="loading" :error="error" :empty="!books.length" @retry="load"
        ><div class="book-grid"><BookCard v-for="book in books" :key="book.id" :book="book" /></div
      ></LoadState>
    </section>
    <div class="home-aside">
      <section class="panel home-notices">
        <div class="section-head">
          <h2>
            <el-icon><Bell /></el-icon>最新公告
          </h2>
          <RouterLink to="/notices"
            >更多 <el-icon><ArrowRight /></el-icon
          ></RouterLink>
        </div>
        <LoadState :loading="loading" :error="error" :empty="!notices.length" @retry="load"
          ><RouterLink
            v-for="notice in notices"
            :key="notice.id"
            :to="`/notices/${notice.id}`"
            class="home-notice"
            ><span><i class="notice-dot" />{{ notice.title }}</span
            ><time>{{ dateTime(notice.publishedAt).slice(0, 10) }}</time></RouterLink
          ></LoadState
        >
      </section>
      <section class="panel home-services">
        <div class="section-head"><h2>我的服务</h2></div>
        <div class="service-links">
          <RouterLink to="/me/loans"
            ><span class="service-icon"
              ><el-icon><Reading /></el-icon></span
            ><strong>我的借阅</strong><small>查看借阅 · 在线续借</small></RouterLink
          ><RouterLink to="/me/reservations"
            ><span class="service-icon green"
              ><el-icon><Calendar /></el-icon></span
            ><strong>我的预约</strong><small>排队进度 · 待取信息</small></RouterLink
          >
        </div>
      </section>
    </div>
  </div>
</template>
