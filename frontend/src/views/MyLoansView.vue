<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import { ApiError, errorText } from '@/api/http'
import type { LoanItem, Policy } from '@/api/types'
import { dateTime, dueDate, newKey, reasonLabel, statusLabel, statusTone } from '@/utils/format'
import LoadState from '@/components/LoadState.vue'
import PageHeading from '@/components/PageHeading.vue'
const items = ref<LoanItem[]>([]),
  overdue = ref<LoanItem[]>([]),
  page = ref(1),
  total = ref(0),
  filter = ref('ACTIVE'),
  loading = ref(true),
  error = ref(''),
  busy = ref(''),
  renewalKey = ref<{ id: string; key: string } | null>(null),
  policy = ref<Policy | null>(null)
async function load() {
  loading.value = true
  error.value = ''
  try {
    const [d, overduePage, currentPolicy] = await Promise.all([
      api.myLoans({
        status: filter.value === 'ALL' ? undefined : filter.value,
        page: page.value,
        size: 10,
      }),
      api.myLoans({ status: 'ACTIVE', overdue: true, page: 1, size: 100 }),
      api.policy(),
    ])
    items.value = d.items
    total.value = d.total
    overdue.value = overduePage.items
    policy.value = currentPolicy
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}
async function renew(item: LoanItem) {
  if (busy.value) return
  try {
    await ElMessageBox.confirm(
      `每册仅可续借一次，新到期日为原到期日加 ${policy.value?.renewalDays ?? 15} 天。确认续借《${item.bookTitle}》？`,
      '确认续借',
      { type: 'warning' },
    )
  } catch {
    return
  }
  busy.value = item.id
  if (renewalKey.value?.id !== item.id) renewalKey.value = { id: item.id, key: newKey() }
  try {
    const r = await api.renew(item.id, renewalKey.value.key)
    renewalKey.value = null
    ElMessage.success(`续借成功，新到期日 ${dueDate(r.dueDate)}`)
    await load()
  } catch (e) {
    ElMessage.error(errorText(e))
    if (!(e instanceof ApiError && e.status === 0)) renewalKey.value = null
    if (e instanceof ApiError && [409, 422].includes(e.status)) await load()
  } finally {
    busy.value = ''
  }
}
onMounted(load)
</script>
<template>
  <PageHeading title="我的借阅" description="查看借阅期限、逾期提醒和续借资格" /><el-alert
    v-if="overdue.length"
    type="error"
    :closable="false"
    show-icon
    class="form-alert"
    title="存在逾期借阅：当前无法新借、预约或续借。请到馆归还逾期图书。"
    :description="overdue.map((i) => `${i.bookTitle} 逾期 ${i.overdueDays} 天`).join('；')"
  />
  <section class="panel">
    <div class="list-toolbar">
      <el-radio-group
        v-model="filter"
        @change="
          () => {
            page = 1
            load()
          }
        "
        ><el-radio-button value="ACTIVE">在借</el-radio-button
        ><el-radio-button value="RETURNED">已归还</el-radio-button
        ><el-radio-button value="ALL">全部</el-radio-button></el-radio-group
      ><el-button @click="load">刷新</el-button>
    </div>
    <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"
      ><div class="table-scroll">
        <el-table :data="items" class="data-table" stripe
          ><el-table-column prop="bookTitle" label="书名" min-width="180" /><el-table-column
            prop="copyBarcode"
            label="副本条码"
            width="145"
          /><el-table-column label="借出时间" width="175"
            ><template #default="s">{{ dateTime(s.row.borrowedAt) }}</template></el-table-column
          ><el-table-column label="到期日" width="175"
            ><template #default="s">{{ dueDate(s.row.dueDate) }}</template></el-table-column
          ><el-table-column label="状态" width="130"
            ><template #default="s"
              ><el-tag :type="statusTone(s.row.status)">{{
                statusLabel[s.row.status as keyof typeof statusLabel]
              }}</el-tag
              ><span v-if="s.row.overdueDays > 0" class="text-danger">
                逾期 {{ s.row.overdueDays }} 天</span
              ></template
            ></el-table-column
          ><el-table-column label="操作" width="170"
            ><template #default="s"
              ><el-button
                v-if="s.row.allowedActions?.canRenew"
                link
                type="primary"
                :loading="busy === s.row.id"
                @click="renew(s.row)"
                >续借</el-button
              ><span v-else class="muted" :title="reasonLabel(s.row.allowedActions?.reasonCode)">{{
                s.row.status === 'ACTIVE'
                  ? reasonLabel(s.row.allowedActions?.reasonCode) || '不可续借'
                  : '—'
              }}</span></template
            ></el-table-column
          ></el-table
        >
      </div>
      <div class="pager">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="total"
          :page-size="10"
          :current-page="page"
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
