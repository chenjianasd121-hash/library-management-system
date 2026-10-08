<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormRules } from 'element-plus'
import { api } from '@/api'
import { errorText, fieldErrors, refreshCsrf } from '@/api/http'
const router = useRouter()
const form = reactive({ username: '', displayName: '', phone: '', password: '', confirm: '' })
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
  password: [{ required: true, min: 8, max: 64, message: '密码需为 8–64 位', trigger: 'blur' }],
  confirm: [{ required: true, message: '请再次输入密码', trigger: 'blur' }],
}
const error = ref('')
const fields = ref<Record<string, string>>({})
const submitting = ref(false)
async function submit() {
  error.value = ''
  fields.value = {}
  if (!/^[A-Za-z0-9_]{4,32}$/.test(form.username))
    error.value = '用户名需为 4–32 位字母、数字或下划线'
  else if (form.displayName.trim().length < 2 || form.displayName.trim().length > 40)
    error.value = '显示名需为 2–40 字'
  else if (form.password.length < 8 || form.password.length > 64) error.value = '密码需为 8–64 位'
  else if (form.password !== form.confirm) error.value = '两次密码不一致'
  if (error.value) return
  submitting.value = true
  try {
    await api.register({
      username: form.username.trim(),
      displayName: form.displayName.trim(),
      password: form.password,
      phone: form.phone.trim() || undefined,
    })
    await refreshCsrf()
    ElMessage.success('注册成功，请登录')
    await router.replace('/login')
  } catch (e) {
    error.value = errorText(e)
    fields.value = Object.fromEntries(fieldErrors(e).map((x) => [x.field, x.message]))
  } finally {
    submitting.value = false
  }
}
</script>
<template>
  <div class="auth-wrap">
    <div class="auth-intro">
      <div class="eyebrow">JOIN THE LIBRARY</div>
      <h1>注册读者账号</h1>
      <p>创建账号后即可检索馆藏、预约图书和管理自己的借阅。</p>
      <div class="auth-art">📖</div>
    </div>
    <section class="panel auth-card">
      <h2>读者注册</h2>
      <p class="muted">馆员和管理员账号由管理员创建</p>
      <el-alert
        v-if="error"
        type="error"
        :title="error"
        show-icon
        :closable="false"
        class="form-alert"
      /><el-form :model="form" :rules="rules" label-position="top" @submit.prevent="submit"
        ><el-form-item label="用户名" prop="username" :error="fields.username" required
          ><el-input v-model="form.username" maxlength="32" autocomplete="username" /></el-form-item
        ><el-form-item label="显示名" prop="displayName" :error="fields.displayName" required
          ><el-input v-model="form.displayName" maxlength="40" /></el-form-item
        ><el-form-item label="手机号（可选）" :error="fields.phone"><el-input v-model="form.phone" /></el-form-item
        ><el-form-item label="密码" prop="password" :error="fields.password" required
          ><el-input
            v-model="form.password"
            type="password"
            show-password
            autocomplete="new-password" /></el-form-item
        ><el-form-item label="确认密码" prop="confirm" required
          ><el-input
            v-model="form.confirm"
            type="password"
            show-password
            autocomplete="new-password" /></el-form-item
        ><el-button
          type="primary"
          native-type="submit"
          size="large"
          :loading="submitting"
          class="full-btn"
          >注册账号</el-button
        ></el-form
      >
      <p class="auth-footer">已有账号？<RouterLink to="/login">返回登录</RouterLink></p>
    </section>
  </div>
</template>
