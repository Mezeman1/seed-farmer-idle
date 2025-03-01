<script setup lang="ts">
// See vite.config.ts for details about automatic imports
import { registerSW } from 'virtual:pwa-register'
import PWAUpdateNotification from '@/components/PWAUpdateNotification.vue'
import { ref, onMounted } from 'vue'

const route = useRoute()
const pwaUpdateNotificationRef = ref<InstanceType<typeof PWAUpdateNotification> | null>(null)

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
  }
})

// Handle update action
const handleUpdate = () => {
  updateSW()
}

useHead({
  title: () => route.meta.title || 'Seed Farmer - Idle Game',
  meta: [
    {
      property: 'og:title',
      content: () => route.meta.title,
    },
    {
      name: 'twitter:title',
      content: () => route.meta.title,
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
  ],
})
</script>

<template>
  <div class="min-h-screen bg-amber-50 dark:bg-gray-900 transition-colors duration-300">
    <router-view />
    <PWAUpdateNotification ref="pwaUpdateNotificationRef" @update="handleUpdate" />
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
