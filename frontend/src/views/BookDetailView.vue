<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import { ApiError, errorText } from '@/api/http'
import type { BookDetail, LoanItem, ReservationItem } from '@/api/types'
import { newKey } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'
import LoadState from '@/components/LoadState.vue'
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const book = ref<BookDetail | null>(null)
const loading = ref(true)
const error = ref('')
const busy = ref(false)
const operationKey = ref('')
const operationBookId = ref('')
const myReservations = ref<ReservationItem[]>([])
const myLoans = ref<LoanItem[]>([])
const userError = ref('')
const restriction = computed(() => {
  if (auth.user?.role !== 'READER') return auth.user ? '仅读者账号可预约' : ''
  if (myLoans.value.some((l) => l.overdueDays > 0)) return '存在逾期借阅，请先到馆归还'
  if (myLoans.value.some((l) => l.bookId === book.value?.id && l.status === 'ACTIVE'))
    return '您已借阅这本书'
  if (
    myReservations.value.some(
      (r) => r.bookId === book.value?.id && ['WAITING', 'READY'].includes(r.status),
    )
  )
    return '您已有这本书的有效预约'
  return ''
})
async function load() {
  loading.value = true
  error.value = ''
  try {
    book.value = await api.book(String(route.params.id))
    if (auth.user?.role === 'READER') {
      try {
        const [r, l] = await Promise.all([
          api.myReservations({ page: 1, size: 100 }),
          api.myLoans({ page: 1, size: 100 }),
        ])
        myReservations.value = r.items
        myLoans.value = l.items
        userError.value = ''
      } catch (e) {
        userError.value = errorText(e)
      }
    }
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}
async function reserve() {
  if (!auth.user) {
    await router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (!book.value || restriction.value || busy.value) return
  busy.value = true
  if (!operationKey.value || operationBookId.value !== book.value.id) {
    operationKey.value = newKey()
    operationBookId.value = book.value.id
  }
  try {
    const result = await api.reserve(book.value.id, operationKey.value)
    operationKey.value = ''
    operationBookId.value = ''
    ElMessage.success(result.status === 'READY' ? '预约成功，已可到馆取书' : '预约成功，已加入排队')
    await load()
  } catch (e) {
    ElMessage.error(errorText(e))
    if (!(e instanceof ApiError && e.status === 0)) operationKey.value = ''
    if (e instanceof ApiError && [409, 422].includes(e.status)) await load()
  } finally {
    busy.value = false
  }
}
onMounted(load)
watch(
  () => route.params.id,
  () => {
    operationKey.value = ''
    operationBookId.value = ''
    load()
  },
)
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">BOOK DETAIL</div>
      <h1>图书详情</h1>
    </div>
    <RouterLink to="/books" class="muted">← 返回目录</RouterLink>
  </div>
  <LoadState :loading="loading" :error="error" :empty="!book" @retry="load"
    ><section v-if="book" class="panel detail-layout">
      <div>
        <img
          v-if="book.coverPath"
          class="detail-cover"
          :src="book.coverPath"
          :alt="`${book.title}封面`"
        />
        <div v-else class="detail-cover detail-cover-placeholder">📖</div>
      </div>
      <div>
        <el-tag :type="book.availableCopies ? 'success' : 'warning'">{{
          book.availableCopies ? '馆内有可借副本' : '可预约排队'
        }}</el-tag>
        <h1>{{ book.title }}</h1>
        <p class="muted">{{ book.author }} · {{ book.categoryName }}</p>
        <el-descriptions :column="1" border
          ><el-descriptions-item label="ISBN">{{ book.isbn || '暂无' }}</el-descriptions-item
          ><el-descriptions-item label="出版社">{{ book.publisher || '暂无' }}</el-descriptions-item
          ><el-descriptions-item label="出版日期">{{
            book.publishedOn || '暂无'
          }}</el-descriptions-item
          ><el-descriptions-item label="副本数量"
            >总册 {{ book.totalCopies }} · 可借 {{ book.availableCopies }} · 待取
            {{ book.readyCopies }} · 借出 {{ book.borrowedCopies }}</el-descriptions-item
          ><el-descriptions-item label="关键词">{{
            book.keywords || '暂无'
          }}</el-descriptions-item></el-descriptions
        >
        <h3>内容简介</h3>
        <p class="pre-wrap">{{ book.description || '暂无简介' }}</p>
        <el-alert
          v-if="userError"
          type="warning"
          :title="`预约资格暂不可确认：${userError}`"
          :closable="false"
          class="form-alert"
        />
        <p v-if="restriction" class="muted">{{ restriction }}</p>
        <div class="action-row">
          <el-button
            type="primary"
            size="large"
            :loading="busy"
            :disabled="!!restriction || !!userError || !book.enabled"
            @click="reserve"
            >{{ book.availableCopies ? '预约待取' : '预约排队' }}</el-button
          ><RouterLink v-if="auth.user?.role === 'READER'" to="/me/reservations"
            ><el-button size="large">查看我的预约</el-button></RouterLink
          >
        </div>
      </div>
    </section></LoadState
  >
</template>
