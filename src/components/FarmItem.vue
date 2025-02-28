<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore, type Farm } from '@/stores/gameStore'
import Decimal from 'break_infinity.js'
import { formatDecimal } from '@/utils/formatting'

const props = defineProps<{
    farmId: number
}>()

const gameStore = useGameStore()

const farm = computed(() => {
    return gameStore.farms[props.farmId]
})

const production = computed(() => {
    return gameStore.calculateProduction(props.farmId)
})

const cost = computed(() => {
    return gameStore.calculateFarmCost(props.farmId)
})

const canAfford = computed(() => {
    return gameStore.seeds.gte(cost.value)
})

const handleBuy = () => {
    gameStore.buyFarm(props.farmId)
}

const getProductionDescription = (farmId: number): string => {
    const farm = gameStore.farms[farmId]
    const productionAmount = formatDecimal(farm.baseProduction.mul(farm.totalOwned))

    if (farmId === 0) {
        return `Produces ${productionAmount} seeds per tick`
    } else {
        return `Produces ${productionAmount} ${gameStore.farms[farmId - 1].name} per tick`
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
                <button @click="handleBuy" class="w-full py-2 px-4 rounded font-medium transition-colors duration-200"
                    :class="[
                        canAfford
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    ]" :disabled="!canAfford">
                    Buy ({{ formatDecimal(cost) }} seeds)
                </button>
            </div>
        </div>
    </div>
</template>
