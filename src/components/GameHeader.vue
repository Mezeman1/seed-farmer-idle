<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from 'vue'
import { useCoreStore } from '@/stores/coreStore'
import { useTickStore } from '@/stores/tickStore'
import { useFarmStore } from '@/stores/farmStore'
import { formatDecimal } from '@/utils/formatting'
import { formatTime } from '@/utils/time-formatting'
import SettingsPanel from './SettingsPanel.vue'
import DebugPanel from './DebugPanel.vue'

const coreStore = useCoreStore()
const tickStore = useTickStore()
const farmStore = useFarmStore()
const showSettingsDialog = ref(false)
const showDebugDialog = ref(false)

// Computed property for seeds per tick
const seedsPerTick = computed(() => {
  return farmStore.calculateTotalSeedsPerTick()
})

// Update tick timer every 100ms
let intervalId: number | null = null

onMounted(() => {
  intervalId = window.setInterval(() => {
    tickStore.updateTickTimer()
  }, 100) // 100ms interval
})

onUnmounted(() => {
  if (intervalId !== null) {
    clearInterval(intervalId)
  }
})

// Close settings panel
const closeSettings = () => {
  showSettingsDialog.value = false
}

// Close debug panel
const closeDebug = () => {
  showDebugDialog.value = false
}
</script>

<template>
  <header
    class="sticky top-0 bg-amber-50 dark:bg-gray-800 text-amber-900 dark:text-amber-100 p-3 shadow-sm z-10 border-b-2 border-amber-200 dark:border-amber-900/30">
    <div class="container mx-auto">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <div class="flex items-center justify-between w-full md:w-auto mb-2 md:mb-0">
          <h1 class="text-xl font-bold flex items-center">
            <span class="mr-2">🌱</span> Seed Farmer
          </h1>

          <div class="flex items-center">
            <!-- Debug Button (only visible in debug mode) -->
            <button v-if="coreStore.isDebugMode" @click="showDebugDialog = true"
              class="p-2 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </button>

            <!-- Settings Button -->
            <button @click="showSettingsDialog = true"
              class="md:ml-4 p-2 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex flex-col w-full md:w-auto mx-4">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm mr-2 text-amber-800 dark:text-amber-200 font-medium">Growth Cycle:</span>
            <span class="text-sm font-mono dark:text-amber-200">{{ formatTime(tickStore.secondsUntilNextTick) }}</span>
          </div>

          <div class="w-full md:w-64 bg-amber-100 dark:bg-amber-900/30 rounded-full h-2 overflow-hidden">
            <div
              class="bg-gradient-to-r from-green-500 to-green-400 dark:from-green-600 dark:to-green-500 h-2 rounded-full transition-all duration-100"
              :style="{ width: `${tickStore.tickProgress}%` }"></div>
          </div>
        </div>

        <div class="mt-3 md:mt-0 text-center md:text-right">
          <div class="flex justify-end items-center">
            <div class="text-xs mr-4 text-amber-800 dark:text-amber-200">
              <div class="flex items-center"><span class="w-14">Cycles:</span> <span class="font-medium">{{
                coreStore.tickCounter }}</span></div>
              <div class="flex items-center"><span class="w-14">Yield:</span> <span class="font-medium">{{
                formatDecimal(seedsPerTick) }}</span></div>
            </div>
            <div class="bg-amber-100 dark:bg-amber-900/30 px-3 py-2 rounded-lg">
              <div class="text-sm text-amber-800 dark:text-amber-200">Seeds:</div>
              <div class="text-xl font-bold">{{ formatDecimal(coreStore.seeds) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Settings Panel Component -->
  <SettingsPanel v-if="showSettingsDialog" :onClose="closeSettings" />

  <!-- Debug Panel Component (with slide-down animation) -->
  <div v-if="showDebugDialog && coreStore.isDebugMode" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-30" @click="closeDebug">
    <div class="absolute top-0 left-0 right-0 bg-amber-50 dark:bg-gray-800 rounded-b-xl p-4 transform transition-transform duration-300 max-h-[90vh] overflow-y-auto"
        @click.stop>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold text-amber-900 dark:text-amber-100">Debug Panel</h2>
        <button @click="closeDebug"
            class="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
      </div>

      <!-- Use the compact version of DebugPanel -->
      <DebugPanel :isCompact="true" />
    </div>
  </div>
</template>

<style scoped>
/* Subtle grain texture for farm feel */
header {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23a16207' fill-opacity='0.05' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E");
}

/* Dark mode grain texture */
:global(.dark) header {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23fbbf24' fill-opacity='0.05' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E");
}
</style>
