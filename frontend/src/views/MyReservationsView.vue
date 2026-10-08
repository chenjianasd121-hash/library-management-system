<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import { ApiError, errorText } from '@/api/http'
import type { ReservationItem } from '@/api/types'
import { dateTime, dueDate, newKey, reasonLabel, statusLabel, statusTone } from '@/utils/format'
import LoadState from '@/components/LoadState.vue'
import PageHeading from '@/components/PageHeading.vue'
const items = ref<ReservationItem[]>([]),
  status = ref('READY'),
  page = ref(1),
  total = ref(0),
  loading = ref(true),
  error = ref(''),
  busy = ref('')
const cancellationKey = ref<{ id: string; key: string } | null>(null)
async function load() {
  loading.value = true
  error.value = ''
  try {
    const d = await api.myReservations({ status: status.value, page: page.value, size: 10 })
    items.value = d.items
    total.value = d.total
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}
async function cancel(r: ReservationItem) {
  try {
    await ElMessageBox.confirm(
      `确认取消《${r.bookTitle}》的预约？待取副本可能立即分配给下一位读者。`,
      '取消预约',
      { type: 'warning' },
    )
  } catch {
    return
  }
  busy.value = r.id
  if (cancellationKey.value?.id !== r.id) cancellationKey.value = { id: r.id, key: newKey() }
  try {
    await api.cancelReservation(r.id, undefined, cancellationKey.value.key)
    cancellationKey.value = null
    ElMessage.success('预约已取消')
    await load()
  } catch (e) {
    ElMessage.error(errorText(e))
    if (!(e instanceof ApiError && e.status === 0)) cancellationKey.value = null
    if (e instanceof ApiError && [409, 422].includes(e.status)) await load()
  } finally {
    busy.value = ''
  }
}
onMounted(load)
</script>
<template>
  <PageHeading title="我的预约" description="查看排队进度与待取信息" />
  <section class="panel">
    <div class="list-toolbar">
      <el-radio-group
        v-model="status"
        @change="
          () => {
            page = 1
            load()
          }
        "
        ><el-radio-button value="READY">待取</el-radio-button
        ><el-radio-button value="WAITING">排队中</el-radio-button
        ><el-radio-button value="HISTORY">历史</el-radio-button></el-radio-group
      ><el-button @click="load">刷新</el-button>
    </div>
    <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"
      ><div class="reservation-list">
        <article v-for="r in items" :key="r.id" class="reservation-card">
          <div>
            <el-tag :type="statusTone(r.status)">{{ statusLabel[r.status] }}</el-tag
            ><RouterLink :to="`/books/${r.bookId}`"
              ><h3>{{ r.bookTitle }}</h3></RouterLink
            >
            <p class="muted">申请时间 {{ dateTime(r.requestedAt) }}</p>
            <p v-if="r.status === 'WAITING'">
              当前排队位置：<strong>{{ r.queuePosition ?? '待更新' }}</strong>
            </p>
            <template v-if="r.status === 'READY'"
              ><p>
                待取截止：<strong>{{ dueDate(r.pickupDeadline) }}</strong>
              </p>
              <p>
                馆藏位置：{{ r.shelfLocation || '请咨询馆员' }} · 条码：{{ r.copyBarcode || '—' }}
              </p>
              <p class="text-success">请到馆由馆员办理借出。</p></template
            >
          </div>
          <el-button v-if="r.allowedActions?.canCancel" :loading="busy === r.id" @click="cancel(r)"
            >取消预约</el-button
          ><span v-else class="muted">{{ reasonLabel(r.allowedActions?.reasonCode) }}</span>
        </article>
      </div>
      <div class="pager">
        <el-pagination
          background
          layout="prev, pager, next"
          :current-page="page"
          :page-size="10"
          :total="total"
          @current-change="
            (n: number) => {
              page = n
              load()
            }
          "
        /></div
    ></LoadState>
  </section>
</template>
<style scoped>
.reservation-list {
  display: grid;
  gap: 12px;
}
.reservation-card {
  border: 1px solid #e8eef7;
  border-radius: 10px;
  padding: 18px;
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 15px;
}
.reservation-card h3 {
  margin: 8px 0;
  color: #132a52;
}
.reservation-card p {
  margin: 4px 0;
  font-size: 14px;
}
@media (max-width: 600px) {
  .reservation-card {
    flex-direction: column;
  }
}
</style>
