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

// Calculate the base requirement for the current season
const seasonBaseRequirement = computed(() => {
  const baseReq = new Decimal(1000).mul(
    new Decimal(2).pow(Math.max(0, seasonStore.currentSeason - 1))
  )
  return formatDecimal(baseReq)
})

// Handle prestige action
const handlePrestige = () => {
  if (seasonStore.canPrestige) {
    seasonStore.prestige()
  }
}
</script>

<template>
  <MainLayout bg-color="bg-amber-50">
    <!-- Seasons Content -->
    <div class="mt-6 px-4">
      <h1 class="text-2xl font-bold text-amber-800 mb-4">Seasons</h1>

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
              <h3 class="text-xl font-semibold">Current Season</h3>
              <div class="text-3xl font-bold text-amber-600">{{ seasonStore.currentSeason }}</div>
              <p class="text-gray-700 mt-2">
                Total Harvests: <span class="font-medium">{{ seasonStore.totalHarvestsCompleted
                  }}</span>
              </p>
              <p class="text-gray-700 mt-1">
                Season Harvests: <span class="font-medium">{{
                  seasonStore.harvestsCompletedThisSeason }}</span>
              </p>
            </div>

            <div class="info-card">
              <h3 class="text-xl font-semibold">Next Harvest</h3>
              <div class="text-lg">{{ formattedNextHarvestRequirement }} seeds</div>
              <p class="text-gray-700 mt-1">
                Current Seeds: <span class="font-medium">{{ formattedCurrentSeeds }}</span>
              </p>
              <p class="text-gray-700 mt-1">
                Base Requirement: <span class="font-medium">{{ seasonBaseRequirement }}</span>
              </p>
              <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div class="bg-amber-600 h-2.5 rounded-full" :style="{ width: progressPercentage }">
                </div>
              </div>
              <div class="text-sm text-gray-600 mt-1">{{ progressPercentage }} complete</div>
            </div>

            <div class="info-card">
              <h3 class="text-xl font-semibold">Season Progress</h3>
              <div class="text-lg">
                {{ seasonStore.harvestsCompletedThisSeason }} / {{ formattedHarvestsRequired }}
                harvests
              </div>
              <button @click="handlePrestige" :disabled="!seasonStore.canPrestige"
                :class="['prestige-button', { 'opacity-50 cursor-not-allowed': !seasonStore.canPrestige }]">
                Start New Season
              </button>
              <div v-if="!seasonStore.canPrestige" class="text-sm text-gray-600 mt-2">
                Complete more harvests to start a new season
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
  </MainLayout>
</template>

<style scoped>
.tab-navigation {
  @apply flex mb-4 border-b border-gray-200;
}

.tab-button {
  @apply px-4 py-2 text-gray-600 font-medium;
}

.tab-button.active {
  @apply text-amber-600 border-b-2 border-amber-600;
}

.tab-content {
  @apply py-4;
}

.season-info {
  @apply grid grid-cols-1 md:grid-cols-3 gap-4;
}

.info-card {
  @apply p-4 bg-white rounded-lg shadow-sm;
}

.progress-bar {
  @apply w-full h-2 bg-gray-200 rounded-full mt-2 mb-1;
}

.progress-fill {
  @apply h-full bg-amber-500 rounded-full;
}

.prestige-button {
  @apply mt-4 w-full py-2 px-4 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors;
}
</style>
