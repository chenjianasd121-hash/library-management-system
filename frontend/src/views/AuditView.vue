<script setup lang="ts">
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
onMounted(load)
</script>
<template>
  <PageHeading title="审计日志" description="只读查看关键业务操作记录" />
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
      <el-input v-model="filter.actorId" placeholder="操作者 ID" clearable /><el-input
        v-model="filter.action"
        placeholder="动作编码"
        clearable
      /><el-date-picker
        v-model="filter.from"
        type="datetime"
        value-format="YYYY-MM-DDTHH:mm:ss+08:00"
        placeholder="开始时间"
      /><el-date-picker
        v-model="filter.to"
        type="datetime"
        value-format="YYYY-MM-DDTHH:mm:ss+08:00"
        placeholder="结束时间"
      /><el-button type="primary" native-type="submit">筛选</el-button>
    </form>
    <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"
      ><div class="table-scroll">
        <el-table :data="items" stripe class="data-table"
          ><el-table-column label="时间" width="180"
            ><template #default="s">{{ dateTime(s.row.occurredAt) }}</template></el-table-column
          ><el-table-column prop="actorName" label="操作者" min-width="115" /><el-table-column
            prop="action"
            label="动作"
            min-width="150" /><el-table-column
            prop="entityType"
            label="对象类型"
            min-width="120" /><el-table-column
            prop="entityId"
            label="对象 ID"
            min-width="130" /><el-table-column prop="traceId" label="追踪号" min-width="180"
        /></el-table>
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
