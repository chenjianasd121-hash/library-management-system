<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/api'
import { errorText } from '@/api/http'
import type { LoanItem, Notice, Overview, TopBook, TrendPoint } from '@/api/types'
import { dateTime, dueDate, statusLabel, statusTone } from '@/utils/format'
import LoadState from '@/components/LoadState.vue'
import TrendChart from '@/components/TrendChart.vue'
import TopBooksChart from '@/components/TopBooksChart.vue'
import { portal } from '@/portal'
import PageHeading from '@/components/PageHeading.vue'
import {
  Reading,
  Refresh,
  UserFilled,
  WarningFilled,
  TrendCharts,
  PieChart,
  Clock,
  Bell,
  Right,
  Back,
  Plus,
  Medal,
  CircleCheck,
  Grid,
} from '@element-plus/icons-vue'
const overview = ref<Overview | null>(null),
  trend = ref<TrendPoint[]>([]),
  top = ref<TopBook[]>([]),
  loans = ref<LoanItem[]>([]),
  notices = ref<Notice[]>([]),
  loading = ref(true),
  error = ref('')
async function load() {
  loading.value = true
  error.value = ''
  try {
    const [o, t, b, l, n] = await Promise.all([
      api.overview(),
      api.trend(),
      api.topBooks(),
      api.loans({ page: 1, size: 5 }),
      api.notices({ page: 1, size: 5, status: 'PUBLISHED' }),
    ])
    overview.value = o
    trend.value = t
    top.value = b
    loans.value = l.items
    notices.value = n.items
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>
<template>
  <PageHeading
    v-if="portal === 'librarian'"
    title="馆员工作台"
    description="管理馆藏与借还业务，掌握今日工作动态。"
  >
    <RouterLink to="/staff/checkout"
      ><el-button type="primary" :icon="Right">办理借出</el-button></RouterLink
    >
    <RouterLink to="/staff/return"><el-button :icon="Back">办理归还</el-button></RouterLink>
    <RouterLink to="/staff/books/new"
      ><el-button link type="primary" :icon="Plus">新增书目</el-button></RouterLink
    >
  </PageHeading>
  <section v-else class="hero">
    <div class="eyebrow">GRADUATION PROJECT</div>
    <h1>基于SpringBoot+Vue的图书管理系统</h1>
    <p>首页概览 · 馆藏与借阅运行情况</p>
    <div class="hero-notes">
      <span
        ><el-icon><Medal /></el-icon> 简洁高效</span
      ><span
        ><el-icon><CircleCheck /></el-icon> 功能完善</span
      ><span
        ><el-icon><Grid /></el-icon> 支持扩展</span
      >
    </div>
    <div class="hero-script">让阅读<br />遇见更好的自己</div>
    <div class="hero-actions">
      <RouterLink to="/staff/books/new"
        ><el-button type="primary" :icon="Plus">新增书目</el-button></RouterLink
      >
      <RouterLink to="/staff/checkout"><el-button :icon="Right">办理借出</el-button></RouterLink>
      <RouterLink to="/staff/return"><el-button :icon="Back">办理归还</el-button></RouterLink>
    </div>
  </section>
  <LoadState :loading="loading" :error="error" :empty="!overview" @retry="load"
    ><template v-if="overview">
      <div class="metric-grid">
        <div class="metric surface">
          <div class="metric-icon">
            <el-icon><Reading /></el-icon>
          </div>
          <div>
            <div class="metric-label">馆藏总量</div>
            <div class="metric-value">{{ overview.totalCopies ?? '—' }}</div>
            <div class="metric-sub">非退役副本</div>
          </div>
        </div>
        <div class="metric surface">
          <div class="metric-icon">
            <el-icon><Refresh /></el-icon>
          </div>
          <div>
            <div class="metric-label">当前在借</div>
            <div class="metric-value">{{ overview.activeLoans ?? '—' }}</div>
            <div class="metric-sub">实时借阅数量</div>
          </div>
        </div>
        <div class="metric surface">
          <div class="metric-icon">
            <el-icon><UserFilled /></el-icon>
          </div>
          <div>
            <div class="metric-label">注册读者</div>
            <div class="metric-value">{{ overview.readerCount ?? '—' }}</div>
            <div class="metric-sub">读者账号</div>
          </div>
        </div>
        <div class="metric surface">
          <div class="metric-icon">
            <el-icon><WarningFilled /></el-icon>
          </div>
          <div>
            <div class="metric-label">当前逾期</div>
            <div class="metric-value text-danger">{{ overview.overdueLoans ?? '—' }}</div>
            <div class="metric-sub">需要到馆归还</div>
          </div>
        </div>
      </div>
      <div class="dashboard-grid">
        <section class="panel dashboard-chart">
          <div class="section-head">
            <h2>
              <el-icon><TrendCharts /></el-icon> 借阅趋势统计
            </h2>
            <RouterLink to="/staff/stats">查看更多 →</RouterLink>
          </div>
          <p class="chart-caption">
            近 30 天 · 单位：次 · 更新于 {{ dateTime(overview.generatedAt) }}
          </p>
          <TrendChart v-if="trend.length" :data="trend" /><el-empty
            v-else
            description="近 30 天暂无借还数据"
          />
        </section>
        <section class="panel">
          <div class="section-head">
            <h2>
              <el-icon><PieChart /></el-icon> 热门书目
            </h2>
            <RouterLink to="/staff/stats">查看更多 →</RouterLink>
          </div>
          <p class="chart-caption">近 30 天 · 按借出次数</p>
          <div v-if="top.length" class="popular-body">
            <TopBooksChart :data="top" />
            <div class="top-summary">
              <div v-for="(b, i) in top.slice(0, 5)" :key="b.bookId">
                <span
                  class="rank-dot"
                  :style="{
                    background: ['#4f8df8', '#6ab4f7', '#5bcfa8', '#ffb455', '#ef7481'][i],
                  }"
                />{{ b.title }} <strong>{{ b.borrowCount }} 次</strong>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无借出记录" />
        </section>
        <section class="panel wide dashboard-loans">
          <div class="section-head">
            <h2>
              <el-icon><Clock /></el-icon> 最新借阅记录
            </h2>
            <RouterLink to="/staff/loans">查看更多 →</RouterLink>
          </div>
          <div class="table-scroll">
            <el-table :data="loans" stripe class="data-table" empty-text="暂无借阅记录"
              ><el-table-column type="index" label="序号" width="64" /><el-table-column
                prop="bookTitle"
                label="书名"
                min-width="150"
              /><el-table-column prop="readerName" label="借阅者" min-width="110" /><el-table-column
                label="借阅时间"
                width="170"
                ><template #default="s">{{ dateTime(s.row.borrowedAt) }}</template></el-table-column
              ><el-table-column label="应还时间" width="170"
                ><template #default="s">{{ dueDate(s.row.dueDate) }}</template></el-table-column
              ><el-table-column label="状态" width="110"
                ><template #default="s"
                  ><el-tag :type="statusTone(s.row.status)">{{
                    statusLabel[s.row.status as keyof typeof statusLabel]
                  }}</el-tag></template
                ></el-table-column
              ><el-table-column label="操作" width="90"
                ><template #default
                  ><RouterLink to="/staff/loans" class="text-link">详情</RouterLink></template
                ></el-table-column
              ></el-table
            >
          </div>
        </section>
        <section class="panel notice-panel">
          <div class="section-head">
            <h2>
              <el-icon><Bell /></el-icon> 系统公告
            </h2>
            <RouterLink to="/staff/notices">查看更多 →</RouterLink>
          </div>
          <template v-if="notices.length"
            ><div v-for="n in notices" :key="n.id" class="notice-row">
              <span class="notice-dot" /><RouterLink :to="`/notices/${n.id}`">{{
                n.title
              }}</RouterLink
              ><time>{{ dateTime(n.publishedAt) }}</time>
            </div></template
          ><el-empty v-else description="暂无公告" />
        </section>
      </div> </template
  ></LoadState>
</template>
