import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import './styles/main.css'
import './styles/reader.css'
import './styles/staff.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })
window.addEventListener('session-expired', () => {
  useAuthStore().clear()
  if (router.currentRoute.value.meta.requiresAuth)
    router.replace({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } })
})
window.addEventListener('password-change-required', () => router.replace('/change-password'))
window.addEventListener('forbidden', () => router.replace('/403'))
app.mount('#app')
