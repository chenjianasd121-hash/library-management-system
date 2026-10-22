<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Bell } from '@element-plus/icons-vue'
import { api } from '@/api'
import { errorText } from '@/api/http'
import type { Notice } from '@/api/types'
import { dateTime } from '@/utils/format'
import PageHeading from '@/components/PageHeading.vue'
import LoadState from '@/components/LoadState.vue'
const items = ref<Notice[]>([]),
  page = ref(1),
  total = ref(0),
  loading = ref(true),
  error = ref('')
async function load() {
  loading.value = true
  error.value = ''
  try {
    const d = await api.notices({ status: 'PUBLISHED', page: page.value, size: 10 })
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
  <PageHeading title="系统公告" description="了解图书馆最新开放与服务信息" />
  <section class="panel notice-list-panel">
    <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"
      ><div v-for="item in items" :key="item.id" class="notice-list-item">
        <el-icon><Bell /></el-icon>
        <div>
          <RouterLink :to="`/notices/${item.id}`"
            ><h3>{{ item.title }}</h3></RouterLink
          >
          <p class="muted">{{ item.content.slice(0, 120) }}</p>
          <time class="muted">{{ dateTime(item.publishedAt) }}</time>
        </div>
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
