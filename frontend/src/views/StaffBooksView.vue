<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import { ApiError, errorText } from '@/api/http'
import type { BookSummary, Category } from '@/api/types'
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
      size: 10,
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
onMounted(async () => {
  load()
  try {
    categories.value = await api.categories()
  } catch {}
})
</script>
<template>
  <PageHeading title="书目管理" description="维护馆藏书目信息与上架状态"
    ><RouterLink to="/staff/books/new"
      ><el-button type="primary">＋ 新增书目</el-button></RouterLink
    ></PageHeading
  >
  <section class="panel">
    <form
      class="list-toolbar"
      @submit.prevent="
        () => {
          page = 1
          load()
        }
      "
    >
      <el-input v-model="filter.keyword" placeholder="书名、作者或 ISBN" clearable /><el-select
        v-model="filter.categoryId"
        placeholder="全部分类"
        clearable
        ><el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" /></el-select
      ><el-select v-model="filter.enabled" placeholder="上架状态"
        ><el-option label="全部状态" value="" /><el-option label="已上架" value="true" /><el-option
          label="已下架"
          value="false" /></el-select
      ><el-button type="primary" native-type="submit">筛选</el-button>
    </form>
    <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"
      ><div class="table-scroll">
        <el-table :data="items" stripe class="data-table"
          ><el-table-column prop="title" label="书名" min-width="180" /><el-table-column
            prop="author"
            label="作者"
            min-width="120"
          /><el-table-column prop="categoryName" label="分类" width="110" /><el-table-column
            label="册数"
            width="125"
            ><template #default="s"
              >{{ s.row.availableCopies }} / {{ s.row.totalCopies }}</template
            ></el-table-column
          ><el-table-column label="状态" width="105"
            ><template #default="s"
              ><el-tag :type="s.row.enabled ? 'success' : 'info'">{{
                s.row.enabled ? '已上架' : '已下架'
              }}</el-tag></template
            ></el-table-column
          ><el-table-column label="操作" width="250"
            ><template #default="s"
              ><RouterLink :to="`/staff/books/${s.row.id}/edit`"
                ><el-button link type="primary">编辑</el-button></RouterLink
              ><RouterLink :to="`/staff/books/${s.row.id}/copies`"
                ><el-button link type="primary">副本</el-button></RouterLink
              ><el-button
                link
                :type="s.row.enabled ? 'danger' : 'success'"
                :loading="busy === s.row.id"
                @click="toggle(s.row)"
                >{{ s.row.enabled ? '停用' : '上架' }}</el-button
              ></template
            ></el-table-column
          ></el-table
        >
      </div>
      <div class="pager">
        <el-pagination
          background
          layout="prev, pager, next"
          :current-page="page"
          :page-size="10"
          :total="total"
          @current-change="
            (n: number) => {
              page = n
              load()
            }
          "
        /></div
    ></LoadState>
  </section>
</template>
