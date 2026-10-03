import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import { Button, Icon, Progress, Switch } from 'vant'
import 'vant/lib/index.css'
import './styles/reset.css'
import './styles/theme.css'
import App from './App.vue'
import { useThemeStore } from './stores/theme'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.use(Button)
  app.use(Icon)
  app.use(Progress)
  app.use(Switch)
  useThemeStore(pinia).initialize()
  return { app }
}
