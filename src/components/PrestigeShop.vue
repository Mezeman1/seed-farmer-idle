<script setup lang="ts">
import { ref, computed, } from 'vue'
import { useSeasonStore, type ExtendedUpgrade as BaseExtendedUpgrade, type PrestigeUpgrade } from '@/stores/seasonStore'
import { useFarmStore } from '@/stores/farmStore'
import { usePersistenceStore } from '@/stores/persistenceStore'
import Decimal from 'break_infinity.js'
import { formatDecimal } from '@/utils/formatting'

// Define type for the category
type UpgradeCategory = 'Auto-Buyers' | 'Harvest' | 'Season' | 'Production' | 'Speed' | 'Machine';

// Define our own extended upgrade interface that uses Decimal
interface DecimalExtendedUpgrade extends Omit<BaseExtendedUpgrade, 'getNextLevelCost'> {
  getNextLevelCost: () => Decimal;
}

// Define type for grouped upgrades
interface GroupedUpgrades {
  [key: string]: DecimalExtendedUpgrade;
}

const seasonStore = useSeasonStore()
const farmStore = useFarmStore()
const persistenceStore = usePersistenceStore()

// Get available upgrades from the store
const prestigeUpgrades = computed<DecimalExtendedUpgrade[]>(() => {
  return seasonStore.availablePrestigeUpgrades
    .filter(upgrade => {
      // Check if the upgrade should be visible
      if (typeof upgrade.isVisible === 'function') {
        const context = {
          getUpgradeLevel: seasonStore.getUpgradeLevel,
          multipliers: seasonStore.prestigeMultipliers,
          season: seasonStore.currentSeason
        }
        return upgrade.isVisible(context)
      }
      // If no isVisible function, always show
      return true
    })
    .map(upgrade => {
      return {
        ...upgrade,
        level: seasonStore.getUpgradeLevel(upgrade.id),
        getNextLevelCost: () => {
          const level = seasonStore.getUpgradeLevel(upgrade.id)
          // Use Decimal.js for cost calculation
          return new Decimal(upgrade.baseCost).times(
            new Decimal(upgrade.costScaling).pow(level)
          ).floor()
        }
      }
    })
})

// Computed property for available points
const availablePoints = computed(() => {
  return seasonStore.prestigePoints
})

// Purchase an upgrade
const purchaseUpgrade = (upgrade: DecimalExtendedUpgrade) => {
  // Check if we can purchase (has points and not at max level)
  const currentLevel = seasonStore.getUpgradeLevel(upgrade.id)
  if (upgrade.maxLevel !== null && currentLevel >= upgrade.maxLevel) {
    return false // Already at max level
  }

  const cost = upgrade.getNextLevelCost()
  // Compare using Decimal.js
  if (availablePoints.value.lessThan(cost)) {
    return false // Not enough points
  }

  // Purchase the upgrade - subtract cost from prestigePoints
  seasonStore.prestigePoints = availablePoints.value.minus(cost)

  // Update the upgrade level in the store
  seasonStore.updateUpgradeLevel(upgrade.id, currentLevel + 1)

  // Save the game after purchase
  persistenceStore.saveGame()

  return true
}

// Get effect display for an upgrade
const getEffectDisplay = (upgrade: DecimalExtendedUpgrade) => {
  const level = seasonStore.getUpgradeLevel(upgrade.id)
  const context = {
    multipliers: seasonStore.prestigeMultipliers,
    season: seasonStore.currentSeason
  }
  return upgrade.getEffectDisplay(level, context)
}

// Modal state
const showModal = ref(false)
const selectedUpgrade = ref<DecimalExtendedUpgrade | null>(null)

// Open modal with selected upgrade
const openUpgradeModal = (upgrade: DecimalExtendedUpgrade) => {
  selectedUpgrade.value = upgrade
  showModal.value = true
}

// Close modal
const closeModal = () => {
  showModal.value = false
  selectedUpgrade.value = null
}

// Get category for upgrade (for grouping in the grid)
const getUpgradeCategory = (upgrade: DecimalExtendedUpgrade): UpgradeCategory => {
  return upgrade.category;
}

// Group upgrades by category
const groupedUpgrades = computed<Record<string, DecimalExtendedUpgrade[]>>(() => {
  const groups: Record<string, DecimalExtendedUpgrade[]> = {}
  prestigeUpgrades.value.forEach(upgrade => {
    const category = getUpgradeCategory(upgrade)
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(upgrade)
  })
  return groups
})
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-semibold text-amber-700 dark:text-amber-400">Prestige Shop</h3>
      <div class="text-amber-600 dark:text-amber-300 font-semibold">
        {{ formatDecimal(availablePoints) }} Points Available
      </div>
    </div>

    <!-- Grid layout for upgrade categories -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div v-for="(upgrades, category) in groupedUpgrades" :key="category"
        class="border border-amber-200 dark:border-amber-700 rounded-lg p-3">
        <h4 class="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2">{{ category }}</h4>

        <!-- Grid of upgrade tiles -->
        <div class="grid grid-cols-2 gap-2">
          <div v-for="upgrade in upgrades" :key="upgrade.id" @click="openUpgradeModal(upgrade)" class="p-3 bg-amber-50 dark:bg-amber-900/30 rounded border border-amber-200 dark:border-amber-800
                      hover:bg-amber-100 dark:hover:bg-amber-800/50 cursor-pointer transition-colors">
            <div class="font-medium text-amber-800 dark:text-amber-200">{{ upgrade.name }}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              Level: {{ upgrade.level }}
              <span v-if="upgrade.maxLevel !== null">/{{ upgrade.maxLevel }}</span>
            </div>
            <div class="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Cost: {{ formatDecimal(upgrade.getNextLevelCost()) }} pts
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal for upgrade details -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="closeModal">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 max-w-md w-full mx-4" @click.stop>
        <div v-if="selectedUpgrade" class="relative">
          <!-- Close button -->
          <button @click="closeModal"
            class="absolute top-0 right-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Upgrade details -->
          <h3 class="text-xl font-semibold text-amber-700 dark:text-amber-400 mb-2 pr-8">{{ selectedUpgrade.name }}</h3>
          <p class="text-gray-600 dark:text-gray-300 mb-3">{{ selectedUpgrade.description }}</p>

          <div class="text-amber-700 dark:text-amber-400 mb-3">{{ getEffectDisplay(selectedUpgrade) }}</div>

          <div class="mb-4">
            <div v-for="(effect, index) in selectedUpgrade.effects" :key="index"
              class="text-sm text-gray-500 dark:text-gray-400">
              {{ effect.getDescription(selectedUpgrade.level) }}
            </div>
          </div>

          <div class="flex justify-between items-center">
            <div class="text-gray-700 dark:text-gray-300">
              Level: <span class="font-semibold">{{ selectedUpgrade.level }}</span>
              <span v-if="selectedUpgrade.maxLevel !== null">/{{ selectedUpgrade.maxLevel }}</span>
            </div>

            <button @click="purchaseUpgrade(selectedUpgrade)" :disabled="availablePoints.lessThan(selectedUpgrade.getNextLevelCost()) ||
              (selectedUpgrade.maxLevel !== null && selectedUpgrade.level >= selectedUpgrade.maxLevel)" class="px-4 py-2 bg-amber-600 dark:bg-amber-700 text-white rounded-md
                           hover:bg-amber-700 dark:hover:bg-amber-600
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Buy ({{ formatDecimal(selectedUpgrade.getNextLevelCost()) }} pts)
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
