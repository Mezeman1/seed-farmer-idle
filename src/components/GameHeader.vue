<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useCoreStore } from '@/stores/coreStore'
import { useTickStore } from '@/stores/tickStore'
import { useFarmStore } from '@/stores/farmStore'
import { formatDecimal } from '@/utils/formatting'
import DebugPanel from '@/components/DebugPanel.vue'
import { formatTime } from '@/utils/time-formatting'

const coreStore = useCoreStore()
const tickStore = useTickStore()
const farmStore = useFarmStore()

// Collapsible sections state
const showDebugPanel = ref<boolean>(false) // Start with debug panel collapsed

// Computed property for seeds per tick
const seedsPerTick = computed(() => {
  return farmStore.calculateTotalSeedsPerTick()
})

// Update tick timer every 100ms
let intervalId: number | null = null

onMounted(() => {
  intervalId = window.setInterval(() => {
    tickStore.updateTickTimer()
  }, 100)
})

onUnmounted(() => {
  if (intervalId !== null) {
    clearInterval(intervalId)
  }
})
</script>

<template>
  <header
    class="sticky top-0 bg-amber-50 dark:bg-gray-800 text-amber-900 dark:text-amber-100 p-3 shadow-sm z-10 border-b-2 border-amber-200 dark:border-amber-900/30">
    <div class="container mx-auto">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <h1 class="text-xl font-bold mb-2 md:mb-0 flex items-center">
          <span class="mr-2">🌱</span> Seed Farmer
        </h1>

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

      <!-- Debug Mode Toggle Button -->
      <div class="flex justify-end mt-2 space-x-2">
        <button v-if="coreStore.isDebugMode" @click="showDebugPanel = !showDebugPanel"
          class="text-xs bg-amber-200 hover:bg-amber-300 dark:bg-amber-800/50 dark:hover:bg-amber-800/70 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-md flex items-center transition-colors">
          <span class="mr-1">🛠️</span> {{ showDebugPanel ? 'Hide Debug' : 'Show Debug' }}
        </button>
      </div>

      <!-- Debug Panel Component -->
      <DebugPanel v-if="coreStore.isDebugMode && showDebugPanel" :isCompact="true" />
    </div>
  </header>
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
