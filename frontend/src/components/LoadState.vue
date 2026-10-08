<script setup lang="ts">
defineProps<{ loading?: boolean; error?: string; empty?: boolean; emptyText?: string }>()
defineEmits<{ retry: [] }>()
</script>
<template>
  <div v-if="loading" class="load-state" role="status"><el-skeleton :rows="4" animated /></div>
  <div v-else-if="error" class="load-state">
    <el-result icon="error" title="加载失败" :sub-title="error"
      ><template #extra
        ><el-button type="primary" @click="$emit('retry')">重新加载</el-button></template
      ></el-result
    >
  </div>
  <el-empty v-else-if="empty" :description="emptyText || '暂无数据'" />
  <slot v-else />
</template>
