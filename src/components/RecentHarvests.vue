<script setup lang="ts">
import { computed } from 'vue'
import { useSeasonStore } from '@/stores/seasonStore'
import { formatDecimal } from '@/utils/formatting'

const seasonStore = useSeasonStore()

// Get the most recent harvests (up to 10)
const recentHarvests = computed(() => {
  return [...seasonStore.harvests]
    .sort((a, b) => b.id - a.id) // Sort by ID descending (newest first)
    .slice(0, 10) // Take only the 10 most recent
})

// Format the seed requirement for display
const formatRequirement = (requirement) => {
  return formatDecimal(requirement)
}
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-4">
    <h3 class="text-xl font-semibold text-amber-700 mb-4">Recent Harvests</h3>

    <div v-if="recentHarvests.length === 0" class="text-gray-500 italic">
      No harvests completed yet.
    </div>

    <div v-else class="space-y-2">
      <div v-for="harvest in recentHarvests" :key="harvest.id"
        class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div class="flex justify-between items-center">
          <div>
            <span class="font-medium">Harvest #{{ harvest.id + 1 }}</span>
            <div class="text-sm text-gray-600">
              Required: {{ formatRequirement(harvest.seedRequirement) }} seeds
            </div>
            <div class="text-xs text-gray-500">
              Season: {{ harvest.season }}
            </div>
          </div>
          <div class="text-amber-600 font-semibold">
            +{{ harvest.pointsAwarded }} point{{ harvest.pointsAwarded !== 1 ? 's' : '' }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="seasonStore.harvests.length > 10" class="text-center text-gray-500 text-sm mt-4">
      Showing 10 most recent harvests of {{ seasonStore.harvests.length }} total
    </div>
  </div>
</template>

<style scoped>
.recent-harvests {
  @apply p-4 bg-white rounded-lg shadow-sm;
}
</style>
