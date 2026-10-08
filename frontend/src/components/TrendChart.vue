<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { echarts } from './charting'
import type { TrendPoint } from '@/api/types'
const props = defineProps<{ data: TrendPoint[] }>()
const root = ref<HTMLElement | null>(null)
let chart: ReturnType<typeof echarts.init> | null = null
let observer: ResizeObserver | null = null
function render() {
  if (!root.value) return
  if (!chart) chart = echarts.init(root.value)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['借出', '归还'], right: 0, top: 0 },
    grid: { left: 46, right: 16, top: 40, bottom: 34 },
    xAxis: { type: 'category', boundaryGap: false, data: props.data.map((p) => p.date.slice(5)) },
    yAxis: { type: 'value', min: 0, name: '次', splitLine: { lineStyle: { color: '#edf2fa' } } },
    series: [
      {
        name: '借出',
        type: 'line',
        smooth: true,
        data: props.data.map((p) => p.borrowedCount),
        lineStyle: { color: '#0aa6ee', width: 3 },
        itemStyle: { color: '#0aa6ee' },
        areaStyle: { color: '#4fb9fa33' },
      },
      {
        name: '归还',
        type: 'line',
        smooth: true,
        data: props.data.map((p) => p.returnedCount),
        lineStyle: { color: '#8c68fa', width: 3 },
        itemStyle: { color: '#8c68fa' },
        areaStyle: { color: '#9f80fa33' },
      },
    ],
  })
}
onMounted(() => {
  render()
  if (root.value) {
    observer = new ResizeObserver(() => chart?.resize())
    observer.observe(root.value)
  }
})
watch(() => props.data, render, { deep: true })
onUnmounted(() => {
  observer?.disconnect()
  chart?.dispose()
})
</script>
<template>
  <div ref="root" class="chart-box" role="img" aria-label="近30天借出与归还趋势图" />
</template>
