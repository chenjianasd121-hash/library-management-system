<script setup lang="ts">
import { Search, User, Lock } from '@element-plus/icons-vue'
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormRules } from 'element-plus'
import { api } from '@/api'
import { ApiError, errorText, fieldErrors } from '@/api/http'
import type { AdminUser } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import LoadState from '@/components/LoadState.vue'
import PageHeading from '@/components/PageHeading.vue'
const auth = useAuthStore(),
  filter = reactive({ keyword: '', role: '', status: '' }),
  items = ref<AdminUser[]>([]),
  activeAdminCount = ref(0),
  page = ref(1),
  total = ref(0),
  loading = ref(true),
  error = ref(''),
  dialog = ref(false),
  busy = ref(false),
  rowBusy = ref(''),
  formError = ref(''),
  fields = ref<Record<string, string>>({}),
  form = reactive({
    username: '',
    initialPassword: '',
    displayName: '',
    role: 'LIBRARIAN' as 'ADMIN' | 'LIBRARIAN',
  })
const rules: FormRules = {
  username: [
    {
      required: true,
      pattern: /^[A-Za-z0-9_]{4,32}$/,
      message: '用户名需为 4–32 位字母、数字或下划线',
      trigger: 'blur',
    },
  ],
  displayName: [
    { required: true, min: 2, max: 40, message: '显示名需为 2–40 字', trigger: 'blur' },
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  initialPassword: [
    { required: true, min: 8, max: 64, message: '初始密码需为 8–64 位', trigger: 'blur' },
  ],
}
async function load() {
  loading.value = true
  error.value = ''
  try {
    const [d, admins] = await Promise.all([
      api.users({ ...filter, page: page.value, size: 10 }),
      api.users({ role: 'ADMIN', status: 'ACTIVE', page: 1, size: 1 }),
    ])
    items.value = d.items
    total.value = d.total
    activeAdminCount.value = admins.total
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}
function open() {
  Object.assign(form, { username: '', initialPassword: '', displayName: '', role: 'LIBRARIAN' })
  formError.value = ''
  fields.value = {}
  dialog.value = true
}
async function create() {
  formError.value = ''
  if (
    !/^[A-Za-z0-9_]{4,32}$/.test(form.username) ||
    form.initialPassword.length < 8 ||
    form.initialPassword.length > 64 ||
    form.displayName.trim().length < 2 ||
    form.displayName.trim().length > 40
  ) {
    formError.value = '请填写有效的用户名、显示名和 8–64 位初始密码'
    return
  }
  busy.value = true
  try {
    await api.createUser({ ...form, displayName: form.displayName.trim() })
    dialog.value = false
    ElMessage.success('员工账号已创建，首次登录需改密')
    await load()
  } catch (e) {
    formError.value = errorText(e)
    fields.value = Object.fromEntries(fieldErrors(e).map((x) => [x.field, x.message]))
  } finally {
    form.initialPassword = ''
    busy.value = false
  }
}
async function toggle(u: AdminUser) {
  if (u.id === auth.user?.id) {
    ElMessage.warning('不能禁用自己的账号')
    return
  }
  if (u.role === 'ADMIN' && u.status === 'ACTIVE' && activeAdminCount.value <= 1) {
    ElMessage.warning('不能禁用最后一名有效管理员')
    return
  }
  try {
    await ElMessageBox.confirm(
      `${u.status === 'ACTIVE' ? '禁用' : '启用'}账号 ${u.username}？禁用读者时，其有效预约会按服务端规则处理。`,
      '确认账号状态',
      { type: 'warning' },
    )
  } catch {
    return
  }
  rowBusy.value = u.id
  try {
    await api.updateUser(u.id, { status: u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' })
    ElMessage.success('账号状态已更新')
    await load()
  } catch (e) {
    ElMessage.error(errorText(e))
    if (e instanceof ApiError && [409, 422].includes(e.status)) await load()
  } finally {
    rowBusy.value = ''
  }
}
async function reset(u: AdminUser) {
  let password = ''
  try {
    const a = await ElMessageBox.prompt(
      `为 ${u.username} 设置一次性新密码（8–64 位）。`,
      '重置密码',
      {
        inputType: 'password',
        inputValidator: (v) => (v.length >= 8 && v.length <= 64) || '密码需为 8–64 位',
        type: 'warning',
      },
    )
    password = a.value
  } catch {
    return
  }
  rowBusy.value = u.id
  try {
    await api.resetPassword(u.id, password)
    ElMessage.success('密码已重置，用户下次登录须改密')
  } catch (e) {
    ElMessage.error(errorText(e))
  } finally {
    password = ''
    rowBusy.value = ''
  }
}
function applyFilter() {
  page.value = 1
  void load()
}
onMounted(load)
</script>
<template>
  <PageHeading title="账号管理" description="管理系统账号，维护员工与读者的访问权限。"
    ><el-button type="primary" @click="open">＋ 创建员工</el-button></PageHeading
  >
  <form class="panel staff-filter users-filter" @submit.prevent="applyFilter">
    <el-input
      v-model="filter.keyword"
      placeholder="搜索用户名 / 显示名"
      :prefix-icon="Search"
      clearable
    /><el-select v-model="filter.role"
      ><el-option label="全部角色" value="" /><el-option label="管理员" value="ADMIN" /><el-option
        label="馆员"
        value="LIBRARIAN" /><el-option label="读者" value="READER" /></el-select
    ><el-select v-model="filter.status"
      ><el-option label="全部状态" value="" /><el-option label="正常" value="ACTIVE" /><el-option
        label="禁用"
        value="DISABLED" /></el-select
    ><el-button type="primary" native-type="submit" :icon="Search">筛选</el-button>
  </form>
  <section class="panel users-panel">
    <div class="management-section-heading">
      <h2>账号列表</h2>
      <span>共 {{ total }} 个账号</span>
    </div>
    <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"
      ><div class="table-scroll">
        <el-table :data="items" class="management-table users-table">
          <el-table-column prop="username" label="用户名" min-width="205" /><el-table-column
            label="显示名"
            min-width="215"
            ><template #default="s"
              >{{ s.row.displayName }}
              <el-tag v-if="s.row.id === auth.user?.id" class="current-account-tag" size="small"
                >当前账号</el-tag
              ></template
            ></el-table-column
          >
          <el-table-column label="角色" min-width="140"
            ><template #default="s"
              ><el-icon><User /></el-icon>
              {{
                { ADMIN: '管理员', LIBRARIAN: '馆员', READER: '读者' }[
                  s.row.role as 'ADMIN' | 'LIBRARIAN' | 'READER'
                ]
              }}</template
            ></el-table-column
          >
          <el-table-column label="状态" min-width="110"
            ><template #default="s"
              ><el-tag :type="s.row.status === 'ACTIVE' ? 'success' : 'info'">{{
                s.row.status === 'ACTIVE' ? '正常' : '已禁用'
              }}</el-tag></template
            ></el-table-column
          >
          <el-table-column label="操作" width="295"
            ><template #default="s"
              ><el-button
                plain
                :type="s.row.status === 'ACTIVE' ? 'danger' : 'success'"
                :disabled="
                  s.row.id === auth.user?.id ||
                  (s.row.role === 'ADMIN' && s.row.status === 'ACTIVE' && activeAdminCount <= 1)
                "
                :loading="rowBusy === s.row.id"
                @click="toggle(s.row)"
                >{{ s.row.status === 'ACTIVE' ? '禁用账号' : '启用账号' }}</el-button
              ><el-button plain type="primary" :loading="rowBusy === s.row.id" @click="reset(s.row)"
                >重置密码</el-button
              ><small v-if="s.row.id === auth.user?.id" class="account-lock-hint"
                ><el-icon><Lock /></el-icon>当前登录账号不能禁用</small
              ></template
            ></el-table-column
          >
        </el-table>
      </div>
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
  <el-dialog v-model="dialog" title="创建员工账号" width="520px"
    ><el-alert
      v-if="formError"
      type="error"
      :title="formError"
      :closable="false"
      class="form-alert"
    /><el-form :model="form" :rules="rules" label-width="110px"
      ><el-form-item label="用户名" prop="username" required :error="fields.username"
        ><el-input v-model="form.username" maxlength="32" autocomplete="off" /></el-form-item
      ><el-form-item label="显示名" prop="displayName" required :error="fields.displayName"
        ><el-input v-model="form.displayName" maxlength="40" /></el-form-item
      ><el-form-item label="角色" prop="role" required
        ><el-select v-model="form.role"
          ><el-option label="馆员" value="LIBRARIAN" /><el-option
            label="管理员"
            value="ADMIN" /></el-select></el-form-item
      ><el-form-item
        label="初始密码"
        prop="initialPassword"
        required
        :error="fields.initialPassword"
        ><el-input
          v-model="form.initialPassword"
          type="password"
          show-password
          autocomplete="new-password" /></el-form-item></el-form
    ><template #footer
      ><el-button @click="dialog = false">取消</el-button
      ><el-button type="primary" :loading="busy" @click="create">创建账号</el-button></template
    ></el-dialog
  >
</template>
