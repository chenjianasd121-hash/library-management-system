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
import { Reading, InfoFilled } from '@element-plus/icons-vue'
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
  <div class="detail-breadcrumb">
    <RouterLink to="/books">图书目录</RouterLink><span>/</span><span>图书详情</span>
  </div>
  <div class="page-heading">
    <div><h1>图书详情</h1></div>
    <RouterLink to="/books"><el-button>← 返回目录</el-button></RouterLink>
  </div>
  <LoadState :loading="loading" :error="error" :empty="!book" @retry="load">
    <template v-if="book">
      <section class="panel detail-summary">
        <img
          v-if="book.coverPath"
          class="detail-cover"
          :src="book.coverPath"
          :alt="`${book.title}封面`"
        />
        <div v-else class="detail-cover cover-placeholder">
          <el-icon><Reading /></el-icon><span>暂无封面</span>
        </div>
        <div class="detail-summary-body">
          <el-tag :type="book.availableCopies ? 'success' : 'warning'">{{
            book.availableCopies ? '馆内有可借副本' : '可预约排队'
          }}</el-tag>
          <h2>{{ book.title }}</h2>
          <p>{{ book.author }}<span>·</span>{{ book.categoryName }}</p>
          <div class="detail-counts">
            <span
              >可借 <strong>{{ book.availableCopies }}</strong></span
            ><span>总册 {{ book.totalCopies }}</span
            ><span>待取 {{ book.readyCopies }}</span
            ><span>借出 {{ book.borrowedCopies }}</span>
          </div>
        </div>
      </section>
      <section class="panel book-metadata">
        <h2>书目信息</h2>
        <dl>
          <div>
            <dt>ISBN</dt>
            <dd>{{ book.isbn || '暂无' }}</dd>
          </div>
          <div>
            <dt>出版日期</dt>
            <dd>{{ book.publishedOn || '暂无' }}</dd>
          </div>
          <div>
            <dt>出版社</dt>
            <dd>{{ book.publisher || '暂无' }}</dd>
          </div>
          <div>
            <dt>关键词</dt>
            <dd>{{ book.keywords || '暂无' }}</dd>
          </div>
        </dl>
        <h3>内容简介</h3>
        <p class="pre-wrap">{{ book.description || '暂无简介' }}</p>
        <el-alert
          v-if="userError"
          type="warning"
          :title="`预约资格暂不可确认：${userError}`"
          :closable="false"
          class="form-alert"
        />
        <div class="detail-actions">
          <p>
            <el-icon><InfoFilled /></el-icon
            >{{
              restriction ||
              (book.availableCopies
                ? '预约成功后，请在待取截止日期前到馆取书。'
                : '暂无可借副本，预约后将按顺序排队。')
            }}
          </p>
          <div class="action-row">
            <RouterLink v-if="auth.user?.role === 'READER'" to="/me/reservations"
              ><el-button>查看我的预约</el-button></RouterLink
            ><el-button
              type="primary"
              :loading="busy"
              :disabled="!!restriction || !!userError || !book.enabled"
              @click="reserve"
              >{{ book.availableCopies ? '预约待取' : '预约排队' }}</el-button
            >
          </div>
        </div>
      </section>
    </template>
  </LoadState>
</template>
