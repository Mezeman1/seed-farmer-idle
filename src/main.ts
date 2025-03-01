import '@/assets/base.postcss'
import router from '@/router'
import { createHead } from '@unhead/vue'
import { createPinia } from 'pinia'
import { createApp, markRaw } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import { usePersistenceStore } from '@/stores/persistenceStore'

// Register service worker
const updateSW = registerSW({
  onNeedRefresh() {
    // Show a prompt to the user to refresh the app
    console.log('New content available, click on reload button to update.')
  },
  onOfflineReady() {
    // Show a ready to work offline message
    console.log('App ready to work offline')
  },
})

const head = createHead()
const app = createApp(App)

const pinia = createPinia()
pinia.use(({ store }) => {
  store.router = markRaw(router)
})
app.use(pinia)
app.use(router)
app.use(head)

// Initialize the app
app.mount('#app')

// Initialize persistence store after app is mounted
const persistenceStore = usePersistenceStore()
persistenceStore.init()
