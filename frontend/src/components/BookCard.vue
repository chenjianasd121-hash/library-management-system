<script setup lang="ts">
import type { BookSummary } from '@/api/types'
defineProps<{ book: BookSummary }>()
</script>
<template>
  <RouterLink :to="`/books/${book.id}`" class="book-card surface"
    ><div class="book-cover">
      <img v-if="book.coverPath" :src="book.coverPath" :alt="`${book.title}封面`" /><span
        v-else
        aria-label="暂无封面"
        >📖</span
      >
    </div>
    <div class="book-info">
      <el-tag size="small" :type="book.availableCopies ? 'success' : 'warning'">{{
        book.availableCopies ? '可预约待取' : '预约排队'
      }}</el-tag>
      <h3>{{ book.title }}</h3>
      <p>{{ book.author }}</p>
      <p>{{ book.categoryName }} · ISBN {{ book.isbn || '暂无' }}</p>
      <div class="book-count">
        可借 {{ book.availableCopies }} / 总册 {{ book.totalCopies }} <span>查看详情 →</span>
      </div>
    </div></RouterLink
  >
</template>
