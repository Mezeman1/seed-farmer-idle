<script setup lang="ts">
import { ref, defineProps } from 'vue'
import { useCoreStore } from '@/stores/coreStore'
import { useFarmStore } from '@/stores/farmStore'
import { useMachineStore } from '@/stores/machineStore'
import { useTickStore } from '@/stores/tickStore'
import { usePersistenceStore } from '@/stores/persistenceStore'
import { useSeasonStore } from '@/stores/seasonStore'
import Decimal from 'break_infinity.js'
import { formatDecimal } from '@/utils/formatting'
import { formatTime } from '@/utils/time-formatting'
import HoldButton from './HoldButton.vue'
import { AUTO_SAVE_INTERVAL } from '@/stores/persistenceStore'

// Props
const props = defineProps({
  // If true, this is the compact version for the header
  isCompact: {
    type: Boolean,
    default: false
  }
})

const coreStore = useCoreStore()
const farmStore = useFarmStore()
const machineStore = useMachineStore()
const tickStore = useTickStore()
const persistenceStore = usePersistenceStore()
const seasonStore = useSeasonStore()

// Debug controls
const newTickDuration = ref<number>(tickStore.tickDuration)

// Collapsible sections state
const showDebugControls = ref<boolean>(true)
const showPersistenceControls = ref<boolean>(true)
const showFarmDetails = ref<boolean>(true)
const showGameStats = ref<boolean>(true)

// Apply new tick duration
const applyTickDuration = () => {
  tickStore.setTickDuration(newTickDuration.value)
}

// Add seeds for debugging
const addSeeds = (amount: number) => {
  coreStore.addSeeds(new Decimal(amount))
}

// Reset tick counter for debugging
const resetTicks = () => {
  coreStore.resetTickCounter()
}

// Format a timestamp to a readable date/time
const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString()
}

// Toggle section visibility
const toggleSection = (section: 'debug' | 'persistence' | 'farms' | 'stats') => {
  if (section === 'debug') {
    showDebugControls.value = !showDebugControls.value
  } else if (section === 'persistence') {
    showPersistenceControls.value = !showPersistenceControls.value
  } else if (section === 'farms') {
    showFarmDetails.value = !showFarmDetails.value
  } else if (section === 'stats') {
    showGameStats.value = !showGameStats.value
  }
}
</script>

