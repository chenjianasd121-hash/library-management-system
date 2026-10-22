<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api } from '@/api'
import { errorText } from '@/api/http'
import type { LoanItem } from '@/api/types'
import { dateTime, statusLabel, statusTone } from '@/utils/format'
import LoadState from '@/components/LoadState.vue'
import PageHeading from '@/components/PageHeading.vue'
const filter = reactive({ readerKeyword: '', barcode: '', mode: 'ALL' }),
  items = ref<LoanItem[]>([]),
  page = ref(1),
  total = ref(0),
  loading = ref(true),
  error = ref('')
async function load() {
  loading.value = true
  error.value = ''
  try {
    const d = await api.loans({
      readerKeyword: filter.readerKeyword,
      barcode: filter.barcode,
      status: filter.mode === 'ACTIVE' || filter.mode === 'RETURNED' ? filter.mode : undefined,
      overdue: filter.mode === 'OVERDUE' ? true : undefined,
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
function applyFilter() {
  page.value = 1
  void load()
}
onMounted(load)
</script>
<template>
  <PageHeading title="借阅管理" description="查看借阅记录，及时跟进逾期图书。"
    ><RouterLink to="/staff/return"
      ><el-button type="primary">办理归还</el-button></RouterLink
    ></PageHeading
  >
  <section class="panel staff-record-panel">
    <el-tabs v-model="filter.mode" class="record-tabs" @tab-change="applyFilter"
      ><el-tab-pane label="全部记录" name="ALL" /><el-tab-pane
        label="在借"
        name="ACTIVE" /><el-tab-pane label="已归还" name="RETURNED" /><el-tab-pane
        label="逾期"
        name="OVERDUE"
    /></el-tabs>
    <form class="record-query" @submit.prevent="applyFilter">
      <label
        >读者<el-input
          v-model="filter.readerKeyword"
          placeholder="输入读者用户名或姓名"
          clearable /></label
      ><label
        >副本条码<el-input
          v-model="filter.barcode"
          placeholder="输入完整副本条码"
          clearable /></label
      ><el-button type="primary" native-type="submit">查询</el-button>
    </form>
    <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"
      ><div class="table-scroll">
        <el-table :data="items" class="management-table">
          <el-table-column label="图书 / 副本条码" min-width="235"
            ><template #default="s"
              ><strong>{{ s.row.bookTitle }}</strong
              ><small>{{ s.row.copyBarcode }}</small></template
            ></el-table-column
          >
          <el-table-column label="读者" min-width="130"
            ><template #default="s">{{ s.row.readerName || '—' }}</template></el-table-column
          >
          <el-table-column label="借出时间" min-width="170"
            ><template #default="s"
              ><span class="wrapped-time">{{ dateTime(s.row.borrowedAt) }}</span></template
            ></el-table-column
          >
          <el-table-column label="应还日期" min-width="150"
            ><template #default="s"
              >{{ s.row.dueDate }}<small>当日结束前归还</small></template
            ></el-table-column
          >
          <el-table-column label="状态" min-width="150"
            ><template #default="s"
              ><el-tag :type="s.row.overdueDays > 0 ? 'danger' : statusTone(s.row.status)">{{
                s.row.overdueDays > 0
                  ? `逾期 ${s.row.overdueDays} 天`
                  : statusLabel[s.row.status as keyof typeof statusLabel]
              }}</el-tag
              ><small v-if="s.row.returnedAt">{{ dateTime(s.row.returnedAt) }}</small></template
            ></el-table-column
          >
          <el-table-column label="操作" width="105"
            ><template #default="s"
              ><RouterLink v-if="s.row.status === 'ACTIVE'" to="/staff/return"
                ><el-button link type="primary">办理归还</el-button></RouterLink
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
</template>
