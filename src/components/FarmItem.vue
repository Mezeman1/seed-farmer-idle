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
  <div class="border rounded-lg p-4 mb-4 transition-all duration-200" :class="[
    farm.owned ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200',
    canAfford && !farm.owned ? 'border-green-400' : ''
  ]">
    <div class="flex flex-col">
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-lg font-semibold">{{ farm.name }}</h3>
        <div v-if="farm.owned" class="flex space-x-2">
          <div class="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
            Purchased: {{ formatDecimal(farm.manuallyPurchased) }}
          </div>
          <div class="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
            Owned: {{ formatDecimal(farm.totalOwned) }}
          </div>
        </div>
      </div>

      <p class="text-sm text-gray-600 mb-3">
        {{ getProductionDescription(farmId) }}
      </p>

      <div class="mt-auto">
        <HoldButton :disabled="!canAfford" :full-width="true" variant="primary" @click="handleBuy">
          Buy ({{ formatDecimal(cost) }} seeds)
        </HoldButton>
      </div>
    </div>
  </div>
</template>
