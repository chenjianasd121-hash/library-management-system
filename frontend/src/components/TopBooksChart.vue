<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { echarts } from './charting'
import type { TopBook } from '@/api/types'
const props = defineProps<{ data: TopBook[] }>()
const root = ref<HTMLElement | null>(null)
let chart: ReturnType<typeof echarts.init> | null = null
let observer: ResizeObserver | null = null
function render() {
  if (!root.value) return
  if (!chart) chart = echarts.init(root.value)
  chart.setOption({
    color: ['#4f8df8', '#6ab4f7', '#5bcfa8', '#ffb455', '#ef7481', '#a178ee', '#7688a8'],
    tooltip: { trigger: 'item', formatter: '{b}: {c} 次' },
    series: [
      {
        type: 'pie',
        radius: ['52%', '74%'],
        center: ['45%', '52%'],
        label: { show: false },
        data: props.data.map((p) => ({ name: p.title, value: p.borrowCount })),
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
  <div ref="root" class="chart-box" role="img" aria-label="近30天热门书目借出次数图" />
</template>
