<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import { ApiError, errorText } from '@/api/http'
import type { ReservationItem } from '@/api/types'
import { dateTime, newKey, statusLabel, statusTone } from '@/utils/format'
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
function applyFilter() {
  page.value = 1
  void load()
}
onMounted(load)
</script>
<template>
  <PageHeading title="预约管理" description="查看排队与待取预约，处理读者预约记录。" />
  <section class="panel staff-record-panel">
    <el-tabs v-model="filter.status" class="record-tabs" @tab-change="applyFilter"
      ><el-tab-pane label="全部" name="" /><el-tab-pane label="待取" name="READY" /><el-tab-pane
        label="排队中"
        name="WAITING" /><el-tab-pane label="已履约" name="FULFILLED" /><el-tab-pane
        label="已取消"
        name="CANCELLED" /><el-tab-pane label="已过期" name="EXPIRED"
    /></el-tabs>
    <form class="record-query" @submit.prevent="applyFilter">
      <label
        >读者<el-input
          v-model="filter.readerKeyword"
          placeholder="输入读者用户名或姓名"
          clearable /></label
      ><label>书目 ID<el-input v-model="filter.bookId" placeholder="输入书目 ID" clearable /></label
      ><el-button type="primary" native-type="submit">查询</el-button>
    </form>
    <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"
      ><div class="table-scroll">
        <el-table :data="items" class="management-table reservation-management-table">
          <el-table-column label="图书 / 读者" min-width="260"
            ><template #default="s"
              ><strong>{{ s.row.bookTitle }}</strong
              ><small>{{ s.row.readerName || '—' }}</small></template
            ></el-table-column
          >
          <el-table-column label="状态" width="150"
            ><template #default="s"
              ><el-tag :type="statusTone(s.row.status)">{{
                statusLabel[s.row.status as keyof typeof statusLabel]
              }}</el-tag></template
            ></el-table-column
          >
          <el-table-column label="排队 / 待取信息" min-width="270"
            ><template #default="s"
              ><template v-if="s.row.status === 'WAITING'"
                >排队第 <b class="text-primary">{{ s.row.queuePosition ?? '—' }}</b> 位</template
              ><template v-else-if="s.row.status === 'READY'"
                ><span>截止 {{ s.row.pickupDeadline || '—' }}</span
                ><small>当日结束前到馆取书</small
                ><small v-if="s.row.copyBarcode"
                  >{{ s.row.copyBarcode }} · {{ s.row.shelfLocation || '待分配位置' }}</small
                ></template
              ><span v-else class="muted">—</span></template
            ></el-table-column
          >
          <el-table-column label="申请时间" min-width="190"
            ><template #default="s"
              ><span class="wrapped-time">{{ dateTime(s.row.requestedAt) }}</span></template
            ></el-table-column
          >
          <el-table-column label="操作" width="100"
            ><template #default="s"
              ><el-button
                v-if="s.row.allowedActions?.canCancel"
                link
                type="danger"
                :loading="busy === s.row.id"
                @click="cancel(s.row)"
                >取消预约</el-button
              ><span v-else class="muted">—</span></template
            ></el-table-column
          >
        </el-table>
      </div>
      <div class="staff-list-footer">
        <span>共 {{ total }} 条记录</span
        ><el-pagination
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
  <p class="staff-page-footnote">取消预约需要填写业务原因；待取副本将按规则分配给下一位读者。</p>
</template>
