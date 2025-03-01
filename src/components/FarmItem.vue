<script setup lang="ts">
import { computed } from 'vue'
import { useFarmStore } from '@/stores/farmStore'
import { useCoreStore } from '@/stores/coreStore'
import { useMachineStore } from '@/stores/machineStore'
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
    farm.owned ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200',
    canAfford && !farm.owned ? 'border-green-400 border-2' : ''
  ]">
    <div class="flex-grow">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-lg font-semibold text-amber-900 flex items-center">
          <span class="mr-2">🌱</span>{{ farm.name }}
        </h3>
        <div v-if="farm.owned" class="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
          <div class="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md font-medium text-center">
            Purchased: {{ formatDecimal(farm.manuallyPurchased) }}
          </div>
          <div class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-md font-medium text-center">
            Owned: {{ formatDecimal(farm.totalOwned) }}
          </div>
        </div>
      </div>

      <p class="text-sm text-amber-800 mb-4 bg-amber-100/50 p-2 rounded-md">
        {{ getProductionDescription(farmId) }}
      </p>
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
