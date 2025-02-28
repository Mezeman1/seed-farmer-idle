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
  <header class="sticky top-0 bg-green-800 text-white p-4 shadow-md z-10">
    <div class="container mx-auto">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <h1 class="text-xl font-bold mb-2 md:mb-0">Seed Farmer</h1>

        <div class="flex flex-col w-full md:w-auto">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm mr-2">Next Tick:</span>
            <span class="text-sm">{{ formatTime(tickStore.secondsUntilNextTick) }}</span>
          </div>

          <div class="w-full md:w-64 bg-green-900 rounded-full h-2.5">
            <div class="bg-green-500 h-2.5 rounded-full transition-all duration-100"
              :style="{ width: `${tickStore.tickProgress}%` }"></div>
          </div>
        </div>

        <div class="mt-3 md:mt-0 text-center md:text-right">
          <div class="flex justify-end items-center">
            <div class="text-xs mr-4">
              <div>Ticks: {{ coreStore.tickCounter }}</div>
              <div>Per Tick: {{ formatDecimal(seedsPerTick) }}</div>
            </div>
            <div>
              <div class="text-sm">Seeds:</div>
              <div class="text-xl font-bold">{{ formatDecimal(coreStore.seeds) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Debug Mode Toggle Button (small and unobtrusive) -->
      <div v-if="coreStore.isDebugMode" class="flex justify-end mt-2">
        <button @click="showDebugPanel = !showDebugPanel"
          class="text-xs bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded flex items-center">
          <span class="mr-1">🛠️</span> {{ showDebugPanel ? 'Hide Debug' : 'Show Debug' }}
        </button>
      </div>

      <!-- Debug Panel Component -->
      <DebugPanel v-if="coreStore.isDebugMode && showDebugPanel" :isCompact="true" />
    </div>
  </header>
</template>
