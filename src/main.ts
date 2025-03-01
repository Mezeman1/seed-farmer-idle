import '@/assets/base.postcss'
import router from '@/router'
import { createHead } from '@unhead/vue'
import { createPinia } from 'pinia'
import { createApp, markRaw } from 'vue'
import App from './App.vue'
import { usePersistenceStore } from '@/stores/persistenceStore'

// Create pinia first so we can use stores
const pinia = createPinia()

// Handle visibility changes to trigger offline progress calculation
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    console.log('App became visible, checking for offline progress')
    const persistenceStore = usePersistenceStore()
    if (persistenceStore.isGameLoaded) {
      persistenceStore.checkOfflineProgress()
    }
  }
})

// Set up periodic checks for offline progress
// This is a backup mechanism in case the visibility event doesn't fire properly
// We use a longer interval (1 minute) to avoid unnecessary processing
setInterval(() => {
  if (document.visibilityState === 'visible') {
    const persistenceStore = usePersistenceStore()
    if (persistenceStore.isGameLoaded) {
      console.log('Periodic check for offline progress')
      persistenceStore.checkOfflineProgress()
    }
  }
}, 60_000) // Check every 1 minute (60000ms) when the app is visible

const head = createHead()
const app = createApp(App)

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
