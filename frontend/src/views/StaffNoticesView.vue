<script setup lang="ts">
import { Document, Refresh } from '@element-plus/icons-vue'
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormRules } from 'element-plus'
import { api } from '@/api'
import { ApiError, errorText, fieldErrors } from '@/api/http'
import type { Notice } from '@/api/types'
import { dateTime, statusLabel, statusTone } from '@/utils/format'
import LoadState from '@/components/LoadState.vue'
import PageHeading from '@/components/PageHeading.vue'
const items = ref<Notice[]>([]),
  status = ref('DRAFT'),
  page = ref(1),
  total = ref(0),
  loading = ref(true),
  error = ref(''),
  dialog = ref(false),
  preview = ref(false),
  busy = ref(false),
  editing = ref(''),
  formError = ref(''),
  fields = ref<Record<string, string>>({}),
  form = reactive({ title: '', content: '' })
const rules: FormRules = {
  title: [{ required: true, min: 1, max: 120, message: '标题需为 1–120 字', trigger: 'blur' }],
  content: [
    { required: true, max: 10000, message: '正文不可为空且不超过 10000 字', trigger: 'blur' },
  ],
}
async function load() {
  loading.value = true
  error.value = ''
  try {
    const d = await api.notices({ status: status.value || undefined, page: page.value, size: 10 })
    items.value = d.items
    total.value = d.total
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}
function open(n?: Notice) {
  editing.value = n?.id || ''
  form.title = n?.title || ''
  form.content = n?.content || ''
  formError.value = ''
  fields.value = {}
  dialog.value = true
}
async function save() {
  formError.value = ''
  if (
    !form.title.trim() ||
    form.title.length > 120 ||
    !form.content.trim() ||
    form.content.length > 10000
  ) {
    formError.value = '标题需为 1–120 字，正文不超过 10000 字'
    return
  }
  busy.value = true
  try {
    await api.saveNotice(
      { title: form.title.trim(), content: form.content },
      editing.value || undefined,
    )
    dialog.value = false
    ElMessage.success('草稿已保存')
    await load()
  } catch (e) {
    formError.value = errorText(e)
    fields.value = Object.fromEntries(fieldErrors(e).map((x) => [x.field, x.message]))
  } finally {
    busy.value = false
  }
}
async function action(n: Notice, kind: 'publish' | 'withdraw') {
  if (kind === 'publish') {
    form.title = n.title
    form.content = n.content
    preview.value = true
  }
  try {
    await ElMessageBox.confirm(
      kind === 'publish'
        ? `确认发布公告《${n.title}》？公告将对所有访客可见。`
        : `确认撤下公告《${n.title}》？公开页面将不再显示。`,
      '确认操作',
      { type: 'warning' },
    )
  } catch {
    return
  }
  busy.value = true
  try {
    await api.noticeAction(n.id, kind)
    ElMessage.success('公告状态已更新')
    await load()
  } catch (e) {
    ElMessage.error(errorText(e))
    if (e instanceof ApiError && [409, 422].includes(e.status)) await load()
  } finally {
    busy.value = false
  }
}
function showPreview(notice: Notice) {
  form.title = notice.title
  form.content = notice.content
  preview.value = true
}
function applyFilter() {
  page.value = 1
  void load()
}
onMounted(load)
</script>
<template>
  <div class="staff-breadcrumb">系统设置 / <span>公告管理</span></div>
  <PageHeading title="公告管理" description="发布馆内通知，让重要信息及时传达。"
    ><el-button type="primary" @click="open()">＋ 新建公告</el-button></PageHeading
  >
  <section class="panel staff-notice-panel">
    <div class="notice-management-tools">
      <el-tabs v-model="status" class="record-tabs" @tab-change="applyFilter"
        ><el-tab-pane label="草稿" name="DRAFT" /><el-tab-pane
          label="已发布"
          name="PUBLISHED" /><el-tab-pane label="已撤下" name="WITHDRAWN" /></el-tabs
      ><el-button :icon="Refresh" @click="load">刷新</el-button><span>共 {{ total }} 条</span>
    </div>
    <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"
      ><article v-for="notice in items" :key="notice.id" class="managed-notice">
        <el-icon class="managed-notice-icon"><Document /></el-icon>
        <div class="managed-notice-text">
          <h2>
            {{ notice.title }}
            <el-tag :type="statusTone(notice.status)">{{ statusLabel[notice.status] }}</el-tag>
          </h2>
          <p>{{ notice.content }}</p>
        </div>
        <time>{{ dateTime(notice.publishedAt || notice.updatedAt) }}</time>
        <div class="managed-notice-actions">
          <el-button v-if="notice.status !== 'PUBLISHED'" link type="primary" @click="open(notice)"
            >编辑</el-button
          ><el-button link type="primary" @click="showPreview(notice)">预览</el-button
          ><el-button
            v-if="notice.status !== 'PUBLISHED'"
            link
            type="success"
            :loading="busy"
            @click="action(notice, 'publish')"
            >发布</el-button
          ><el-button v-else link type="danger" :loading="busy" @click="action(notice, 'withdraw')"
            >撤下</el-button
          >
        </div>
      </article>
      <div class="staff-list-footer">
        <span>共 {{ total }} 条记录</span
        ><el-pagination
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
  <p class="staff-page-footnote">公告发布后对所有访客可见；撤下后将不再出现在公开公告列表。</p>
  <el-dialog v-model="dialog" :title="editing ? '编辑公告' : '新建公告'" width="650px"
    ><el-alert
      v-if="formError"
      type="error"
      :title="formError"
      :closable="false"
      class="form-alert"
    /><el-form :model="form" :rules="rules" label-width="75px"
      ><el-form-item label="标题" prop="title" required :error="fields.title"
        ><el-input v-model="form.title" maxlength="120" show-word-limit /></el-form-item
      ><el-form-item label="正文" prop="content" required :error="fields.content"
        ><el-input
          v-model="form.content"
          type="textarea"
          :rows="10"
          maxlength="10000"
          show-word-limit /></el-form-item></el-form
    ><template #footer
      ><el-button @click="preview = true">预览</el-button
      ><el-button @click="dialog = false">取消</el-button
      ><el-button type="primary" :loading="busy" @click="save">保存草稿</el-button></template
    ></el-dialog
  ><el-dialog v-model="preview" title="公告预览" width="600px"
    ><h2>{{ form.title }}</h2>
    <div class="pre-wrap">{{ form.content }}</div></el-dialog
  >
</template>
