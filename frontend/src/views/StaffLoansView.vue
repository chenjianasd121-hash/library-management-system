<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api } from '@/api'
import { errorText } from '@/api/http'
import type { LoanItem } from '@/api/types'
import { dateTime, dueDate, statusLabel, statusTone } from '@/utils/format'
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
onMounted(load)
</script>
<template>
  <PageHeading title="借阅管理" description="检索借阅记录与逾期图书"
    ><RouterLink to="/staff/return"
      ><el-button type="primary">办理归还</el-button></RouterLink
    ></PageHeading
  >
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
      <el-input v-model="filter.readerKeyword" placeholder="读者关键词" clearable /><el-input
        v-model="filter.barcode"
        placeholder="副本条码"
        clearable
      /><el-select v-model="filter.mode"
        ><el-option label="全部" value="ALL" /><el-option label="在借" value="ACTIVE" /><el-option
          label="已归还"
          value="RETURNED" /><el-option label="逾期" value="OVERDUE" /></el-select
      ><el-button type="primary" native-type="submit">筛选</el-button>
    </form>
    <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"
      ><div class="table-scroll">
        <el-table :data="items" stripe class="data-table"
          ><el-table-column prop="bookTitle" label="书名" min-width="160" /><el-table-column
            prop="readerName"
            label="读者"
            width="110"
          /><el-table-column prop="copyBarcode" label="条码" width="130" /><el-table-column
            label="借出时间"
            width="170"
            ><template #default="s">{{ dateTime(s.row.borrowedAt) }}</template></el-table-column
          ><el-table-column label="到期日" width="175"
            ><template #default="s">{{ dueDate(s.row.dueDate) }}</template></el-table-column
          ><el-table-column label="状态" width="145"
            ><template #default="s"
              ><el-tag :type="statusTone(s.row.status)">{{
                statusLabel[s.row.status as keyof typeof statusLabel]
              }}</el-tag
              ><span v-if="s.row.overdueDays > 0" class="text-danger">
                逾期{{ s.row.overdueDays }}天</span
              ></template
            ></el-table-column
          ><el-table-column label="操作" width="95"
            ><template #default="s"
              ><RouterLink v-if="s.row.status === 'ACTIVE'" to="/staff/return"
                ><el-button link type="primary">去归还</el-button></RouterLink
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
