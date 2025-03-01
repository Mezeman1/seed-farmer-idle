<script setup lang="ts">
import { ref, computed } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { useCoreStore } from '@/stores/coreStore'
import { useSeasonStore } from '@/stores/seasonStore'
import { formatDecimal } from '@/utils/formatting'
import PrestigeShop from '@/components/PrestigeShop.vue'
import RecentHarvests from '@/components/RecentHarvests.vue'
import Decimal from 'break_infinity.js'

// Store references
const coreStore = useCoreStore()
const seasonStore = useSeasonStore()

// Tab management
const tabs = ['overview', 'shop', 'harvests']
const activeTab = ref('overview')

const setActiveTab = (tab: string) => {
  activeTab.value = tab
}

// Computed properties for UI
const formattedHarvestsRequired = computed(() => {
  return seasonStore.harvestsRequired.toFixed(1)
})

const formattedNextHarvestRequirement = computed(() => {
  return formatDecimal(seasonStore.nextHarvestRequirement)
})

const formattedCurrentSeeds = computed(() => {
  return formatDecimal(coreStore.seeds)
})

const progressPercentage = computed(() => {
  return `${seasonStore.harvestProgress.toFixed(1)}%`
})

// Format the current season for display
const formattedCurrentSeason = computed(() => {
  return seasonStore.currentSeason.toString()
})

// Format the total harvests completed for display
const formattedTotalHarvests = computed(() => {
  return seasonStore.totalHarvestsCompleted.toString()
})

// Format the harvests completed this season for display
const formattedSeasonHarvests = computed(() => {
  return seasonStore.harvestsCompletedThisSeason.toString()
})

// Calculate the base requirement for the current season
const seasonBaseRequirement = computed(() => {
  const baseReq = new Decimal(1000).mul(
    new Decimal(2).pow(Math.max(0, seasonStore.currentSeason.toNumber() - 1))
  )
  return formatDecimal(baseReq)
})

// Confirmation modal state
const showConfirmModal = ref(false)

// Calculate potential prestige points
const potentialPrestigePoints = computed(() => {
  let pointsToAward = new Decimal(0)
  for (let i = 0; i < seasonStore.harvestsCompletedThisSeason.toNumber(); i++) {
    // Calculate points for each harvest completed this season
    const harvestId = seasonStore.totalHarvestsCompleted.toNumber() - seasonStore.harvestsCompletedThisSeason.toNumber() + i
    const basePoints = new Decimal(1)
    const pointsMultiplier = seasonStore.prestigeMultipliers.harvestPoints || new Decimal(1)
    pointsToAward = pointsToAward.add(basePoints.mul(pointsMultiplier).floor())
  }
  return pointsToAward
})

// Format the potential prestige points for display
const formattedPotentialPoints = computed(() => {
  return formatDecimal(potentialPrestigePoints.value)
})

// Format the current prestige points for display
const formattedCurrentPoints = computed(() => {
  return formatDecimal(seasonStore.prestigePoints)
})

// Open confirmation modal
const openConfirmModal = () => {
  if (seasonStore.canPrestige) {
    showConfirmModal.value = true
  }
}

// Close confirmation modal
const closeConfirmModal = () => {
  showConfirmModal.value = false
}

// Handle prestige action
const handlePrestige = () => {
  if (seasonStore.canPrestige) {
    seasonStore.prestige()
    closeConfirmModal()
  }
}
</script>

