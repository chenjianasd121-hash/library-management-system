<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { echarts } from './charting'
import type { TopBook } from '@/api/types'

const props = defineProps<{ data: TopBook[]; offset: number }>()
const root = ref<HTMLElement>()
let chart: ReturnType<typeof echarts.init> | undefined
let observer: ResizeObserver | undefined

function render() {
  if (!root.value) return
  chart ??= echarts.init(root.value)
  chart.setOption({
    grid: { left: 180, right: 38, top: 4, bottom: 4 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true },
    xAxis: { type: 'value', show: false, minInterval: 1 },
    yAxis: {
      type: 'category',
      inverse: true,
      axisTick: { show: false },
      axisLine: { show: false },
      data: props.data.map((book, index) => `${index + props.offset + 1}　${book.title}`),
      axisLabel: {
        color: '#617b9e',
        fontSize: 15,
        width: 164,
        overflow: 'truncate',
        align: 'left',
        margin: 175,
      },
    },
    series: [
      {
        name: '借出次数',
        type: 'bar',
        barWidth: 12,
        showBackground: true,
        backgroundStyle: { color: '#eff5fc', borderRadius: 2 },
        itemStyle: { color: '#277eeb', borderRadius: 2 },
        label: { show: true, position: 'right', color: '#4c6a91', fontSize: 15, distance: 12 },
        data: props.data.map((book) => book.borrowCount),
      },
    ],
  })
}
onMounted(() => {
  render()
  observer = new ResizeObserver(() => chart?.resize())
  if (root.value) observer.observe(root.value)
})
watch(() => props.data, render, { deep: true })
onUnmounted(() => {
  observer?.disconnect()
  chart?.dispose()
})
</script>

<template>
  <div
    ref="root"
    class="ranked-books-chart"
    role="img"
    :aria-label="
      data
        .map((book, i) => `${i + offset + 1}：${book.title}，借出 ${book.borrowCount} 次`)
        .join('；')
    "
  />
</template>
