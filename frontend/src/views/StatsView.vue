<script setup lang="ts">
import {
  Refresh,
  Reading,
  Collection,
  CircleCheck,
  Tickets,
  Warning,
  Clock,
  User,
} from '@element-plus/icons-vue'
import RankedBooksChart from '@/components/RankedBooksChart.vue'
import { onMounted, ref } from 'vue'
import { api } from '@/api'
import { errorText } from '@/api/http'
import type { Overview, TopBook, TrendPoint } from '@/api/types'
import { dateTime } from '@/utils/format'
import LoadState from '@/components/LoadState.vue'
import PageHeading from '@/components/PageHeading.vue'
import TrendChart from '@/components/TrendChart.vue'
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
  <div class="staff-breadcrumb">首页概览 / <span>数据统计</span></div>
  <PageHeading title="数据统计" description="馆藏与借阅数据一目了然，助力高效管理。"
    ><el-button :icon="Refresh" @click="load">刷新数据</el-button></PageHeading
  >
  <LoadState :loading="loading" :error="error" :empty="!overview" @retry="load"
    ><template v-if="overview">
      <section class="panel statistics-metrics">
        <div
          v-for="metric in [
            {
              label: '书目总数',
              value: overview.bookCount,
              icon: Reading,
              tone: 'blue',
              hint: '馆藏书目种类',
            },
            {
              label: '馆藏总册',
              value: overview.totalCopies,
              icon: Collection,
              tone: 'purple',
              hint: '实体图书副本',
            },
            {
              label: '可借册数',
              value: overview.availableCopies,
              icon: CircleCheck,
              tone: 'green',
              hint: '当前可借阅副本',
            },
            {
              label: '当前在借',
              value: overview.activeLoans,
              icon: Tickets,
              tone: 'blue',
              hint: '尚未归还的借阅',
            },
            {
              label: '逾期借阅',
              value: overview.overdueLoans,
              icon: Warning,
              tone: 'orange',
              hint: '需及时跟进归还',
            },
            {
              label: '待取预约',
              value: overview.readyReservations,
              icon: Clock,
              tone: 'cyan',
              hint: '等待到馆取书',
            },
            {
              label: '注册读者',
              value: overview.readerCount,
              icon: User,
              tone: 'blue',
              hint: '读者账号总数',
            },
          ]"
          :key="metric.label"
          class="statistics-metric"
        >
          <el-icon :class="'metric-' + metric.tone"><component :is="metric.icon" /></el-icon>
          <div>
            <span>{{ metric.label }}</span
            ><strong>{{ metric.value ?? '—' }}</strong>
          </div>
          <small>{{ metric.hint }}</small>
        </div>
      </section>
      <p class="statistics-generated">
        <el-icon><Clock /></el-icon>数据生成时间：{{ dateTime(overview.generatedAt) }}（上海时间）
      </p>
      <section class="panel statistics-trend">
        <h2>近 30 天借出与归还趋势</h2>
        <p>
          {{
            trend.length ? trend[0]?.date + ' 至 ' + trend[trend.length - 1]?.date : '暂无日期记录'
          }}
          · 单位：次
        </p>
        <TrendChart v-if="trend.length" :data="trend" /><el-empty
          v-else
          description="暂无趋势数据"
        /><small>数据按日汇总，统计近 30 天的借出与归还次数。</small>
      </section>
      <section class="panel statistics-ranking">
        <h2>近 30 天热门书目</h2>
        <p>按借出次数排序 · 单位：次</p>
        <div v-if="top.length" class="rank-chart-grid">
          <RankedBooksChart :data="top.slice(0, 5)" :offset="0" /><RankedBooksChart
            v-if="top.length > 5"
            :data="top.slice(5, 10)"
            :offset="5"
          />
        </div>
        <el-empty v-else description="暂无热门书目" />
      </section> </template
  ></LoadState>
</template>
