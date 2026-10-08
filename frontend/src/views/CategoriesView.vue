<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormRules } from 'element-plus'
import { api } from '@/api'
import { errorText, fieldErrors } from '@/api/http'
import type { Category } from '@/api/types'
import LoadState from '@/components/LoadState.vue'
import PageHeading from '@/components/PageHeading.vue'
const items = ref<Category[]>([]),
  loading = ref(true),
  error = ref(''),
  dialog = ref(false),
  busy = ref(false),
  formError = ref(''),
  fields = ref<Record<string, string>>({}),
  editing = ref(''),
  form = reactive({ name: '', code: '', sortOrder: 0, enabled: true })
const rules: FormRules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入分类编码', trigger: 'blur' }],
}
async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = await api.categories()
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}
function open(c?: Category) {
  editing.value = c?.id || ''
  Object.assign(
    form,
    c
      ? { name: c.name, code: c.code, sortOrder: c.sortOrder, enabled: c.enabled }
      : { name: '', code: '', sortOrder: 0, enabled: true },
  )
  fields.value = {}
  formError.value = ''
  dialog.value = true
}
async function save() {
  if (!form.name.trim() || !form.code.trim()) {
    formError.value = '分类名称和编码不能为空'
    return
  }
  if (editing.value && !form.enabled) {
    try {
      await ElMessageBox.confirm('停用分类后读者将不能再按此分类检索。确认继续？', '确认停用', {
        type: 'warning',
      })
    } catch {
      return
    }
  }
  busy.value = true
  formError.value = ''
  try {
    await api.saveCategory(
      { ...form, name: form.name.trim(), code: form.code.trim() },
      editing.value || undefined,
    )
    dialog.value = false
    ElMessage.success('分类已保存')
    await load()
  } catch (e) {
    formError.value = errorText(e)
    fields.value = Object.fromEntries(fieldErrors(e).map((x) => [x.field, x.message]))
  } finally {
    busy.value = false
  }
}
onMounted(load)
</script>
<template>
  <PageHeading title="分类管理" description="维护目录分类及启用状态"
    ><el-button type="primary" @click="open()">＋ 新增分类</el-button></PageHeading
  >
  <section class="panel">
    <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"
      ><div class="table-scroll">
        <el-table :data="items" stripe class="data-table"
          ><el-table-column prop="name" label="分类名称" min-width="150" /><el-table-column
            prop="code"
            label="编码"
            min-width="130"
          /><el-table-column prop="sortOrder" label="排序" width="90" /><el-table-column
            label="状态"
            width="110"
            ><template #default="s"
              ><el-tag :type="s.row.enabled ? 'success' : 'info'">{{
                s.row.enabled ? '启用' : '停用'
              }}</el-tag></template
            ></el-table-column
          ><el-table-column label="操作" width="100"
            ><template #default="s"
              ><el-button link type="primary" @click="open(s.row)">编辑</el-button></template
            ></el-table-column
          ></el-table
        >
      </div></LoadState
    >
  </section>
  <el-dialog v-model="dialog" :title="editing ? '编辑分类' : '新增分类'" width="500px"
    ><el-alert
      v-if="formError"
      type="error"
      :title="formError"
      :closable="false"
      class="form-alert"
    /><el-form :model="form" :rules="rules" label-width="95px"
      ><el-form-item label="分类名称" prop="name" required :error="fields.name"
        ><el-input v-model="form.name" /></el-form-item
      ><el-form-item label="分类编码" prop="code" required :error="fields.code"
        ><el-input v-model="form.code" /></el-form-item
      ><el-form-item label="排序"
        ><el-input-number v-model="form.sortOrder" :min="0" /></el-form-item
      ><el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item></el-form
    ><template #footer
      ><el-button @click="dialog = false">取消</el-button
      ><el-button type="primary" :loading="busy" @click="save">保存</el-button></template
    ></el-dialog
  >
</template>
