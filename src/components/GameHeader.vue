<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import Decimal from 'break_infinity.js'
import { formatDecimal } from '@/utils/formatting'

const gameStore = useGameStore()

// Debug controls
const newTickDuration = ref<number>(gameStore.tickDuration)

// Update tick timer every 100ms
let intervalId: number | null = null

onMounted(() => {
  intervalId = window.setInterval(() => {
    gameStore.updateTickTimer()
  }, 100)
})

onUnmounted(() => {
  if (intervalId !== null) {
    clearInterval(intervalId)
  }
})

// Apply new tick duration
const applyTickDuration = () => {
  gameStore.setTickDuration(newTickDuration.value)
}

// Add seeds for debugging
const addSeeds = (amount: number) => {
  gameStore.seeds = gameStore.seeds.add(new Decimal(amount))
}
</script>

<template>
  <header class="sticky top-0 bg-green-800 text-white p-4 shadow-md z-10">
    <div class="container mx-auto">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <h1 class="text-xl font-bold mb-2 md:mb-0">Seed Farmer</h1>

        <div class="flex flex-col w-full md:w-auto">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm mr-2">Next Tick:</span>
            <span class="text-sm">{{ gameStore.secondsUntilNextTick }}s</span>
          </div>

          <div class="w-full md:w-64 bg-green-900 rounded-full h-2.5">
            <div class="bg-green-500 h-2.5 rounded-full transition-all duration-100"
              :style="{ width: `${gameStore.tickProgress}%` }"></div>
          </div>
        </div>

        <div class="mt-3 md:mt-0 text-center md:text-right">
          <div class="text-sm">Seeds:</div>
          <div class="text-xl font-bold">{{ formatDecimal(gameStore.seeds) }}</div>
        </div>
      </div>

      <!-- Debug Controls (only visible in debug mode) -->
      <div v-if="gameStore.isDebugMode" class="mt-4 p-2 bg-yellow-800 rounded">
        <div class="flex items-center justify-between">
          <div class="text-sm font-bold">DEBUG MODE</div>
          <button @click="gameStore.toggleDebugMode"
            class="text-xs bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded">
            Disable Debug
          </button>
        </div>

        <div class="flex flex-wrap items-center mt-2">
          <div class="flex items-center mr-4 mb-2">
            <label class="text-sm mr-2">Tick Duration (seconds):</label>
            <input v-model.number="newTickDuration" type="number" min="0.1" step="0.1"
              class="w-16 px-2 py-1 text-black rounded" />
            <button @click="applyTickDuration" class="ml-2 text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded">
              Apply
            </button>
          </div>

          <div class="flex items-center mb-2">
            <button @click="addSeeds(100)" class="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded mr-2">
              +100 Seeds
            </button>
            <button @click="addSeeds(1000)" class="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded mr-2">
              +1K Seeds
            </button>
            <button @click="addSeeds(10000)" class="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded mr-2">
              +10K Seeds
            </button>
            <button @click="addSeeds(1000000)" class="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded">
              +1M Seeds
            </button>
          </div>
        </div>

        <div class="mt-2 text-xs">
          <div class="font-bold mb-1">Farm Cost Formula: Base Cost ^ (Purchased + 1)</div>
          <div class="grid grid-cols-2 gap-2">
            <div v-for="(farm, index) in gameStore.farms" :key="farm.id" class="bg-yellow-900 p-1 rounded">
              <div class="font-bold">{{ farm.name }}</div>
              <div>Base Cost: {{ formatDecimal(farm.baseCost) }}</div>
              <div>Manually Purchased: {{ formatDecimal(farm.manuallyPurchased) }}</div>
              <div>Next Cost: {{ formatDecimal(gameStore.calculateFarmCost(index)) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
