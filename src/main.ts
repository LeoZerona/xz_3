import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import { Button, Icon, Progress } from 'vant'
import 'vant/lib/index.css'
import './styles/reset.css'
import './styles/theme.css'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  app.use(createPinia())
  app.use(Button)
  app.use(Icon)
  app.use(Progress)
  return { app }
}
