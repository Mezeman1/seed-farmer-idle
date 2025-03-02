<script setup lang="ts">
import { computed } from 'vue'
import { useFarmStore } from '@/stores/farmStore'
import { useCoreStore } from '@/stores/coreStore'
import { useMachineStore } from '@/stores/machineStore'
import { useSeasonStore } from '@/stores/seasonStore'
import { usePersistenceStore } from '@/stores/persistenceStore'
import { FARMS } from '@/config/farmConfig'
import { formatDecimal } from '@/utils/formatting'
import HoldButton from './HoldButton.vue'

const props = defineProps<{
  farmId: number
}>()

const farmStore = useFarmStore()
const coreStore = useCoreStore()
const seasonStore = useSeasonStore()
const persistenceStore = usePersistenceStore()

const farm = computed(() => {
  return farmStore.farms[props.farmId]
})

// Get the emoji for this farm from the config
const farmEmoji = computed(() => {
  const farmConfig = FARMS.find(f => f.id === props.farmId)
  return farmConfig?.emoji || '🌱' // Default to seedling emoji if not found
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
  // Get the auto-buyer ID from the farm config
  const farmConfig = FARMS.find(f => f.id === props.farmId)
  const autoBuyerId = farmConfig?.autoBuyerConfig.id
  return autoBuyerId ? seasonStore.getUpgradeLevel(autoBuyerId) > 0 : false
})

// Get auto-buyer level
const autoBuyerLevel = computed(() => {
  // Get the auto-buyer ID from the farm config
  const farmConfig = FARMS.find(f => f.id === props.farmId)
  const autoBuyerId = farmConfig?.autoBuyerConfig.id
  return autoBuyerId ? seasonStore.getUpgradeLevel(autoBuyerId) : 0
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

// Check if there's a cost reduction effect active
const costReduction = computed(() => {
  const costReductionKey = `farm${props.farmId}CostReduction`
  if (seasonStore.prestigeMultipliers[costReductionKey] &&
    seasonStore.prestigeMultipliers[costReductionKey].gt(1)) {
    return seasonStore.prestigeMultipliers[costReductionKey]
  }
  return null
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

  if (farm.multiplier.gt(1)) {
    // More compact description for mobile
    return `${productionAmount} ${producesResourceName}/tick (${baseProduction} × ${formatDecimal(farm.multiplier.mul(100))}%)`
  } else {
    return `${productionAmount} ${producesResourceName}/tick`
  }
}
</script>

<template>
  <div class="border rounded-lg p-2 sm:p-4 mb-2 sm:mb-4 transition-all duration-200 shadow-sm h-full flex flex-col"
    :class="[
      farm.owned ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
      canAfford && !farm.owned ? 'border-green-400 dark:border-green-500 border-2' : ''
    ]">
    <div class="flex-grow">
      <!-- Farm header with name and counters -->
      <div class="flex flex-col xs:flex-row justify-between items-start xs:items-center mb-2">
        <h3 class="text-base sm:text-lg font-semibold text-amber-900 dark:text-amber-200 flex items-center">
          <span class="mr-1">{{ farmEmoji }}</span>{{ farm.name }}
        </h3>
        <div v-if="farm.owned" class="flex flex-row space-x-1 text-[10px] xs:text-xs mt-1 xs:mt-0">
          <div
            class="bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 px-1 py-0.5 rounded-md font-medium">
            P: {{ formatDecimal(farm.manuallyPurchased) }}
          </div>
          <div
            class="bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-200 px-1 py-0.5 rounded-md font-medium">
            O: {{ formatDecimal(farm.totalOwned) }}
          </div>
        </div>
      </div>

      <!-- Production info - more compact -->
      <p
        class="text-xs sm:text-sm text-amber-800 dark:text-amber-200 mb-2 bg-amber-100/50 dark:bg-amber-800/30 p-1.5 rounded-md">
        {{ getProductionDescription(farmId) }}
      </p>

      <!-- Cost reduction info (if active) - more compact -->
      <p v-if="costReduction"
        class="text-xs sm:text-sm text-purple-800 dark:text-purple-200 mb-2 bg-purple-100/50 dark:bg-purple-800/30 p-1.5 rounded-md">
        Cost reduced by {{ formatDecimal(costReduction) }}×
      </p>

      <!-- Auto-buyer toggle - more compact layout -->
      <div v-if="hasAutoBuyer && farm.owned"
        class="mb-2 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded-md">
        <div class="text-xs text-blue-800 dark:text-blue-200 flex items-center">
          <span class="font-medium">Auto-Buy</span>
          <span class="text-[10px] ml-1">(Lv{{ autoBuyerLevel }})</span>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" v-model="isAutoEnabled" class="sr-only peer">
          <div
            class="w-8 h-4 bg-gray-200 peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
          </div>
        </label>
      </div>
    </div>

    <!-- Buy button - slightly more compact -->
    <div class="mt-auto pt-2">
      <HoldButton :disabled="!canAfford" :full-width="true" variant="primary" @click="handleBuy"
        class="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 text-white transition-colors text-sm h-8 sm:h-auto">
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

/* Add custom breakpoint for extra small screens */
@media (min-width: 480px) {
  .xs\:flex-row {
    flex-direction: row;
  }

  .xs\:items-center {
    align-items: center;
  }

  .xs\:mt-0 {
    margin-top: 0;
  }

  .xs\:text-xs {
    font-size: 0.75rem;
    line-height: 1rem;
  }
}
</style>