<template>
  <MainLayout>
    <!-- Seasons Content -->
    <div class="mt-6 px-4">
      <h1 class="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-4">Seasons</h1>

      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <button v-for="tab in tabs" :key="tab" @click="setActiveTab(tab)"
          :class="['tab-button', { active: activeTab === tab }]">
          {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="overview-tab">
          <div class="season-info">
            <div class="info-card">
              <h3 class="text-xl font-semibold text-amber-900 dark:text-amber-100">Current Season</h3>
              <div class="text-3xl font-bold text-amber-600 dark:text-amber-400">{{ formattedCurrentSeason }}</div>
              <p class="text-gray-700 dark:text-gray-300 mt-2">
                Total Harvests: <span class="font-medium">{{ formattedTotalHarvests }}</span>
              </p>
              <p class="text-gray-700 dark:text-gray-300 mt-1">
                Season Harvests: <span class="font-medium">{{ formattedSeasonHarvests }}</span>
              </p>
            </div>

            <div class="info-card">
              <h3 class="text-xl font-semibold text-amber-900 dark:text-amber-100">Next Harvest</h3>
              <div class="text-lg text-amber-800 dark:text-amber-200">{{ formattedNextHarvestRequirement }} seeds</div>
              <p class="text-gray-700 dark:text-gray-300 mt-1">
                Current Seeds: <span class="font-medium">{{ formattedCurrentSeeds }}</span>
              </p>
              <p class="text-gray-700 dark:text-gray-300 mt-1">
                Base Requirement: <span class="font-medium">{{ seasonBaseRequirement }}</span>
              </p>
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                <div class="bg-amber-600 dark:bg-amber-500 h-2.5 rounded-full" :style="{ width: progressPercentage }">
                </div>
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">{{ progressPercentage }} toward next harvest
              </div>
            </div>

            <div class="info-card">
              <h3 class="text-xl font-semibold text-amber-900 dark:text-amber-100">Season Progress</h3>
              <div class="text-lg text-amber-800 dark:text-amber-200">
                {{ formattedSeasonHarvests }} / {{ formattedHarvestsRequired }}
                harvests
              </div>
              <button @click="openConfirmModal" :disabled="!seasonStore.canPrestige"
                :class="['prestige-button', { 'opacity-50 cursor-not-allowed': !seasonStore.canPrestige }]">
                Start New Season
              </button>
              <div v-if="!seasonStore.canPrestige" class="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Complete more harvests to start a new season
              </div>
              <div v-else class="text-sm text-amber-600 dark:text-amber-400 mt-2">
                You'll gain {{ formattedPotentialPoints }} prestige points
              </div>
            </div>
          </div>
        </div>

        <!-- Shop Tab -->
        <div v-if="activeTab === 'shop'" class="shop-tab">
          <PrestigeShop />
        </div>

        <!-- Harvests Tab -->
        <div v-if="activeTab === 'harvests'" class="harvests-tab">
          <RecentHarvests />
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div v-if="showConfirmModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 max-w-md w-full mx-4">
        <div class="relative">
          <!-- Close button -->
          <button @click="closeConfirmModal"
            class="absolute top-0 right-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Confirmation content -->
          <h3 class="text-xl font-semibold text-amber-700 dark:text-amber-400 mb-4 pr-8">Start New Season?</h3>

          <div class="mb-6">
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to start a new season? This will reset your progress but award you with prestige
              points.
            </p>

            <div
              class="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
              <div class="flex justify-between items-center">
                <span class="text-amber-800 dark:text-amber-200 font-medium">Current Season:</span>
                <span class="text-amber-700 dark:text-amber-300">{{ formattedCurrentSeason }}</span>
              </div>
              <div class="flex justify-between items-center mt-2">
                <span class="text-amber-800 dark:text-amber-200 font-medium">Harvests Completed:</span>
                <span class="text-amber-700 dark:text-amber-300">{{ formattedSeasonHarvests }}</span>
              </div>
              <div class="flex justify-between items-center mt-2">
                <span class="text-amber-800 dark:text-amber-200 font-medium">Prestige Points to Gain:</span>
                <span class="text-amber-700 dark:text-amber-300 font-bold text-lg">{{ formattedPotentialPoints }}</span>
              </div>
            </div>

            <p class="text-gray-500 dark:text-gray-400 text-sm">
              Note: All farms (except Farm 1) and machines will be reset. Your prestige upgrades will remain.
            </p>
          </div>

          <div class="flex justify-end space-x-3">
            <button @click="closeConfirmModal"
              class="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors">
              Cancel
            </button>
            <button @click="handlePrestige"
              class="px-4 py-2 bg-amber-600 dark:bg-amber-700 text-white rounded-md hover:bg-amber-700 dark:hover:bg-amber-600 transition-colors">
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<style scoped>
.tab-navigation {
  @apply flex mb-4 border-b border-gray-200 dark:border-gray-700;
}

.tab-button {
  @apply px-4 py-2 text-gray-600 dark:text-gray-400 font-medium transition-colors;
}

.tab-button.active {
  @apply text-amber-600 dark:text-amber-400 border-b-2 border-amber-600 dark:border-amber-400;
}

.tab-content {
  @apply py-4;
}

.season-info {
  @apply grid grid-cols-1 md:grid-cols-3 gap-4;
}

.info-card {
  @apply p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100 dark:border-amber-900/30;
}

.progress-bar {
  @apply w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 mb-1;
}

.progress-fill {
  @apply h-full bg-amber-500 dark:bg-amber-400 rounded-full;
}

.prestige-button {
  @apply mt-4 w-full py-2 px-4 bg-amber-600 dark:bg-amber-700 text-white font-medium rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 transition-colors;
}
</style>
