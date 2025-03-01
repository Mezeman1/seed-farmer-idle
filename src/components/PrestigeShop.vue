<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSeasonStore } from '@/stores/seasonStore'
import { useFarmStore } from '@/stores/farmStore'
import { usePersistenceStore } from '@/stores/persistenceStore'
import Decimal from 'break_infinity.js'

const seasonStore = useSeasonStore()
const farmStore = useFarmStore()
const persistenceStore = usePersistenceStore()

// Get available upgrades from the store
const prestigeUpgrades = computed(() => {
  return seasonStore.availablePrestigeUpgrades.map(upgrade => {
    return {
      ...upgrade,
      level: seasonStore.getUpgradeLevel(upgrade.id),
      getNextLevelCost: () => {
        const level = seasonStore.getUpgradeLevel(upgrade.id)
        return Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, level))
      }
    }
  })
})

// Computed property for available points
const availablePoints = computed(() => {
  return seasonStore.prestigePoints
})

// Purchase an upgrade
const purchaseUpgrade = (upgrade: any) => {
  // Check if we can purchase (has points and not at max level)
  const currentLevel = seasonStore.getUpgradeLevel(upgrade.id)
  if (upgrade.maxLevel !== null && currentLevel >= upgrade.maxLevel) {
    return false // Already at max level
  }

  const cost = upgrade.getNextLevelCost()
  if (availablePoints.value < cost) {
    return false // Not enough points
  }

  // Purchase the upgrade
  seasonStore.prestigePoints -= cost

  // Update the upgrade level in the store
  seasonStore.updateUpgradeLevel(upgrade.id, currentLevel + 1)

  // Save the game after purchase
  persistenceStore.saveGame()

  return true
}

// Get effect display for an upgrade
const getEffectDisplay = (upgrade: any) => {
  const level = seasonStore.getUpgradeLevel(upgrade.id)
  const context = {
    multipliers: seasonStore.prestigeMultipliers,
    season: seasonStore.currentSeason
  }
  return upgrade.getEffectDisplay(level, context)
}

// Initialize on component mount
onMounted(() => {
  // No need to initialize upgrades as they're now managed by the store
})
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-semibold text-amber-700 dark:text-amber-400">Prestige Shop</h3>
      <div class="text-amber-600 dark:text-amber-300 font-semibold">
        {{ availablePoints }} Points Available
      </div>
    </div>

    <div class="space-y-4">
      <div v-for="upgrade in prestigeUpgrades" :key="upgrade.id"
        class="p-4 border border-amber-200 dark:border-amber-700 rounded-lg bg-amber-50 dark:bg-amber-900/30">
        <div class="flex justify-between items-start">
          <div>
            <h4 class="font-semibold text-lg text-amber-800 dark:text-amber-200">{{ upgrade.name }}</h4>
            <p class="text-gray-600 dark:text-gray-300 text-sm">{{ upgrade.description }}</p>
            <p class="text-amber-700 dark:text-amber-400 text-sm mt-1">{{ getEffectDisplay(upgrade) }}</p>
            <div class="mt-2">
              <div v-for="(effect, index) in upgrade.effects" :key="index"
                class="text-xs text-gray-500 dark:text-gray-400">
                {{ effect.getDescription(upgrade.level) }}
              </div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-gray-700 dark:text-gray-300 mb-1">
              Level: <span class="font-semibold">{{ upgrade.level }}</span>
              <span v-if="upgrade.maxLevel !== null">/{{ upgrade.maxLevel }}</span>
            </div>
            <button @click="purchaseUpgrade(upgrade)" :disabled="availablePoints < upgrade.getNextLevelCost() ||
              (upgrade.maxLevel !== null && upgrade.level >= upgrade.maxLevel)" class="px-3 py-1 bg-amber-600 dark:bg-amber-700 text-white rounded-md hover:bg-amber-700 dark:hover:bg-amber-600
                                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Buy ({{ upgrade.getNextLevelCost() }} pts)
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
