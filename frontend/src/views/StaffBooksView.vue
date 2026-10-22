<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import { ApiError, errorText } from '@/api/http'
import type { BookSummary, Category } from '@/api/types'
import { Search, Plus, Reading, Edit, Collection, SwitchButton } from '@element-plus/icons-vue'
import LoadState from '@/components/LoadState.vue'
import PageHeading from '@/components/PageHeading.vue'
const filter = reactive({ keyword: '', categoryId: '', enabled: '' }),
  categories = ref<Category[]>([]),
  items = ref<BookSummary[]>([]),
  page = ref(1),
  total = ref(0),
  loading = ref(true),
  error = ref(''),
  busy = ref('')
async function load() {
  loading.value = true
  error.value = ''
  try {
    const d = await api.books({
      keyword: filter.keyword,
      categoryId: filter.categoryId,
      enabled: filter.enabled === '' ? undefined : filter.enabled === 'true',
      page: page.value,
      size: 6,
    })
    items.value = d.items
    total.value = d.total
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}
async function toggle(b: BookSummary) {
  try {
    await ElMessageBox.confirm(
      b.enabled
        ? `停用《${b.title}》会阻止新的预约和借出；有有效预约时后端会处理取消与副本释放。确认停用？`
        : `确认重新上架《${b.title}》？`,
      '确认书目状态',
      { type: 'warning' },
    )
  } catch {
    return
  }
  busy.value = b.id
  try {
    const detail = await api.book(b.id)
    await api.saveBook(
      {
        isbn: detail.isbn,
        title: detail.title,
        author: detail.author,
        publisher: detail.publisher,
        publishedOn: detail.publishedOn,
        description: detail.description,
        categoryId: detail.categoryId,
        keywords: detail.keywords,
        coverPath: detail.coverPath,
        enabled: !detail.enabled,
      },
      b.id,
    )
    ElMessage.success('状态已更新')
    await load()
  } catch (e) {
    ElMessage.error(errorText(e))
    if (e instanceof ApiError && [409, 422].includes(e.status)) await load()
  } finally {
    busy.value = ''
  }
}
function search() {
  page.value = 1
  load()
}
function reset() {
  Object.assign(filter, { keyword: '', categoryId: '', enabled: '' })
  search()
}
function category(id: string) {
  filter.categoryId = id
  search()
}
onMounted(async () => {
  load()
  try {
    categories.value = await api.categories()
  } catch {}
})
</script>
<template>
  <PageHeading title="书目管理" description="维护馆藏书目信息与上架状态">
    <RouterLink to="/staff/books/new"
      ><el-button type="primary" :icon="Plus">新增书目</el-button></RouterLink
    >
  </PageHeading>
  <form class="panel staff-book-filter" @submit.prevent="search">
    <el-input
      v-model="filter.keyword"
      :prefix-icon="Search"
      placeholder="搜索书名、作者或 ISBN"
      clearable
    />
    <el-select v-model="filter.enabled" placeholder="全部状态"
      ><el-option label="全部状态" value="" /><el-option label="已上架" value="true" /><el-option
        label="已下架"
        value="false"
    /></el-select>
    <el-button type="primary" native-type="submit">查询</el-button
    ><el-button @click="reset">重置</el-button><span>共 {{ total }} 条</span>
  </form>
  <div class="staff-catalogue">
    <aside class="panel category-rail">
      <h2>图书分类</h2>
      <button :class="{ selected: !filter.categoryId }" @click="category('')">全部分类</button
      ><button
        v-for="c in categories"
        :key="c.id"
        :class="{ selected: filter.categoryId === c.id }"
        @click="category(c.id)"
      >
        {{ c.name }}
      </button>
    </aside>
    <div class="staff-catalogue-content">
      <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load">
        <div class="staff-book-grid">
          <article v-for="b in items" :key="b.id" class="panel staff-book-card">
            <div class="staff-cover">
              <img v-if="b.coverPath" :src="b.coverPath" :alt="b.title" /><el-icon v-else
                ><Reading
              /></el-icon>
            </div>
            <div class="staff-book-info">
              <h2 :title="b.title">{{ b.title }}</h2>
              <p>{{ b.author }}</p>
              <el-tag type="info">{{ b.categoryName }}</el-tag>
              <p class="staff-book-count">
                在册 {{ b.totalCopies }} 册 <strong>可借 {{ b.availableCopies }} 册</strong>
              </p>
              <small>ISBN {{ b.isbn || '未填写' }}</small>
              <div class="staff-card-actions">
                <RouterLink :to="`/staff/books/${b.id}/edit`"
                  ><el-button link type="primary" :icon="Edit">编辑</el-button></RouterLink
                ><RouterLink :to="`/staff/books/${b.id}/copies`"
                  ><el-button link type="primary" :icon="Collection">副本</el-button></RouterLink
                ><el-button
                  link
                  :type="b.enabled ? 'danger' : 'success'"
                  :icon="SwitchButton"
                  :loading="busy === b.id"
                  @click="toggle(b)"
                  >{{ b.enabled ? '停用' : '上架' }}</el-button
                >
              </div>
            </div>
            <el-tag class="staff-book-status" :type="b.enabled ? 'success' : 'info'">{{
              b.enabled ? '已上架' : '已下架'
            }}</el-tag>
          </article>
        </div>
      </LoadState>
      <div class="pager">
        <span>共 {{ total }} 条书目，每页 6 条</span
        ><el-pagination
          background
          layout="prev, pager, next"
          :current-page="page"
          :page-size="6"
          :total="total"
          @current-change="
            (n: number) => {
              page = n
              load()
            }
          "
        />
      </div>
    </div>
  </div>
</template>
