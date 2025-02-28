<script setup lang="ts">
import { ref, defineProps } from 'vue'
import { useCoreStore } from '@/stores/coreStore'
import { useFarmStore } from '@/stores/farmStore'
import { useMachineStore } from '@/stores/machineStore'
import { useTickStore } from '@/stores/tickStore'
import { usePersistenceStore } from '@/stores/persistenceStore'
import Decimal from 'break_infinity.js'
import { formatDecimal } from '@/utils/formatting'
import { formatTime } from '@/utils/time-formatting'
import HoldButton from './HoldButton.vue'

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

// Debug controls
const newTickDuration = ref<number>(tickStore.tickDuration)

// Collapsible sections state
const showDebugControls = ref<boolean>(true)
const showPersistenceControls = ref<boolean>(true)
const showFarmDetails = ref<boolean>(true)

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
  <!-- Compact version for header -->
  <div v-if="isCompact" class="mt-2 p-2 bg-yellow-800 rounded">
    <div class="flex items-center justify-between">
      <div class="text-sm font-bold">DEBUG MODE</div>
      <div class="flex items-center">
        <HoldButton @click="coreStore.toggleDebugMode" variant="warning" size="sm" class="mr-2">
          Disable Debug
        </HoldButton>
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
  <div v-else class="bg-yellow-50 border-yellow-200 border p-4 rounded-lg mb-4">
    <div class="flex justify-between items-center mb-2">
      <h3 class="font-bold text-yellow-800">Debug Panel</h3>
      <div class="flex items-center">
        <HoldButton @click="coreStore.toggleDebugMode" variant="warning" size="sm" class="mr-2">
          Disable Debug
        </HoldButton>
        <button @click="showDebugControls = !showDebugControls" class="text-yellow-700 hover:text-yellow-900">
          {{ showDebugControls ? '▼' : '►' }}
        </button>
      </div>
    </div>

    <div v-if="showDebugControls">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <div class="mb-2">
            <div class="flex justify-between text-sm mb-1">
              <span>Next Tick:</span>
              <span>{{ formatTime(tickStore.secondsUntilNextTick) }}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-green-600 h-2 rounded-full" :style="{ width: `${tickStore.tickProgress}%` }">
              </div>
            </div>
          </div>

          <div class="mb-2">
            <div class="flex justify-between text-sm">
              <span>Current Seeds:</span>
              <span>{{ formatDecimal(coreStore.seeds) }}</span>
            </div>
          </div>

          <div class="mb-2">
            <div class="flex justify-between text-sm">
              <span>Total Ticks:</span>
              <span>{{ coreStore.tickCounter }}</span>
            </div>
          </div>

          <div class="mb-2">
            <div class="flex justify-between text-sm">
              <span>Farm 1 Multiplier:</span>
              <span>{{ ((coreStore.multipliers['farm1'] || 1) * 100).toFixed(0) }}%</span>
            </div>
          </div>

          <div class="mb-2">
            <div class="flex justify-between text-sm">
              <span>Farm 2 Multiplier:</span>
              <span>{{ ((coreStore.multipliers['farm2'] || 1) * 100).toFixed(0) }}%</span>
            </div>
          </div>

          <div class="mb-2">
            <div class="flex justify-between text-sm">
              <span>Manual Purchases:</span>
              <span>{{ machineStore.totalManualPurchases }}</span>
            </div>
          </div>

          <div class="mb-2">
            <div class="flex justify-between text-sm">
              <span>Seeds Per Tick:</span>
              <span>{{ formatDecimal(farmStore.calculateTotalSeedsPerTick()) }}</span>
            </div>
          </div>

          <div class="flex space-x-2 mb-4">
            <div class="flex-1">
              <label class="block text-sm mb-1">Tick Duration (s)</label>
              <div class="flex">
                <input v-model="newTickDuration" type="number" min="0.1" step="0.1"
                  class="w-full border rounded px-2 py-1 text-sm" />
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
          <h4 class="font-semibold text-sm mb-2">Farm Cost Details</h4>
          <div class="text-xs mb-2">
            <p>Farm Cost Formula: Base Cost × (Cost Base + Cost Linear × Purchased)^(Purchased × Scaling)
            </p>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs">
            <div v-for="farm in farmStore.farms" :key="farm.id" class="border rounded p-2">
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

    <!-- Persistence Settings Section -->
    <div class="mt-4 p-3 bg-yellow-100 rounded">
      <div class="flex items-center justify-between mb-2">
        <div class="font-semibold text-sm">Persistence Settings</div>
        <button @click="toggleSection('persistence')"
          class="text-xs bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded text-white">
          {{ showPersistenceControls ? '▼' : '►' }}
        </button>
      </div>

      <div v-if="showPersistenceControls" class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        <div class="flex items-center">
          <span class="mr-2">Auto-Save:</span>
          <HoldButton @click="persistenceStore.toggleAutoSave"
            :variant="persistenceStore.autoSaveEnabled ? 'primary' : 'danger'" size="sm">
            {{ persistenceStore.autoSaveEnabled ? 'Enabled' : 'Disabled' }}
          </HoldButton>
        </div>

        <div class="flex items-center">
          <span class="mr-2">Offline Progress:</span>
          <HoldButton @click="persistenceStore.toggleOfflineProgress"
            :variant="persistenceStore.offlineProgressEnabled ? 'primary' : 'danger'" size="sm">
            {{ persistenceStore.offlineProgressEnabled ? 'Enabled' : 'Disabled' }}
          </HoldButton>
        </div>

        <div>
          <span>Last Save: {{ formatTimestamp(persistenceStore.lastSaveTime) }}</span>
        </div>

        <div>
          <span>Last Load: {{ formatTimestamp(persistenceStore.lastLoadTime) }}</span>
        </div>

        <div class="col-span-1 md:col-span-2 mt-2 flex space-x-2">
          <HoldButton @click="persistenceStore.saveGame" variant="secondary" class="flex-1">
            Save Game
          </HoldButton>
          <HoldButton @click="persistenceStore.loadGame" variant="secondary" class="flex-1">
            Load Game
          </HoldButton>
          <HoldButton @click="persistenceStore.resetSaveData" variant="danger" class="flex-1">
            Reset Save Data
          </HoldButton>
        </div>
      </div>
    </div>
  </div>
</template>
