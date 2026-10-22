<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormRules } from 'element-plus'
import { api } from '@/api'
import { clearCsrf, errorText, fieldErrors, refreshCsrf } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { roleHome, safeRedirect } from '@/router'
import PageHeading from '@/components/PageHeading.vue'
const form = reactive({ oldPassword: '', newPassword: '', confirm: '' }),
  route = useRoute(),
  router = useRouter(),
  auth = useAuthStore(),
  busy = ref(false),
  error = ref(''),
  fields = ref<Record<string, string>>({})
const rules: FormRules = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, min: 8, max: 64, message: '新密码需为 8–64 位', trigger: 'blur' },
  ],
  confirm: [{ required: true, message: '请确认新密码', trigger: 'blur' }],
}
async function save() {
  error.value = ''
  fields.value = {}
  if (!form.oldPassword) error.value = '请输入当前密码'
  else if (form.newPassword.length < 8 || form.newPassword.length > 64)
    error.value = '新密码需为 8–64 位'
  else if (form.newPassword !== form.confirm) error.value = '两次密码不一致'
  if (error.value) return
  busy.value = true
  try {
    await api.changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword })
    clearCsrf()
    await refreshCsrf()
    form.oldPassword = ''
    form.newPassword = ''
    form.confirm = ''
    await auth.restore(true)
    ElMessage.success('密码已修改')
    const target = safeRedirect(route.query.redirect)
    await router.replace(target === '/' ? roleHome(auth.user?.role) : target)
  } catch (e) {
    error.value = errorText(e)
    fields.value = Object.fromEntries(fieldErrors(e).map((x) => [x.field, x.message]))
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <PageHeading
    title="修改密码"
    :description="
      auth.user?.mustChangePassword ? '首次登录需要先设置新密码' : '定期更新密码以保护账号'
    "
  />
  <section class="panel account-panel">
    <h2>账号安全</h2>
    <el-alert
      v-if="error"
      type="error"
      :title="error"
      :closable="false"
      class="form-alert"
    /><el-form
      class="account-form"
      :model="form"
      :rules="rules"
      label-width="120px"
      @submit.prevent="save"
      ><el-form-item label="当前密码" prop="oldPassword" :error="fields.oldPassword" required
        ><el-input
          v-model="form.oldPassword"
          type="password"
          show-password
          autocomplete="current-password" /></el-form-item
      ><el-form-item label="新密码" prop="newPassword" :error="fields.newPassword" required
        ><el-input
          v-model="form.newPassword"
          type="password"
          show-password
          autocomplete="new-password"
        />
        <p class="field-hint">8–64 位，建议使用字母、数字和符号组合。</p></el-form-item
      ><el-form-item label="确认新密码" prop="confirm" required
        ><el-input
          v-model="form.confirm"
          type="password"
          show-password
          autocomplete="new-password" /></el-form-item
      ><el-form-item
        ><el-button type="primary" native-type="submit" :loading="busy"
          >确认修改</el-button
        ></el-form-item
      ></el-form
    >
  </section>
</template>
