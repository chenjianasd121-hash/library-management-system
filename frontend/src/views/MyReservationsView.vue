<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import { ApiError, errorText } from '@/api/http'
import type { ReservationItem } from '@/api/types'
import { dateTime, newKey, reasonLabel, statusLabel, statusTone } from '@/utils/format'
import LoadState from '@/components/LoadState.vue'
import PageHeading from '@/components/PageHeading.vue'
import { Refresh, InfoFilled } from '@element-plus/icons-vue'
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
  <section class="panel reader-records reservations-panel">
    <div class="record-toolbar">
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
      ><el-button :icon="Refresh" @click="load">刷新</el-button>
    </div>
    <p v-if="status === 'READY'" class="record-tip">
      <el-icon><InfoFilled /></el-icon>请到馆由馆员办理借出。
    </p>
    <p v-else-if="status === 'WAITING'" class="record-tip waiting-tip">
      <el-icon><InfoFilled /></el-icon>排队中的预约暂未分配副本，轮到您时将显示待取信息。
    </p>
    <LoadState
      :loading="loading"
      :error="error"
      :empty="!items.length"
      empty-text="暂无预约记录"
      @retry="load"
    >
      <el-table :data="items" class="reservation-table" row-key="id">
        <el-table-column label="图书名称" min-width="210"
          ><template #default="{ row }"
            ><RouterLink :to="`/books/${row.bookId}`" class="record-book-title">{{
              row.bookTitle
            }}</RouterLink
            ><el-tag :type="statusTone(row.status)">{{
              statusLabel[row.status as keyof typeof statusLabel]
            }}</el-tag></template
          ></el-table-column
        >
        <el-table-column label="申请时间" min-width="160"
          ><template #default="{ row }">{{ dateTime(row.requestedAt) }}</template></el-table-column
        >
        <el-table-column v-if="status === 'WAITING'" label="当前排队位置" min-width="150"
          ><template #default="{ row }"
            ><span class="queue-number">{{ row.queuePosition ?? '待更新' }}</span></template
          ></el-table-column
        >
        <el-table-column v-if="status === 'READY'" label="待取截止" min-width="170"
          ><template #default="{ row }"
            ><strong>{{ row.pickupDeadline || '—' }}</strong
            ><small class="record-sub">当日结束前</small></template
          ></el-table-column
        >
        <el-table-column
          v-if="status === 'READY'"
          prop="shelfLocation"
          label="馆藏位置"
          min-width="140"
          ><template #default="{ row }">{{
            row.shelfLocation || '请咨询馆员'
          }}</template></el-table-column
        >
        <el-table-column
          v-if="status === 'READY'"
          prop="copyBarcode"
          label="条码"
          min-width="155"
        />
        <el-table-column label="操作" min-width="135"
          ><template #default="{ row }"
            ><el-button
              v-if="row.allowedActions?.canCancel"
              class="cancel-reservation"
              :loading="busy === row.id"
              @click="cancel(row)"
              >取消预约</el-button
            ><span v-else class="muted">{{
              reasonLabel(row.allowedActions?.reasonCode) || '—'
            }}</span></template
          ></el-table-column
        >
      </el-table>
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
        />
      </div>
    </LoadState>
  </section>
</template>