<template>
  <!-- Compact version for header -->
  <div v-if="isCompact" class="mt-2 p-2 bg-yellow-800 dark:bg-yellow-900 text-white rounded">
    <div class="flex items-center justify-between">
      <div class="text-sm font-bold">DEBUG MODE</div>
      <div class="flex items-center">
        <HoldButton @click="coreStore.toggleDebugMode" variant="warning" size="sm" class="mr-2">
          Disable Debug
        </HoldButton>
        <button @click="toggleSection('debug')"
          class="text-xs bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-600 px-2 py-1 rounded flex items-center transition-colors">
          {{ showDebugControls ? '▼' : '►' }} Controls
        </button>
      </div>
    </div>

    <!-- Debug Controls Section -->
    <div v-if="showDebugControls" class="flex flex-wrap items-center mt-2">
      <div class="flex items-center mr-4 mb-2">
        <label class="text-sm mr-2">Tick Duration (seconds):</label>
        <input v-model.number="newTickDuration" type="number" min="0.1" step="0.1"
          class="w-16 px-2 py-1 text-black dark:text-white dark:bg-gray-700 rounded" />
        <HoldButton @click="applyTickDuration" variant="secondary" size="sm" class="ml-2">
          Apply
        </HoldButton>
      </div>

      <div class="flex items-center mr-4 mb-2">
        <span class="text-sm mr-2">Ticks: {{ coreStore.tickCounter }}</span>
        <HoldButton @click="resetTicks" variant="danger" size="sm">
          Reset Ticks
        </HoldButton>
      </div>

      <div class="flex items-center mb-2">
        <HoldButton @click="() => addSeeds(100)" variant="primary" size="sm" class="mr-2">
          +100 Seeds
        </HoldButton>
        <HoldButton @click="() => addSeeds(1000)" variant="primary" size="sm" class="mr-2">
          +1K Seeds
        </HoldButton>
        <HoldButton @click="() => addSeeds(10000)" variant="primary" size="sm" class="mr-2">
          +10K Seeds
        </HoldButton>
        <HoldButton @click="() => addSeeds(1000000)" variant="primary" size="sm" class="mr-2">
          +1M Seeds
        </HoldButton>
        <HoldButton @click="() => addSeeds(1000000000)" variant="primary" size="sm">
          +1B Seeds
        </HoldButton>
      </div>
    </div>
  </div>

  <!-- Full version for main page -->
  <div v-else
    class="bg-yellow-50 dark:bg-gray-800 border-yellow-200 dark:border-yellow-900/30 border p-4 rounded-lg mb-4">
    <div class="flex justify-between items-center mb-2">
      <h3 class="font-bold text-yellow-800 dark:text-yellow-400">Debug Panel</h3>
      <div class="flex items-center">
        <HoldButton @click="coreStore.toggleDebugMode" variant="warning" size="sm" class="mr-2">
          Disable Debug
        </HoldButton>
        <button @click="showDebugControls = !showDebugControls"
          class="text-yellow-700 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 transition-colors">
          {{ showDebugControls ? '▼' : '►' }}
        </button>
      </div>
    </div>

    <div v-if="showDebugControls">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <div class="mb-2">
            <div class="flex justify-between text-sm mb-1 text-gray-700 dark:text-gray-300">
              <span>Next Tick:</span>
              <span>{{ formatTime(tickStore.secondsUntilNextTick) }}</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div class="bg-green-600 dark:bg-green-500 h-2 rounded-full"
                :style="{ width: `${tickStore.tickProgress}%` }">
              </div>
            </div>
          </div>

          <div class="mb-2">
            <div class="flex justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>Current Seeds:</span>
              <span>{{ formatDecimal(coreStore.seeds) }}</span>
            </div>
          </div>

          <div class="mb-2">
            <div class="flex justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>Total Ticks:</span>
              <span>{{ coreStore.tickCounter }}</span>
            </div>
          </div>

          <div class="mb-2">
            <div class="flex justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>Farm 1 Multiplier:</span>
              <span>{{ ((coreStore.multipliers['farm1'] || 1) * 100).toFixed(0) }}%</span>
            </div>
          </div>

          <div class="mb-2">
            <div class="flex justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>Farm 2 Multiplier:</span>
              <span>{{ ((coreStore.multipliers['farm2'] || 1) * 100).toFixed(0) }}%</span>
            </div>
          </div>

          <div class="mb-2">
            <div class="flex justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>Manual Purchases:</span>
              <span>{{ machineStore.totalManualPurchases }}</span>
            </div>
          </div>

          <div class="mb-2">
            <div class="flex justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>Seeds Per Tick:</span>
              <span>{{ formatDecimal(farmStore.calculateTotalSeedsPerTick()) }}</span>
            </div>
          </div>

          <div class="flex space-x-2 mb-4">
            <div class="flex-1">
              <label class="block text-sm mb-1 text-gray-700 dark:text-gray-300">Tick Duration (s)</label>
              <div class="flex">
                <input v-model="newTickDuration" type="number" min="0.1" step="0.1"
                  class="w-full border dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-700 dark:text-white" />
                <HoldButton @click="applyTickDuration" variant="secondary" class="ml-2">
                  Apply
                </HoldButton>
              </div>
            </div>
          </div>

          <div class="flex space-x-2">
            <HoldButton @click="() => addSeeds(100)" variant="primary" class="flex-1">
              +100 Seeds
            </HoldButton>
            <HoldButton @click="() => addSeeds(1000)" variant="primary" class="flex-1">
              +1K Seeds
            </HoldButton>
            <HoldButton @click="() => addSeeds(1000000)" variant="primary" class="flex-1">
              +1M Seeds
            </HoldButton>
          </div>

          <div class="mt-2">
            <HoldButton @click="resetTicks" variant="danger" :full-width="true">
              Reset Tick Counter
            </HoldButton>
          </div>
        </div>

        <!-- Farm Cost Details -->
        <div>
          <h4 class="font-semibold text-sm mb-2 text-gray-800 dark:text-gray-200">Farm Cost Details</h4>
          <div class="text-xs mb-2 text-gray-700 dark:text-gray-300">
            <p>Farm Cost Formula: Base Cost × (Cost Base + Cost Linear × Purchased)^(Purchased × Scaling)
            </p>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs">
            <div v-for="farm in farmStore.farms" :key="farm.id"
              class="border dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              <div class="font-semibold">{{ farm.name }}</div>
              <div>Base Cost: {{ farm.costMultiplier }}</div>
              <div>Cost Base: {{ farm.costBase }}</div>
              <div>Cost Linear: {{ farm.costLinear }}</div>
              <div>Purchased: {{ farm.manuallyPurchased.toString() }}</div>
              <div>Total Owned: {{ farm.totalOwned.toString() }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Game Statistics Section -->
    <div class="mt-4">
      <div class="flex justify-between items-center mb-2">
        <h3 class="font-bold text-yellow-800 dark:text-yellow-400">Game Statistics</h3>
        <button @click="toggleSection('stats')"
          class="text-yellow-700 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 transition-colors">
          {{ showGameStats ? '▼' : '►' }}
        </button>
      </div>

      <div v-if="showGameStats" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <div class="mb-2">
            <div class="flex justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>Total Harvests Completed:</span>
              <span>{{ seasonStore.totalHarvestsCompleted.toString() }}</span>
            </div>
          </div>

          <div class="mb-2">
            <div class="flex justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>Current Season:</span>
              <span>{{ seasonStore.currentSeason.toString() }}</span>
            </div>
          </div>

          <div class="mb-2">
            <div class="flex justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>Total Prestige Points:</span>
              <span>{{ seasonStore.totalPrestigePoints.toString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Persistence Settings Section -->
    <div class="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded">
      <div class="flex items-center justify-between mb-2">
        <div class="font-semibold text-sm text-yellow-800 dark:text-yellow-400">Persistence Settings</div>
        <button @click="toggleSection('persistence')"
          class="text-yellow-700 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 transition-colors">
          {{ showPersistenceControls ? '▼' : '►' }}
        </button>
      </div>

      <div v-if="showPersistenceControls" class="text-sm text-gray-700 dark:text-gray-300">
        <div class="mb-2">
          <div class="flex justify-between">
            <span>Last Save:</span>
            <span>{{ formatTimestamp(persistenceStore.lastSaveTime) }}</span>
          </div>
        </div>

        <div class="mb-2">
          <div class="flex justify-between">
            <span>Auto-Save Interval:</span>
            <span>{{ AUTO_SAVE_INTERVAL / 1000 }} seconds</span>
          </div>
        </div>

        <div class="flex space-x-2 mt-3">
          <HoldButton @click="persistenceStore.saveGame" variant="primary" class="flex-1">
            Save Game
          </HoldButton>
          <HoldButton @click="persistenceStore.loadGame" variant="secondary" class="flex-1">
            Load Game
          </HoldButton>
        </div>
      </div>
    </div>
  </div>
</template>
