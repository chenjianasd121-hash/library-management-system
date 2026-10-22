<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormRules } from 'element-plus'
import { api } from '@/api'
import { ApiError, errorText, fieldErrors } from '@/api/http'
import type { BookInput, Category } from '@/api/types'
import { Reading, Search, Picture, InfoFilled, Upload, Back, Check } from '@element-plus/icons-vue'
import LoadState from '@/components/LoadState.vue'
import PageHeading from '@/components/PageHeading.vue'
const route = useRoute(),
  router = useRouter(),
  id = computed(() => (route.params.id ? String(route.params.id) : '')),
  form = reactive<BookInput>({
    title: '',
    author: '',
    isbn: null,
    publisher: null,
    publishedOn: null,
    description: null,
    categoryId: '',
    keywords: null,
    coverPath: null,
    enabled: true,
  }),
  categories = ref<Category[]>([]),
  loading = ref(false),
  loadError = ref(''),
  error = ref(''),
  fields = ref<Record<string, string>>({}),
  busy = ref(false),
  uploading = ref(false)
const rules: FormRules = {
  title: [{ required: true, min: 1, max: 200, message: '书名需为 1–200 字', trigger: 'blur' }],
  author: [{ required: true, min: 1, max: 120, message: '作者需为 1–120 字', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  description: [{ max: 5000, message: '简介不得超过 5000 字', trigger: 'blur' }],
}
function validIsbn(value: string) {
  const digits = value.replace(/[-\s]/g, '')
  if (!/^\d{13}$/.test(digits)) return false
  const sum = digits.split('').reduce((n, ch, i) => n + Number(ch) * (i % 2 ? 3 : 1), 0)
  return sum % 10 === 0
}
async function load() {
  loading.value = true
  loadError.value = ''
  try {
    categories.value = await api.categories()
    if (id.value) {
      const b = await api.book(id.value)
      Object.assign(form, {
        isbn: b.isbn,
        title: b.title,
        author: b.author,
        publisher: b.publisher,
        publishedOn: b.publishedOn,
        description: b.description,
        categoryId: b.categoryId,
        keywords: b.keywords,
        coverPath: b.coverPath,
        enabled: b.enabled,
      })
    }
  } catch (e) {
    loadError.value = errorText(e)
  } finally {
    loading.value = false
  }
}
async function upload(file: File) {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 2 * 1024 * 1024
  ) {
    ElMessage.error('仅支持 2 MiB 以内的 JPEG、PNG 或 WebP')
    return false
  }
  uploading.value = true
  try {
    form.coverPath = (await api.uploadCover(file)).coverPath
    ElMessage.success('封面上传完成')
  } catch (e) {
    ElMessage.error(errorText(e))
  } finally {
    uploading.value = false
  }
  return false
}
async function submit() {
  error.value = ''
  fields.value = {}
  if (!form.title.trim() || form.title.length > 200) fields.value.title = '书名需为 1–200 字'
  if (!form.author.trim() || form.author.length > 120) fields.value.author = '作者需为 1–120 字'
  if (!form.categoryId) fields.value.categoryId = '请选择分类'
  if (form.isbn && !validIsbn(form.isbn)) fields.value.isbn = '请输入有效的 ISBN-13'
  if (form.description && form.description.length > 5000)
    fields.value.description = '简介不得超过 5000 字'
  if (Object.keys(fields.value).length) return
  busy.value = true
  try {
    const b = await api.saveBook(
      { ...form, title: form.title.trim(), author: form.author.trim(), isbn: form.isbn || null },
      id.value || undefined,
    )
    ElMessage.success(id.value ? '书目已更新' : '书目已创建')
    await router.push(`/staff/books/${b.id}/copies`)
  } catch (e) {
    error.value =
      e instanceof ApiError && e.code === 'ISBN_EXISTS'
        ? `${errorText(e)}。请到书目列表按 ISBN 搜索既有书目，再添加副本。`
        : errorText(e)
    fields.value = Object.fromEntries(fieldErrors(e).map((x) => [x.field, x.message]))
  } finally {
    busy.value = false
  }
}
onMounted(load)
watch(id, () => {
  Object.assign(form, {
    title: '',
    author: '',
    isbn: null,
    publisher: null,
    publishedOn: null,
    description: null,
    categoryId: '',
    keywords: null,
    coverPath: null,
    enabled: true,
  })
  fields.value = {}
  error.value = ''
  load()
})
</script>
<template>
  <div class="staff-breadcrumb">
    图书管理 / <span>{{ id ? '编辑书目' : '新增书目' }}</span>
  </div>
  <PageHeading
    :title="id ? '编辑书目' : '新增书目'"
    description="录入书目信息，创建后可继续添加实体副本。"
  />
  <LoadState :loading="loading" :error="loadError" @retry="load"
    ><section class="panel catalogue-form-panel">
      <el-alert v-if="error" type="error" :title="error" :closable="false" class="form-alert" />
      <el-form :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
        <div class="staff-form-section">
          <h2>
            <el-icon><Reading /></el-icon>基本书目信息
          </h2>
          <span><i>*</i> 为必填项</span>
        </div>
        <div class="staff-form-grid">
          <el-form-item label="书名" prop="title" required :error="fields.title"
            ><el-input v-model="form.title" maxlength="200" placeholder="请输入书名"
          /></el-form-item>
          <el-form-item label="作者" prop="author" required :error="fields.author"
            ><el-input v-model="form.author" maxlength="120" placeholder="请输入作者"
          /></el-form-item>
          <el-form-item label="ISBN-13" :error="fields.isbn"
            ><el-input v-model="form.isbn" placeholder="可留空；填写时需为有效 ISBN-13"
          /></el-form-item>
          <el-form-item label="分类" prop="categoryId" required :error="fields.categoryId"
            ><el-select v-model="form.categoryId" placeholder="请选择分类" aria-label="分类"
              ><el-option
                v-for="c in categories"
                :key="c.id"
                :label="c.name"
                :value="c.id" /></el-select
          ></el-form-item>
        </div>
        <div class="staff-form-section divider">
          <h2>
            <el-icon><Search /></el-icon>出版与检索
          </h2>
        </div>
        <div class="staff-form-grid inline-fields">
          <el-form-item label="出版社"
            ><el-input v-model="form.publisher" placeholder="请输入出版社（可选）" /></el-form-item
          ><el-form-item label="出版日期"
            ><el-date-picker
              v-model="form.publishedOn"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="请选择日期（可选）" /></el-form-item
          ><el-form-item class="span-2" label="关键词"
            ><el-input
              v-model="form.keywords"
              placeholder="使用逗号分隔多个关键词，方便检索（可选）"
          /></el-form-item>
        </div>
        <div class="staff-form-section divider">
          <h2>
            <el-icon><Picture /></el-icon>展示与上架
          </h2>
        </div>
        <div class="staff-display-fields">
          <el-form-item label="内容简介" prop="description" :error="fields.description"
            ><el-input
              v-model="form.description"
              type="textarea"
              :rows="5"
              maxlength="5000"
              show-word-limit
              placeholder="请输入内容简介（可选）"
          /></el-form-item>
          <div class="staff-cover-upload">
            <label>封面（可选）</label>
            <div class="cover-upload-body">
              <div class="cover-upload-preview">
                <img v-if="form.coverPath" :src="form.coverPath" alt="封面预览" /><el-icon v-else
                  ><Picture
                /></el-icon>
              </div>
              <div>
                <el-upload
                  :show-file-list="false"
                  :before-upload="upload"
                  accept="image/jpeg,image/png,image/webp"
                  ><el-button :icon="Upload" :loading="uploading">上传封面</el-button></el-upload
                >
                <p>JPEG / PNG / WebP<br />大小不超过 2 MiB</p>
              </div>
            </div>
          </div>
        </div>
        <div class="staff-enabled-row">
          <span>上架状态</span><el-switch v-model="form.enabled" /><strong>{{
            form.enabled ? '上架' : '下架'
          }}</strong
          ><span>下架后将停止新的预约和借出。</span>
        </div>
        <div class="staff-form-footer">
          <span
            ><el-icon><InfoFilled /></el-icon>保存后可继续为本书添加实体副本。</span
          ><RouterLink to="/staff/books"><el-button :icon="Back">返回列表</el-button></RouterLink
          ><el-button type="primary" native-type="submit" :icon="Check" :loading="busy"
            >保存书目</el-button
          >
        </div>
      </el-form>
    </section></LoadState
  >
</template>
