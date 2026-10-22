<script setup lang="ts">
import type { BookSummary } from '@/api/types'
import { Reading, ArrowRight } from '@element-plus/icons-vue'
defineProps<{ book: BookSummary }>()
</script>
<template>
  <RouterLink :to="`/books/${book.id}`" class="book-card"
    ><div class="book-cover">
      <img v-if="book.coverPath" :src="book.coverPath" :alt="`${book.title}封面`" />
      <div v-else class="cover-placeholder">
        <el-icon><Reading /></el-icon><span>暂无封面</span>
      </div>
    </div>
    <div class="book-info">
      <h3>{{ book.title }}</h3>
      <p class="book-author">{{ book.author }}</p>
      <el-tag class="category-tag" type="info">{{ book.categoryName }}</el-tag>
      <p class="book-isbn">ISBN {{ book.isbn || '暂无' }}</p>
      <div class="book-count">
        <span
          >可借 <strong>{{ book.availableCopies }}</strong> / 总册 {{ book.totalCopies }}</span
        >
      </div>
      <el-tag class="availability-tag" :type="book.availableCopies ? 'success' : 'warning'">{{
        book.availableCopies ? '可预约待取' : '预约排队'
      }}</el-tag>
      <span class="book-detail-link"
        >查看详情 <el-icon><ArrowRight /></el-icon
      ></span></div
  ></RouterLink>
</template>
