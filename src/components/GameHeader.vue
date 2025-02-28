<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { usePersistenceStore } from '@/stores/persistenceStore'
import Decimal from 'break_infinity.js'
import { formatDecimal } from '@/utils/formatting'

const gameStore = useGameStore()
const persistenceStore = usePersistenceStore()

// Debug controls
const newTickDuration = ref<number>(gameStore.tickDuration)

// Collapsible sections state
const showDebugControls = ref<boolean>(true)
const showPersistenceControls = ref<boolean>(true)
const showFarmDetails = ref<boolean>(true)

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

// Reset tick counter for debugging
const resetTicks = () => {
  gameStore.resetTickCounter()
}

// Format a timestamp to a readable date/time
const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString()
}

// Toggle section visibility
const toggleSection = (section: 'debug' | 'persistence' | 'farms') => {
  if (section === 'debug') {
    showDebugControls.value = !showDebugControls.value
  } else if (section === 'persistence') {
    showPersistenceControls.value = !showPersistenceControls.value
  } else if (section === 'farms') {
    showFarmDetails.value = !showFarmDetails.value
  }
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
          <div class="flex justify-end items-center">
            <div class="text-xs mr-4">Ticks: {{ gameStore.tickCounter }}</div>
            <div>
              <div class="text-sm">Seeds:</div>
              <div class="text-xl font-bold">{{ formatDecimal(gameStore.seeds) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Debug Controls (only visible in debug mode) -->
      <div v-if="gameStore.isDebugMode" class="mt-4 p-2 bg-yellow-800 rounded">
        <div class="flex items-center justify-between">
          <div class="text-sm font-bold">DEBUG MODE</div>
          <div class="flex items-center">
            <button @click="gameStore.toggleDebugMode"
              class="text-xs bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded mr-2">
              Disable Debug
            </button>
            <button @click="toggleSection('debug')"
              class="text-xs bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded flex items-center">
              {{ showDebugControls ? '▼' : '►' }} Controls
            </button>
          </div>
        </div>

        <!-- Debug Controls Section -->
        <div v-if="showDebugControls" class="flex flex-wrap items-center mt-2">
          <div class="flex items-center mr-4 mb-2">
            <label class="text-sm mr-2">Tick Duration (seconds):</label>
            <input v-model.number="newTickDuration" type="number" min="0.1" step="0.1"
              class="w-16 px-2 py-1 text-black rounded" />
            <button @click="applyTickDuration" class="ml-2 text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded">
              Apply
            </button>
          </div>

          <div class="flex items-center mr-4 mb-2">
            <span class="text-sm mr-2">Ticks: {{ gameStore.tickCounter }}</span>
            <button @click="resetTicks" class="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded">
              Reset Ticks
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
            <button @click="addSeeds(1000000)" class="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded mr-2">
              +1M Seeds
            </button>
            <button @click="addSeeds(1000000000)" class="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded">
              +1B Seeds
            </button>
          </div>
        </div>

        <!-- Persistence Debug Controls -->
        <div class="mt-2 p-2 bg-yellow-900 rounded">
          <div class="flex items-center justify-between">
            <div class="text-sm font-bold">Persistence Settings</div>
            <button @click="toggleSection('persistence')"
              class="text-xs bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded">
              {{ showPersistenceControls ? '▼' : '►' }}
            </button>
          </div>

          <div v-if="showPersistenceControls" class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mt-2">
            <div class="flex items-center">
              <span class="mr-2">Auto-Save:</span>
              <button @click="persistenceStore.toggleAutoSave"
                :class="persistenceStore.autoSaveEnabled ? 'bg-green-600' : 'bg-red-600'" class="px-2 py-1 rounded">
                {{ persistenceStore.autoSaveEnabled ? 'Enabled' : 'Disabled' }}
              </button>
            </div>

            <div class="flex items-center">
              <span class="mr-2">Offline Progress:</span>
              <button @click="persistenceStore.toggleOfflineProgress"
                :class="persistenceStore.offlineProgressEnabled ? 'bg-green-600' : 'bg-red-600'"
                class="px-2 py-1 rounded">
                {{ persistenceStore.offlineProgressEnabled ? 'Enabled' : 'Disabled' }}
              </button>
            </div>

            <div>
              <span>Last Save: {{ formatTimestamp(persistenceStore.lastSaveTime) }}</span>
            </div>

            <div>
              <span>Last Load: {{ formatTimestamp(persistenceStore.lastLoadTime) }}</span>
            </div>

            <div class="col-span-1 md:col-span-2 mt-2">
              <button @click="persistenceStore.saveGame" class="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded mr-2">
                Save Game
              </button>
              <button @click="persistenceStore.loadGame" class="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded mr-2">
                Load Game
              </button>
              <button @click="persistenceStore.resetSaveData" class="bg-red-600 hover:bg-red-700 px-2 py-1 rounded">
                Reset Save Data
              </button>
            </div>
          </div>
        </div>

        <!-- Farm Details Section -->
        <div class="mt-2 text-xs">
          <div class="flex items-center justify-between">
            <div class="font-bold">Farm Cost Formula: multiplier * (base + linear*x)^(x*(1+scaling))</div>
            <button @click="toggleSection('farms')" class="text-xs bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded">
              {{ showFarmDetails ? '▼' : '►' }}
            </button>
          </div>

          <div v-if="showFarmDetails" class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            <div v-for="(farm, index) in gameStore.farms" :key="farm.id" class="bg-yellow-900 p-2 rounded">
              <div class="font-bold">{{ farm.name }}</div>
              <div class="grid grid-cols-2 gap-x-2 text-xs">
                <div>Manually Purchased:</div>
                <div>{{ formatDecimal(farm.manuallyPurchased) }}</div>

                <div>Base Multiplier:</div>
                <div>{{ farm.costMultiplier }}</div>

                <div>Base Value:</div>
                <div>{{ farm.costBase }}</div>

                <div>Linear Factor:</div>
                <div>{{ farm.costLinear }}</div>

                <div>Threshold:</div>
                <div>{{ farm.costThreshold1 }}</div>

                <div>Scaling Factor:</div>
                <div>1/{{ farm.costScalingFactor1 }}</div>

                <div class="font-bold">Next Cost:</div>
                <div class="font-bold">{{ formatDecimal(gameStore.calculateFarmCost(index)) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
