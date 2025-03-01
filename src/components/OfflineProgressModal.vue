<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePersistenceStore } from '@/stores/persistenceStore'
import { formatDecimal } from '@/utils/formatting'
import { formatTime } from '@/utils/time-formatting'

const persistenceStore = usePersistenceStore()

// Computed properties
const progressPercentage = computed(() => {
  if (persistenceStore.offlineTicksToProcess === 0) return 0
  return (persistenceStore.offlineTicksProcessed / persistenceStore.offlineTicksToProcess) * 100
})

// Check if processing is complete but modal is still showing
const isProcessingComplete = computed(() => {
  return persistenceStore.showOfflineModal && !persistenceStore.isProcessingOfflineTicks
})

// Dismiss the modal
const dismissModal = () => {
  persistenceStore.dismissOfflineModal()
}
</script>

<template>
  <div v-if="persistenceStore.showOfflineModal"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
      <h2 class="text-xl font-bold text-green-800 dark:text-green-400 mb-4">Welcome Back! 🌱</h2>

      <p class="mb-2 text-gray-700 dark:text-gray-300">
        You were away for {{ formatTime(persistenceStore.offlineTimeAway) }}.
        <span v-if="persistenceStore.isProcessingOfflineTicks">
          Processing {{ persistenceStore.offlineTicksToProcess }} ticks...
        </span>
        <span v-else>
          Processed {{ persistenceStore.offlineTicksToProcess }} ticks.
        </span>
      </p>

      <!-- Seeds gained during offline progress -->
      <div class="mb-4 bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
        <div class="text-green-800 dark:text-green-400 font-semibold">Seeds gained while away:</div>
        <div class="text-2xl font-bold text-green-700 dark:text-green-300">
          {{ formatDecimal(persistenceStore.offlineSeedsGained) }}
        </div>
      </div>

      <div v-if="persistenceStore.isProcessingOfflineTicks" class="mb-4">
        <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
          <span>Progress:</span>
          <span>{{ persistenceStore.offlineTicksProcessed }} / {{ persistenceStore.offlineTicksToProcess }}
            ticks</span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div class="bg-green-600 dark:bg-green-500 h-2.5 rounded-full transition-all duration-100"
            :style="{ width: `${progressPercentage}%` }"></div>
        </div>
      </div>

      <div class="flex justify-between">
        <!-- Show different buttons based on processing state -->
        <template v-if="persistenceStore.isProcessingOfflineTicks">
          <button @click="persistenceStore.cancelOfflineProgress"
            class="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white px-4 py-2 rounded transition-colors">
            Cancel
          </button>
          <button @click="persistenceStore.skipOfflineProgress"
            class="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors">
            Skip Animation
          </button>
        </template>
        <template v-else>
          <!-- Dismiss button shown when processing is complete -->
          <button @click="dismissModal"
            class="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-4 py-2 rounded w-full transition-colors">
            Continue
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
