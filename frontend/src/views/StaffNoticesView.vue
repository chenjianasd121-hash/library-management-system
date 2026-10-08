<script setup lang="ts">
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
onMounted(load)
</script>
<template>
  <PageHeading title="公告管理" description="保存草稿、预览并发布馆内通知"
    ><el-button type="primary" @click="open()">＋ 新建公告</el-button></PageHeading
  >
  <section class="panel">
    <div class="list-toolbar">
      <el-select
        v-model="status"
        @change="
          () => {
            page = 1
            load()
          }
        "
        ><el-option label="草稿" value="DRAFT" /><el-option
          label="已发布"
          value="PUBLISHED" /><el-option label="已撤下" value="WITHDRAWN" /></el-select
      ><el-button @click="load">刷新</el-button>
    </div>
    <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"
      ><div class="table-scroll">
        <el-table :data="items" stripe class="data-table"
          ><el-table-column prop="title" label="标题" min-width="230" /><el-table-column
            label="状态"
            width="110"
            ><template #default="s"
              ><el-tag :type="statusTone(s.row.status)">{{
                statusLabel[s.row.status as keyof typeof statusLabel]
              }}</el-tag></template
            ></el-table-column
          ><el-table-column label="发布时间" width="170"
            ><template #default="s">{{ dateTime(s.row.publishedAt) }}</template></el-table-column
          ><el-table-column label="操作" width="230"
            ><template #default="s"
              ><el-button
                v-if="s.row.status !== 'PUBLISHED'"
                link
                type="primary"
                @click="open(s.row)"
                >编辑</el-button
              ><el-button
                link
                @click="
                  () => {
                    form.title = s.row.title
                    form.content = s.row.content
                    preview = true
                  }
                "
                >预览</el-button
              ><el-button
                v-if="s.row.status !== 'PUBLISHED'"
                link
                type="success"
                @click="action(s.row, 'publish')"
                >发布</el-button
              ><el-button v-else link type="danger" @click="action(s.row, 'withdraw')"
                >撤下</el-button
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
