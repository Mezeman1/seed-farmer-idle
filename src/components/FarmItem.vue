<script setup lang="ts">
import { computed } from 'vue'
import { useFarmStore } from '@/stores/farmStore'
import { useCoreStore } from '@/stores/coreStore'
import { useMachineStore } from '@/stores/machineStore'
import { useSeasonStore } from '@/stores/seasonStore'
import { usePersistenceStore } from '@/stores/persistenceStore'
import type { Farm } from '@/stores/farmStore'
import Decimal from 'break_infinity.js'
import { formatDecimal } from '@/utils/formatting'
import HoldButton from './HoldButton.vue'

const props = defineProps<{
  farmId: number
}>()

const farmStore = useFarmStore()
const coreStore = useCoreStore()
const machineStore = useMachineStore()
const seasonStore = useSeasonStore()
const persistenceStore = usePersistenceStore()

const farm = computed(() => {
  return farmStore.farms[props.farmId]
})

const production = computed(() => {
  return farmStore.calculateProduction(props.farmId)
})

const cost = computed(() => {
  return farmStore.calculateFarmCost(props.farmId)
})

const canAfford = computed(() => {
  return coreStore.seeds.gte(cost.value)
})

// Check if auto-buyer is unlocked for this farm
const hasAutoBuyer = computed(() => {
  // Auto-buyer IDs are 5, 6, 7, 8 for farms 0, 1, 2, 3
  const autoBuyerId = 5 + props.farmId
  return seasonStore.getUpgradeLevel(autoBuyerId) > 0
})

// Get auto-buyer level
const autoBuyerLevel = computed(() => {
  const autoBuyerId = 5 + props.farmId
  return seasonStore.getUpgradeLevel(autoBuyerId)
})

// Auto-purchase enabled state
const isAutoEnabled = computed({
  get: () => {
    return seasonStore.isAutoBuyerEnabled(props.farmId)
  },
  set: (value) => {
    seasonStore.setAutoBuyerEnabled(props.farmId, value)
    persistenceStore.saveGame() // Save the setting
  }
})

const handleBuy = () => {
  if (canAfford.value) {
    farmStore.buyFarm(props.farmId)

    // Force a refresh of the production display
    setTimeout(() => {
      const _ = production.value
    }, 0)
  }
}

const getProductionDescription = (farmId: number): string => {
  const farm = farmStore.farms[farmId]

  // Get the actual production with multipliers
  const actualProduction = farmStore.calculateProduction(farmId)
  const productionAmount = formatDecimal(actualProduction)

  // Get base production without multiplier
  const baseProduction = formatDecimal(farm.baseProduction.mul(farm.totalOwned))

  // Get what this farm produces
  const producesResourceName = farmStore.getProductionResourceName(farmId)

  if (farm.multiplier > 1) {
    return `Produces ${productionAmount} ${producesResourceName} per tick (${baseProduction} × ${(farm.multiplier * 100).toFixed(0)}% multiplier)`
  } else {
    return `Produces ${productionAmount} ${producesResourceName} per tick`
  }
}
</script>

<template>
  <div class="border rounded-lg p-4 mb-4 transition-all duration-200 shadow-sm h-full flex flex-col" :class="[
    farm.owned ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    canAfford && !farm.owned ? 'border-green-400 dark:border-green-500 border-2' : ''
  ]">
    <div class="flex-grow">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-lg font-semibold text-amber-900 dark:text-amber-200 flex items-center">
          <span class="mr-2">🌱</span>{{ farm.name }}
        </h3>
        <div v-if="farm.owned" class="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
          <div
            class="text-xs bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-md font-medium text-center">
            Purchased: {{ formatDecimal(farm.manuallyPurchased) }}
          </div>
          <div
            class="text-xs bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-200 px-2 py-1 rounded-md font-medium text-center">
            Owned: {{ formatDecimal(farm.totalOwned) }}
          </div>
        </div>
      </div>

      <p class="text-sm text-amber-800 dark:text-amber-200 mb-4 bg-amber-100/50 dark:bg-amber-800/30 p-2 rounded-md">
        {{ getProductionDescription(farmId) }}
      </p>

      <!-- Auto-buyer toggle (only shown if auto-buyer is unlocked) -->
      <div v-if="hasAutoBuyer && farm.owned" class="mb-4 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md">
        <div class="text-sm text-blue-800 dark:text-blue-200">
          <span class="font-medium">Auto-Buy</span>
          <span class="text-xs ml-2">(Level {{ autoBuyerLevel }})</span>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" v-model="isAutoEnabled" class="sr-only peer">
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>

    <div class="mt-auto pt-3">
      <HoldButton :disabled="!canAfford" :full-width="true" variant="primary" @click="handleBuy"
        class="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 text-white transition-colors">
        <span class="flex items-center justify-center">
          <span v-if="!farm.owned" class="mr-1">🚜</span>
          <span v-else class="mr-1">⬆️</span>
          Buy ({{ formatDecimal(cost) }} seeds)
        </span>
      </HoldButton>
    </div>
  </div>
</template>

<style scoped>
/* Add subtle hover effect */
div:hover {
  transform: translateY(-1px);
}
</style>
