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
      api.notices({ page: 1, size: 5 }),
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
    <div class="eyebrow">✦ GRADUATION PROJECT</div>
    <h1>基于SpringBoot+Vue的图书管理系统</h1>
    <p>让每一本书被看见，让每一次阅读更从容</p>
    <div class="hero-notes">
      <span>◈ 简洁高效</span><span>◉ 馆藏可查</span><span>▣ 借阅有序</span>
    </div>
    <div class="hero-script">让阅读<br />遇见更好的自己</div>
  </section>
  <div class="home-search surface">
    <form @submit.prevent="search">
      <el-input
        v-model="keyword"
        size="large"
        placeholder="输入书名、作者或 ISBN 搜索馆藏"
        clearable
      /><el-button type="primary" size="large" native-type="submit">搜索图书</el-button>
    </form>
    <div class="home-shortcuts">
      <RouterLink to="/books">浏览图书目录 →</RouterLink
      ><RouterLink to="/notices">查看系统公告 →</RouterLink
      ><RouterLink v-if="auth.user?.role === 'READER'" to="/me/reservations">我的预约 →</RouterLink
      ><RouterLink
        v-if="auth.user?.role === 'ADMIN' || auth.user?.role === 'LIBRARIAN'"
        to="/staff/dashboard"
        >进入工作台 →</RouterLink
      >
    </div>
  </div>
  <div class="home-columns">
    <section class="panel">
      <div class="section-head">
        <h2>新到馆藏</h2>
        <RouterLink to="/books">查看全部 →</RouterLink>
      </div>
      <LoadState :loading="loading" :error="error" :empty="!books.length" @retry="load"
        ><div class="book-grid"><BookCard v-for="book in books" :key="book.id" :book="book" /></div
      ></LoadState>
    </section>
    <section class="panel">
      <div class="section-head">
        <h2>最新公告</h2>
        <RouterLink to="/notices">查看全部 →</RouterLink>
      </div>
      <LoadState :loading="loading" :error="error" :empty="!notices.length" @retry="load"
        ><div v-for="notice in notices" :key="notice.id" class="notice-row">
          <span class="notice-dot" /><RouterLink :to="`/notices/${notice.id}`">{{
            notice.title
          }}</RouterLink
          ><time>{{ dateTime(notice.publishedAt) }}</time>
        </div></LoadState
      >
    </section>
  </div>
</template>
<style scoped>
.home-search {
  margin: 16px 0;
  padding: 18px;
}
.home-search form {
  display: flex;
  gap: 10px;
  max-width: 800px;
}
.home-shortcuts {
  display: flex;
  gap: 22px;
  flex-wrap: wrap;
  margin-top: 14px;
  color: #2c78e7;
  font-size: 13px;
}
.home-columns {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 14px;
}
.home-columns .book-grid {
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}
@media (max-width: 900px) {
  .home-columns {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 600px) {
  .home-search form {
    flex-direction: column;
  }
}
</style>
