<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/api'
import { errorText } from '@/api/http'
import type { Overview, TopBook, TrendPoint } from '@/api/types'
import { dateTime } from '@/utils/format'
import LoadState from '@/components/LoadState.vue'
import PageHeading from '@/components/PageHeading.vue'
import TrendChart from '@/components/TrendChart.vue'
import TopBooksChart from '@/components/TopBooksChart.vue'
const overview = ref<Overview | null>(null),
  trend = ref<TrendPoint[]>([]),
  top = ref<TopBook[]>([]),
  loading = ref(true),
  error = ref('')
async function load() {
  loading.value = true
  error.value = ''
  try {
    ;[overview.value, trend.value, top.value] = await Promise.all([
      api.overview(),
      api.trend(),
      api.topBooks(),
    ])
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>
<template>
  <PageHeading title="数据统计" description="实时聚合馆藏、借阅与预约信息"
    ><el-button @click="load">刷新数据</el-button></PageHeading
  ><LoadState :loading="loading" :error="error" :empty="!overview" @retry="load"
    ><template v-if="overview"
      ><div class="stat-grid">
        <div
          v-for="m in [
            { label: '书目数', value: overview.bookCount },
            { label: '总册数', value: overview.totalCopies },
            { label: '可借册数', value: overview.availableCopies },
            { label: '在借数', value: overview.activeLoans },
            { label: '逾期数', value: overview.overdueLoans },
            { label: '待取数', value: overview.readyReservations },
            { label: '读者数', value: overview.readerCount },
          ]"
          :key="m.label"
          class="panel stat-tile"
        >
          <span>{{ m.label }}</span
          ><strong>{{ m.value ?? '—' }}</strong>
        </div>
      </div>
      <p class="muted">数据生成时间：{{ dateTime(overview.generatedAt) }}（Asia/Shanghai）</p>
      <div class="stats-charts">
        <section class="panel">
          <div class="section-head"><h2>近 30 天借出与归还趋势</h2></div>
          <TrendChart v-if="trend.length" :data="trend" /><el-empty
            v-else
            description="暂无趋势数据"
          />
          <p class="muted">{{ trend.length }} 个日期记录 · 单位：次</p>
        </section>
        <section class="panel">
          <div class="section-head"><h2>近 30 天热门书目</h2></div>
          <TopBooksChart v-if="top.length" :data="top" /><el-empty
            v-else
            description="暂无热门书目"
          />
          <ol>
            <li v-for="b in top" :key="b.bookId">{{ b.title }} · {{ b.borrowCount }} 次</li>
          </ol>
        </section>
      </div></template
    ></LoadState
  >
</template>
<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 13px;
}
.stat-tile {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #71819a;
}
.stat-tile strong {
  font-size: 27px;
  color: #142b57;
}
.stats-charts {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 13px;
}
.stats-charts ol {
  font-size: 13px;
  color: #546882;
}
@media (max-width: 900px) {
  .stats-charts {
    grid-template-columns: 1fr;
  }
}
</style>
