<script setup lang="ts">
// See vite.config.ts for details about automatic imports
import { registerSW } from 'virtual:pwa-register'
import PWAUpdateNotification from '@/components/PWAUpdateNotification.vue'
import OfflineProgressModal from '@/components/OfflineProgressModal.vue'
import OfflineProgressNotification from '@/components/OfflineProgressNotification.vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { usePersistenceStore } from '@/stores/persistenceStore'
import { useCoreStore } from '@/stores/coreStore'
import { useFarmStore } from '@/stores/farmStore'
import { useTickStore } from '@/stores/tickStore'
import { formatDecimal } from '@/utils/formatting'
import { formatTime } from '@/utils/time-formatting'

const route = useRoute()
const pwaUpdateNotificationRef = ref<InstanceType<typeof PWAUpdateNotification> | null>(null)
const persistenceStore = usePersistenceStore()
const coreStore = useCoreStore()
const farmStore = useFarmStore()
const tickStore = useTickStore()
const offlineProgressMessage = ref('')
const offlineSeedsGained = ref('')
const showOfflineMessage = ref(false)

// Register service worker with update handling
const updateSW = registerSW({
  onNeedRefresh() {
    // Show the update UI when a new version is available
    if (pwaUpdateNotificationRef.value) {
      pwaUpdateNotificationRef.value.showRefreshUI()
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
  immediate: true
})

// Handle update action
const handleUpdate = () => {
  console.log('Updating service worker...')
  updateSW(true) // Force update
}

// Handle offline progress notification
const handleGameLoaded = () => {
  // Show offline progress message if applicable
  if (persistenceStore.offlineProgressEnabled && !persistenceStore.isProcessingOfflineTicks) {
    const offlineTime = Math.floor(persistenceStore.offlineTimeAway)
    if (offlineTime > 60) {
      offlineProgressMessage.value = `Welcome back! You were away for ${formatTime(offlineTime)}.`
      // Calculate approximate seeds gained (based on current production rate)
      const seedsPerTick = farmStore.calculateTotalSeedsPerTick()
      const approxTicks = Math.floor(offlineTime / tickStore.tickDuration)
      const approxSeedsGained = seedsPerTick.times(approxTicks)
      offlineSeedsGained.value = formatDecimal(approxSeedsGained)
      showOfflineMessage.value = true
    }
  }
}

// Listen for game loaded event
persistenceStore.$subscribe((mutation, state) => {
  if (state.isGameLoaded && !state.isProcessingOfflineTicks) {
    handleGameLoaded()
  }
})

// Dismiss the offline progress message
const dismissOfflineMessage = () => {
  showOfflineMessage.value = false
}

// Set up periodic check for updates
onMounted(() => {
  // Check for updates every 5 minutes
  const intervalId = setInterval(() => {
    console.log('Checking for PWA updates...')
    updateSW(true) // Force check for updates
  }, 5 * 60 * 1000) // 5 minutes

  // Also check for updates when the app becomes visible
  const visibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      console.log('App became visible, checking for PWA updates')
      updateSW(true)
    }
  }

  document.addEventListener('visibilitychange', visibilityHandler)

  // Clean up interval and event listener on component unmount
  onUnmounted(() => {
    clearInterval(intervalId)
    document.removeEventListener('visibilitychange', visibilityHandler)
  })

  // Register for service worker updates
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      // Check for updates on initial load
      registration.update()
    })
  }
})

useHead({
  title: () => route.meta.title || 'Seed Farmer - Idle Game',
  meta: [
    {
      name: 'description',
      content: 'Seed Farmer is a tick-based idle game where you grow your seed empire, unlock upgrades, and progress through seasons.',
    },
    {
      property: 'og:title',
      content: () => route.meta.title || 'Seed Farmer - Idle Game',
    },
    {
      property: 'og:description',
      content: 'Seed Farmer is a tick-based idle game where you grow your seed empire, unlock upgrades, and progress through seasons.',
    },
    {
      property: 'og:type',
      content: 'website',
    },
    {
      property: 'og:image',
      content: '/pwa-512x512.png',
    },
    {
      property: 'og:url',
      content: 'https://idle-seed-farm.com',
    },
    {
      name: 'twitter:title',
      content: () => route.meta.title || 'Seed Farmer - Idle Game',
    },
    {
      name: 'twitter:description',
      content: 'Seed Farmer is a tick-based idle game where you grow your seed empire, unlock upgrades, and progress through seasons.',
    },
    {
      name: 'twitter:card',
      content: 'summary',
    },
    {
      name: 'twitter:image',
      content: '/pwa-512x512.png',
    },
    {
      name: 'color-scheme',
      content: 'light dark',
    },
    {
      name: 'theme-color',
      content: '#f5f5dc', // Light mode color
      media: '(prefers-color-scheme: light)',
    },
    {
      name: 'theme-color',
      content: '#1f2937', // Dark mode color
      media: '(prefers-color-scheme: dark)',
    },
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1.0',
    },
    {
      name: 'robots',
      content: 'index, follow',
    },
    {
      name: 'author',
      content: 'Mees Buschman',
    },
    {
      name: 'keywords',
      content: 'idle game, farming game, seed farmer, tick-based game, incremental game',
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: () => `https://idle-seed-farm.com${route.path}`,
    },
  ],
})
</script>

<template>
  <div class="min-h-screen bg-amber-50 dark:bg-gray-900 transition-colors duration-300">
    <!-- Offline progress notification component -->
    <OfflineProgressNotification :message="offlineProgressMessage" :seeds-gained="offlineSeedsGained"
      :is-visible="showOfflineMessage" type="success" :auto-close="false" @dismiss="dismissOfflineMessage" />

    <router-view />
    <PWAUpdateNotification ref="pwaUpdateNotificationRef" @update="handleUpdate" />

    <!-- Offline Progress Modal -->
    <OfflineProgressModal />
  </div>
</template>

<style>
/* Global styles for dark mode transitions */
* {
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

/* Subtle grain texture for farm feel */
.bg-amber-50 {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23a16207' fill-opacity='0.03' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E");
}

/* Dark mode grain texture */
.dark .bg-gray-900 {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23fbbf24' fill-opacity='0.03' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E");
}
</style>
