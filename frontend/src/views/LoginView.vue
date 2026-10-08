<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { roleHome, safeRedirect } from '@/router'
import { errorText, fieldErrors } from '@/api/http'
import { portal, portalTitle } from '@/portal'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const form = reactive({ username: '', password: '' })
const copy = {
  reader: {
    eyebrow: 'READER PORTAL',
    headline: '让下一本好书，\n从这里开始。',
    description: '发现馆藏、预约心仪图书，随时了解自己的借阅进度。',
    note: '阅读是一场不断发生的相遇',
    heading: '读者登录',
    subtitle: '进入属于你的阅读空间',
    button: '进入读者中心',
  },
  librarian: {
    eyebrow: 'LIBRARIAN PORTAL',
    headline: '让每一次借阅，\n都井然有序。',
    description: '从馆藏副本到预约队列，专注处理每一次到馆服务。',
    note: '认真服务每一位读者',
    heading: '馆员登录',
    subtitle: '进入流通与馆藏工作台',
    button: '进入馆员工作台',
  },
  admin: {
    eyebrow: 'ADMIN PORTAL',
    headline: '看见全局，\n管理有序。',
    description: '统一掌握馆藏、账号、统计与审计，让管理决策更清晰。',
    note: '以清晰的数据守护每一份馆藏',
    heading: '管理员登录',
    subtitle: '进入系统管理控制台',
    button: '进入管理控制台',
  },
}[portal]
const rules: FormRules = {
  username: [
    {
      required: true,
      pattern: /^[A-Za-z0-9_]{4,32}$/,
      message: '用户名需为 4–32 位字母、数字或下划线',
      trigger: 'blur',
    },
  ],
  password: [{ required: true, min: 8, max: 64, message: '密码需为 8–64 位', trigger: 'blur' }],
}
const submitting = ref(false)
const error = ref('')
const fields = ref<Record<string, string>>({})
async function submit() {
  fields.value = {}
  if (
    !/^[A-Za-z0-9_]{4,32}$/.test(form.username) ||
    form.password.length < 8 ||
    form.password.length > 64
  ) {
    error.value = '请填写有效的用户名和密码'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    await auth.login(form.username, form.password)
    ElMessage.success('登录成功')
    const target = safeRedirect(route.query.redirect)
    await router.replace(target === '/' ? roleHome(auth.user?.role) : target)
  } catch (e) {
    error.value = errorText(e)
    fields.value = Object.fromEntries(fieldErrors(e).map((x) => [x.field, x.message]))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="portal-login" :class="`portal-${portal}`">
    <section class="portal-visual" :aria-label="`${portalTitle}介绍`">
      <div class="portal-brand"><span class="portal-brand-mark">▦</span><span>图书管理系统</span></div>
      <div class="portal-visual-content">
        <div class="portal-eyebrow">{{ copy.eyebrow }} <span></span> {{ portalTitle }}</div>
        <h1>{{ copy.headline }}</h1>
        <p>{{ copy.description }}</p>
        <div class="portal-book-scene" aria-hidden="true">
          <div class="portal-halo"></div>
          <div class="portal-book portal-book-one"><span></span></div>
          <div class="portal-book portal-book-two"><span></span></div>
          <div class="portal-book portal-book-three"><span></span></div>
          <div class="portal-book-base"></div>
        </div>
      </div>
      <div class="portal-note"><span class="portal-note-line"></span>{{ copy.note }}</div>
    </section>
    <main class="portal-form-side">
      <div class="portal-form-brand"><span class="portal-brand-mark">▦</span> 图书管理系统</div>
      <section class="portal-form-card" :aria-label="copy.heading">
        <div class="portal-role-pill"><span class="portal-role-dot"></span>{{ portalTitle }} · 专属通道</div>
        <h2>{{ copy.heading }}</h2>
        <p class="portal-form-subtitle">{{ copy.subtitle }}</p>
        <el-alert
          v-if="error"
          type="error"
          :title="error"
          show-icon
          :closable="false"
          class="form-alert"
        />
        <el-form :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
          <el-form-item label="用户名" prop="username" :error="fields.username" required>
            <el-input
              v-model="form.username"
              autocomplete="username"
              placeholder="请输入用户名"
              maxlength="32"
              size="large"
            />
          </el-form-item>
          <el-form-item label="密码" prop="password" :error="fields.password" required>
            <el-input
              v-model="form.password"
              type="password"
              show-password
              autocomplete="current-password"
              placeholder="请输入密码"
              size="large"
            />
          </el-form-item>
          <el-button
            type="primary"
            native-type="submit"
            size="large"
            :loading="submitting"
            class="portal-submit"
            >{{ copy.button }} <span aria-hidden="true">→</span></el-button
          >
        </el-form>
        <p v-if="portal === 'reader'" class="portal-form-footer">
          还没有读者账号？<RouterLink to="/register">立即注册</RouterLink>
        </p>
        <p v-else class="portal-form-footer">员工账号由管理员开通，请联系系统管理员。</p>
      </section>
      <div class="portal-form-bottom">© 图书管理系统 · {{ portalTitle }}</div>
    </main>
  </div>
</template>
