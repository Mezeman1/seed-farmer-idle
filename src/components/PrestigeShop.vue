<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSeasonStore } from '@/stores/seasonStore'
import { useFarmStore } from '@/stores/farmStore'
import { usePersistenceStore } from '@/stores/persistenceStore'
import Decimal from 'break_infinity.js'

const seasonStore = useSeasonStore()
const farmStore = useFarmStore()
const persistenceStore = usePersistenceStore()

// Interface for upgrade types
interface PrestigeUpgrade {
    id: number
    name: string
    description: string
    effect: string
    baseCost: number
    costScaling: number
    maxLevel: number | null
    level: number
    getNextLevelCost: () => number
}

// Define available upgrades
const prestigeUpgrades = ref<PrestigeUpgrade[]>([
    {
        id: 0,
        name: 'Farm 1 Boost',
        description: 'Increases Farm 1 production by 10% per level',
        effect: 'Farm 1 production: +10% per level',
        baseCost: 1,
        costScaling: 1.5,
        maxLevel: null, // No maximum level
        level: 0,
        getNextLevelCost: function () {
            return Math.floor(this.baseCost * Math.pow(this.costScaling, this.level))
        }
    },
    {
        id: 1,
        name: 'Starting Seeds',
        description: 'Start each new season with more seeds',
        effect: 'Start with 10^level seeds',
        baseCost: 3,
        costScaling: 2,
        maxLevel: 5,
        level: 0,
        getNextLevelCost: function () {
            return Math.floor(this.baseCost * Math.pow(this.costScaling, this.level))
        }
    },
    {
        id: 2,
        name: 'Harvest Efficiency',
        description: 'Reduces seed requirements for harvests',
        effect: 'Harvest requirements: -5% per level',
        baseCost: 5,
        costScaling: 2.5,
        maxLevel: 10, // Maximum 50% reduction
        level: 0,
        getNextLevelCost: function () {
            return Math.floor(this.baseCost * Math.pow(this.costScaling, this.level))
        }
    }
])

// Computed property for available points
const availablePoints = computed(() => {
    return seasonStore.prestigePoints
})

// Purchase an upgrade
const purchaseUpgrade = (upgrade: PrestigeUpgrade) => {
    // Check if we can purchase (has points and not at max level)
    if (upgrade.maxLevel !== null && upgrade.level >= upgrade.maxLevel) {
        return false // Already at max level
    }

    const cost = upgrade.getNextLevelCost()
    if (availablePoints.value < cost) {
        return false // Not enough points
    }

    // Purchase the upgrade
    seasonStore.prestigePoints -= cost
    upgrade.level++

    // Save the upgrade to the store
    const storeUpgrade = seasonStore.prestigeUpgrades.find(u => u.id === upgrade.id)
    if (storeUpgrade) {
        storeUpgrade.level = upgrade.level
    } else {
        seasonStore.prestigeUpgrades.push({
            id: upgrade.id,
            level: upgrade.level
        })
    }

    // Apply the upgrade effects
    applyUpgradeEffects()

    // Save the game after purchase
    persistenceStore.saveGame()

    return true
}

// Apply the effects of all purchased upgrades
const applyUpgradeEffects = () => {
    // Farm 1 Boost
    const farm1Upgrade = prestigeUpgrades.value.find(u => u.id === 0)
    if (farm1Upgrade && farm1Upgrade.level > 0) {
        const multiplier = new Decimal(1).add(new Decimal(farm1Upgrade.level).mul(0.1)) // 10% per level
        seasonStore.updatePrestigeMultiplier('farm0', multiplier)
    }

    // Harvest Efficiency
    const harvestEfficiencyUpgrade = prestigeUpgrades.value.find(u => u.id === 2)
    if (harvestEfficiencyUpgrade && harvestEfficiencyUpgrade.level > 0) {
        // 5% reduction per level, min 50%
        const reduction = new Decimal(1).sub(new Decimal(harvestEfficiencyUpgrade.level).mul(0.05))
        const finalReduction = Decimal.max(new Decimal(0.5), reduction)
        seasonStore.updatePrestigeMultiplier('harvestRequirement', finalReduction)
    }
}

// Initialize upgrades from the store
const initializeUpgrades = () => {
    // Load upgrade levels from the store
    seasonStore.prestigeUpgrades.forEach(storeUpgrade => {
        const upgrade = prestigeUpgrades.value.find(u => u.id === storeUpgrade.id)
        if (upgrade) {
            upgrade.level = storeUpgrade.level
        }
    })

    // Apply effects
    applyUpgradeEffects()
}

// Initialize on component mount
onMounted(() => {
    initializeUpgrades()
})

// Export for parent component
defineExpose({
    prestigeUpgrades,
    purchaseUpgrade,
    applyUpgradeEffects
})
</script>

<template>
    <div class="bg-white rounded-lg shadow-md p-4">
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-semibold text-amber-700">Prestige Shop</h3>
            <div class="text-amber-600 font-semibold">
                {{ availablePoints }} Points Available
            </div>
        </div>

        <div class="space-y-4">
            <div v-for="upgrade in prestigeUpgrades" :key="upgrade.id"
                class="p-4 border border-amber-200 rounded-lg bg-amber-50">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold text-lg">{{ upgrade.name }}</h4>
                        <p class="text-gray-600 text-sm">{{ upgrade.description }}</p>
                        <p class="text-amber-700 text-sm mt-1">{{ upgrade.effect }}</p>
                    </div>
                    <div class="text-right">
                        <div class="text-gray-700 mb-1">
                            Level: <span class="font-semibold">{{ upgrade.level }}</span>
                            <span v-if="upgrade.maxLevel !== null">/{{ upgrade.maxLevel }}</span>
                        </div>
                        <button @click="purchaseUpgrade(upgrade)" :disabled="availablePoints < upgrade.getNextLevelCost() ||
                            (upgrade.maxLevel !== null && upgrade.level >= upgrade.maxLevel)" class="px-3 py-1 bg-amber-600 text-white rounded-md hover:bg-amber-700
                                   disabled:opacity-50 disabled:cursor-not-allowed">
                            Buy ({{ upgrade.getNextLevelCost() }} pts)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
