<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api'
import { errorText } from '@/api/http'
import type { Notice } from '@/api/types'
import { dateTime } from '@/utils/format'
import LoadState from '@/components/LoadState.vue'
const route = useRoute(),
  item = ref<Notice | null>(null),
  loading = ref(true),
  error = ref('')
async function load() {
  loading.value = true
  error.value = ''
  try {
    item.value = await api.notice(String(route.params.id))
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(() => route.params.id, load)
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">NOTICE</div>
      <h1>公告详情</h1>
    </div>
    <RouterLink to="/notices">← 返回公告</RouterLink>
  </div>
  <section class="panel">
    <LoadState :loading="loading" :error="error" :empty="!item" @retry="load"
      ><article v-if="item">
        <h2>{{ item.title }}</h2>
        <p class="muted">发布于 {{ dateTime(item.publishedAt) }}</p>
        <el-divider />
        <div class="pre-wrap">{{ item.content }}</div>
      </article></LoadState
    >
  </section>
</template>
