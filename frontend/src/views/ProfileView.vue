<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api'
import { errorText, fieldErrors } from '@/api/http'
import PageHeading from '@/components/PageHeading.vue'
const auth = useAuthStore(),
  form = reactive({ displayName: '', phone: '' }),
  busy = ref(false),
  error = ref(''),
  fields = ref<Record<string, string>>({})
const rules: FormRules = {
  displayName: [
    { required: true, min: 2, max: 40, message: '显示名需为 2–40 字', trigger: 'blur' },
  ],
}
watch(
  () => auth.user,
  (u) => {
    form.displayName = u?.displayName || ''
    form.phone = u?.phone || ''
  },
  { immediate: true },
)
async function save() {
  error.value = ''
  fields.value = {}
  if (form.displayName.trim().length < 2 || form.displayName.trim().length > 40) {
    error.value = '显示名需为 2–40 字'
    return
  }
  busy.value = true
  try {
    auth.user = await api.profile({
      displayName: form.displayName.trim(),
      phone: form.phone.trim() || undefined,
    })
    ElMessage.success('资料已更新')
  } catch (e) {
    error.value = errorText(e)
    fields.value = Object.fromEntries(fieldErrors(e).map((x) => [x.field, x.message]))
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <PageHeading title="个人资料" description="更新您的公开显示信息" />
  <section class="panel form-panel">
    <el-alert
      v-if="error"
      type="error"
      :title="error"
      :closable="false"
      class="form-alert"
    /><el-form :model="form" :rules="rules" label-width="110px" @submit.prevent="save"
      ><el-form-item label="用户名"
        ><el-input :model-value="auth.user?.username" disabled /></el-form-item
      ><el-form-item label="角色"><el-input :model-value="auth.user?.role" disabled /></el-form-item
      ><el-form-item label="显示名" prop="displayName" :error="fields.displayName" required
        ><el-input v-model="form.displayName" maxlength="40" show-word-limit /></el-form-item
      ><el-form-item label="手机号" :error="fields.phone"><el-input v-model="form.phone" /></el-form-item
      ><el-form-item
        ><el-button type="primary" native-type="submit" :loading="busy">保存资料</el-button
        ><RouterLink to="/change-password"
          ><el-button>修改密码</el-button></RouterLink
        ></el-form-item
      ></el-form
    >
  </section>
</template>
