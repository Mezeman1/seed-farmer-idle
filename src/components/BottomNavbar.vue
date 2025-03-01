<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const activeTab = ref('home')

// Initialize active tab based on current route
onMounted(() => {
  if (route.path === '/machines') {
    activeTab.value = 'machines'
  } else if (route.path === '/seasons') {
    activeTab.value = 'seasons'
  } else {
    activeTab.value = 'home'
  }
})

// Navigate to a tab
const navigateTo = (tab: string) => {
  // If already on this tab, do nothing
  if (activeTab.value === tab) return

  activeTab.value = tab

  if (tab === 'home') {
    router.replace('/') // Use replace instead of push to avoid history stacking
  } else if (tab === 'machines') {
    router.replace('/machines') // Use replace instead of push to avoid history stacking
  } else if (tab === 'seasons') {
    router.replace('/seasons') // Use replace instead of push to avoid history stacking
  }
}
</script>

<template>
  <!-- Bottom Navigation Bar -->
  <nav
    class="fixed bottom-0 left-0 right-0 bg-amber-50 dark:bg-gray-800 text-amber-900 dark:text-amber-100 border-t-2 border-amber-200 dark:border-amber-900/30 shadow-sm z-20">
    <div class="flex justify-around items-center h-16">
      <!-- Home Button -->
      <button @click="navigateTo('home')"
        :class="['flex flex-col items-center justify-center w-1/3 h-full transition-colors',
          activeTab === 'home' ? 'bg-amber-100 dark:bg-amber-900/30 text-green-700 dark:text-green-400' : 'hover:bg-amber-100 dark:hover:bg-amber-900/20']">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span class="text-xs mt-1 font-medium">Farms</span>
      </button>

      <!-- Machines Button -->
      <button @click="navigateTo('machines')"
        :class="['flex flex-col items-center justify-center w-1/3 h-full transition-colors',
          activeTab === 'machines' ? 'bg-amber-100 dark:bg-amber-900/30 text-green-700 dark:text-green-400' : 'hover:bg-amber-100 dark:hover:bg-amber-900/20']">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span class="text-xs mt-1 font-medium">Machines</span>
      </button>

      <!-- Seasons Button -->
      <button @click="navigateTo('seasons')"
        :class="['flex flex-col items-center justify-center w-1/3 h-full transition-colors',
          activeTab === 'seasons' ? 'bg-amber-100 dark:bg-amber-900/30 text-green-700 dark:text-green-400' : 'hover:bg-amber-100 dark:hover:bg-amber-900/20']">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <span class="text-xs mt-1 font-medium">Seasons</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
/* Add some padding to the bottom of the page to account for the navbar */
:deep(body) {
  padding-bottom: 4rem;
}

/* Subtle grain texture for farm feel */
nav {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23a16207' fill-opacity='0.05' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E");
}

/* Dark mode grain texture */
:global(.dark) nav {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23fbbf24' fill-opacity='0.05' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E");
}
</style>
