import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'
import { ApiError, clearCsrf, refreshCsrf } from '@/api/http'
import type { User } from '@/api/types'
import { portalRole } from '@/portal'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)
  const backendError = ref('')
  let pending: Promise<void> | null = null
  async function restore(force = false) {
    if (initialized.value && !force) return
    if (pending) return pending
    pending = (async () => {
      backendError.value = ''
      try {
        await refreshCsrf()
      } catch (error) {
        backendError.value = error instanceof Error ? error.message : '后端连接失败'
      }
      try {
        const restored = await api.me()
        user.value = restored.role === portalRole ? restored : null
      } catch (error) {
        user.value = null
        if (
          !(
            error instanceof ApiError &&
            (error.status === 401 || error.code === 'PORTAL_ROLE_MISMATCH')
          )
        )
          backendError.value = error instanceof Error ? error.message : '会话恢复失败'
      }
      initialized.value = true
    })().finally(() => {
      pending = null
    })
    return pending
  }
  async function login(username: string, password: string) {
    await refreshCsrf()
    const data = await api.login({ username, password, portalRole })
    user.value = data.user
    clearCsrf()
    await refreshCsrf().catch(() => undefined)
  }
  async function logout() {
    await api.logout()
    user.value = null
    clearCsrf()
    await refreshCsrf().catch(() => undefined)
  }
  function clear() {
    user.value = null
    initialized.value = true
  }
  return { user, initialized, backendError, restore, login, logout, clear }
})
