<script setup lang="ts">
import { Filter, Search } from '@element-plus/icons-vue'
import { onMounted, reactive, ref } from 'vue'
import { api } from '@/api'
import { errorText } from '@/api/http'
import type { AuditLog } from '@/api/types'
import { dateTime } from '@/utils/format'
import LoadState from '@/components/LoadState.vue'
import PageHeading from '@/components/PageHeading.vue'
const filter = reactive({ actorId: '', action: '', from: '', to: '' }),
  items = ref<AuditLog[]>([]),
  page = ref(1),
  total = ref(0),
  loading = ref(true),
  error = ref('')
async function load() {
  loading.value = true
  error.value = ''
  try {
    const d = await api.audit({ ...filter, page: page.value, size: 10 })
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
  <PageHeading title="审计日志" description="查看关键业务操作记录，追踪系统变更。" />
  <div class="audit-layout">
    <form class="panel audit-filter" @submit.prevent="applyFilter">
      <h2>
        <el-icon><Filter /></el-icon>筛选条件
      </h2>
      <label
        >操作者 ID<el-input v-model="filter.actorId" placeholder="输入操作者 ID" clearable /></label
      ><label
        >操作动作<el-input v-model="filter.action" placeholder="输入动作编码" clearable /></label
      ><label
        >开始时间<el-date-picker
          v-model="filter.from"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss+08:00"
          placeholder="选择开始时间" /></label
      ><label
        >结束时间<el-date-picker
          v-model="filter.to"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss+08:00"
          placeholder="选择结束时间" /></label
      ><el-button type="primary" native-type="submit" :icon="Search">筛选日志</el-button>
    </form>
    <section class="panel audit-results">
      <div class="management-section-heading">
        <h2>操作记录</h2>
        <span>共 {{ total }} 条</span>
      </div>
      <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"
        ><div class="table-scroll">
          <el-table :data="items" class="management-table audit-table"
            ><el-table-column label="时间" width="130"
              ><template #default="s"
                ><span class="wrapped-time">{{ dateTime(s.row.occurredAt) }}</span></template
              ></el-table-column
            ><el-table-column
              prop="actorName"
              label="操作者"
              min-width="105"
              show-overflow-tooltip
            /><el-table-column
              prop="action"
              label="动作"
              min-width="170"
              show-overflow-tooltip
            /><el-table-column prop="entityType" label="对象类型" min-width="105" /><el-table-column
              prop="entityId"
              label="对象 ID"
              min-width="115"
              show-overflow-tooltip
            /><el-table-column label="追踪号" min-width="145"
              ><template #default="s"
                ><el-tooltip :content="s.row.traceId" placement="top"
                  ><span class="trace-id">{{
                    s.row.traceId
                      ? s.row.traceId.slice(0, 13) + (s.row.traceId.length > 13 ? '…' : '')
                      : '—'
                  }}</span></el-tooltip
                ></template
              ></el-table-column
            ></el-table
          >
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
  </div>
</template>
