<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import { ApiError, errorText } from '@/api/http'
import type { ReservationItem } from '@/api/types'
import { dateTime, dueDate, newKey, statusLabel, statusTone } from '@/utils/format'
import LoadState from '@/components/LoadState.vue'
import PageHeading from '@/components/PageHeading.vue'
const filter = reactive({ status: 'READY', bookId: '', readerKeyword: '' }),
  items = ref<ReservationItem[]>([]),
  page = ref(1),
  total = ref(0),
  loading = ref(true),
  error = ref(''),
  busy = ref('')
const cancellationKey = ref<{ id: string; reason: string; key: string } | null>(null)
async function load() {
  loading.value = true
  error.value = ''
  try {
    const d = await api.reservations({
      status: filter.status || undefined,
      bookId: filter.bookId || undefined,
      readerKeyword: filter.readerKeyword || undefined,
      page: page.value,
      size: 10,
    })
    items.value = d.items
    total.value = d.total
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}
async function cancel(r: ReservationItem) {
  let reason = ''
  try {
    const answer = await ElMessageBox.prompt(
      `请填写取消《${r.bookTitle}》预约的业务原因。待取副本可能分配给下一位。`,
      '取消预约',
      {
        inputValidator: (v) => !!v.trim() || '必须填写原因',
        confirmButtonText: '确认取消',
        type: 'warning',
      },
    )
    reason = answer.value.trim()
  } catch {
    return
  }
  busy.value = r.id
  if (cancellationKey.value?.id !== r.id || cancellationKey.value.reason !== reason)
    cancellationKey.value = { id: r.id, reason, key: newKey() }
  try {
    await api.cancelReservation(r.id, reason, cancellationKey.value.key)
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
  <PageHeading title="预约管理" description="查看排队、待取与历史记录" />
  <section class="panel">
    <form
      class="list-toolbar"
      @submit.prevent="
        () => {
          page = 1
          load()
        }
      "
    >
      <el-select v-model="filter.status"
        ><el-option label="全部" value="" /><el-option label="待取" value="READY" /><el-option
          label="排队中"
          value="WAITING" /><el-option label="已履约" value="FULFILLED" /><el-option
          label="已取消"
          value="CANCELLED" /><el-option label="已过期" value="EXPIRED" /></el-select
      ><el-input v-model="filter.readerKeyword" placeholder="读者关键词" /><el-input
        v-model="filter.bookId"
        placeholder="书目 ID"
      /><el-button type="primary" native-type="submit">筛选</el-button>
    </form>
    <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"
      ><div class="table-scroll">
        <el-table :data="items" stripe class="data-table"
          ><el-table-column prop="bookTitle" label="书名" min-width="155" /><el-table-column
            prop="readerName"
            label="读者"
            width="110"
          /><el-table-column label="状态" width="110"
            ><template #default="s"
              ><el-tag :type="statusTone(s.row.status)">{{
                statusLabel[s.row.status as keyof typeof statusLabel]
              }}</el-tag></template
            ></el-table-column
          ><el-table-column label="排队位置" width="90"
            ><template #default="s">{{ s.row.queuePosition ?? '—' }}</template></el-table-column
          ><el-table-column label="申请时间" width="170"
            ><template #default="s">{{ dateTime(s.row.requestedAt) }}</template></el-table-column
          ><el-table-column label="待取截止" width="170"
            ><template #default="s">{{ dueDate(s.row.pickupDeadline) }}</template></el-table-column
          ><el-table-column label="操作" width="110"
            ><template #default="s"
              ><el-button
                v-if="s.row.allowedActions?.canCancel"
                link
                type="danger"
                :loading="busy === s.row.id"
                @click="cancel(s.row)"
                >取消</el-button
              ><span v-else>—</span></template
            ></el-table-column
          ></el-table
        >
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
