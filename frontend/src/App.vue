<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
const route = useRoute()
const standalone = computed(() => route.path === '/login' || route.path === '/register')
</script>
<template>
  <RouterView v-if="standalone" />
  <AppShell v-else><RouterView /></AppShell>
</template>
