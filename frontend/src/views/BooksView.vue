<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'
import { errorText } from '@/api/http'
import type { BookSummary, Category } from '@/api/types'
import PageHeading from '@/components/PageHeading.vue'
import LoadState from '@/components/LoadState.vue'
import BookCard from '@/components/BookCard.vue'
import { Search } from '@element-plus/icons-vue'
const route = useRoute()
const router = useRouter()
const form = reactive({ keyword: '', categoryId: '', availableOnly: false })
const categories = ref<Category[]>([])
const books = ref<BookSummary[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const error = ref('')
const categoryError = ref('')
let loadVersion = 0
function sync() {
  form.keyword = String(route.query.keyword || '')
  form.categoryId = String(route.query.categoryId || '')
  form.availableOnly = route.query.availableOnly === 'true'
  page.value = Math.max(1, Number(route.query.page) || 1)
}
async function load() {
  const version = ++loadVersion
  loading.value = true
  error.value = ''
  try {
    const data = await api.books({
      keyword: form.keyword,
      categoryId: form.categoryId,
      availableOnly: form.availableOnly || undefined,
      page: page.value,
      size: 6,
    })
    if (version !== loadVersion) return
    books.value = data.items
    total.value = data.total
  } catch (e) {
    if (version === loadVersion) error.value = errorText(e)
  } finally {
    if (version === loadVersion) loading.value = false
  }
}
function apply(next = 1) {
  router.push({
    path: '/books',
    query: {
      ...(form.keyword.trim() ? { keyword: form.keyword.trim() } : {}),
      ...(form.categoryId ? { categoryId: form.categoryId } : {}),
      ...(form.availableOnly ? { availableOnly: 'true' } : {}),
      ...(next > 1 ? { page: String(next) } : {}),
    },
  })
  document.querySelector('.results-anchor')?.scrollIntoView({ behavior: 'smooth' })
}
watch(
  () => route.fullPath,
  () => {
    sync()
    load()
  },
)
onMounted(async () => {
  sync()
  load()
  try {
    categories.value = await api.categories(true)
  } catch (e) {
    categoryError.value = errorText(e)
  }
})
</script>
<template>
  <PageHeading title="图书目录" description="检索馆藏，查看可借数量，找到下一本想读的书" />
  <section class="panel filter-panel catalogue-filter">
    <form class="list-toolbar" @submit.prevent="apply()">
      <el-input
        v-model="form.keyword"
        placeholder="输入书名、作者或 ISBN 搜索馆藏"
        clearable
        @keyup.enter="apply()"
        ><template #prefix
          ><el-icon><Search /></el-icon></template></el-input
      ><el-select v-model="form.categoryId" placeholder="全部分类" clearable
        ><el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" /></el-select
      ><el-checkbox v-model="form.availableOnly">仅看可借</el-checkbox
      ><el-button type="primary" native-type="submit" :icon="Search">搜索</el-button>
    </form>
    <el-alert
      v-if="categoryError"
      type="warning"
      :title="`分类加载失败：${categoryError}`"
      :closable="false"
      class="form-alert"
    />
  </section>
  <div class="results-anchor catalogue-total">
    共找到 <strong>{{ total }}</strong> 本图书
  </div>
  <section class="catalogue-results">
    <LoadState
      :loading="loading"
      :error="error"
      :empty="!books.length"
      empty-text="未找到符合条件的图书"
      @retry="load"
      ><div class="book-grid"><BookCard v-for="book in books" :key="book.id" :book="book" /></div>
      <div class="pager">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="total"
          :page-size="6"
          :current-page="page"
          @current-change="apply"
        /></div
    ></LoadState>
  </section>
</template>
