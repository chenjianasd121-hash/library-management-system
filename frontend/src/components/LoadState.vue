<script setup lang="ts">
defineProps<{ loading?: boolean; error?: string; empty?: boolean; emptyText?: string }>()
defineEmits<{ retry: [] }>()
</script>
<template>
  <div v-if="loading" class="load-state" role="status"><el-skeleton :rows="4" animated /></div>
  <div v-else-if="error" class="state-box state-error" role="alert">
    <img class="state-illustration" :src="'/design/state-error.png'" alt="" />
    <div>
      <h2>加载失败</h2>
      <p>{{ error }}</p>
      <el-button type="primary" @click="$emit('retry')">重新加载</el-button>
    </div>
  </div>
  <div v-else-if="empty" class="state-box" role="status">
    <img class="state-illustration" :src="'/design/state-empty.png'" alt="" />
    <h2>{{ emptyText || '暂无数据' }}</h2>
    <p>{{ emptyText?.includes('图书') ? '请尝试调整关键词或筛选条件' : '这里暂时没有记录' }}</p>
  </div>
  <slot v-else />
</template>
