<script setup lang="ts">
import { computed } from 'vue'
import { usePersistenceStore } from '@/stores/persistenceStore'
import { formatDecimal } from '@/utils/formatting'

const persistenceStore = usePersistenceStore()

// Computed properties
const progressPercentage = computed(() => {
    if (persistenceStore.offlineTicksToProcess === 0) return 0
    return (persistenceStore.offlineTicksProcessed / persistenceStore.offlineTicksToProcess) * 100
})

// Format time in seconds to a readable string
const formatTime = (seconds: number): string => {
    if (seconds < 60) {
        return `${Math.floor(seconds)} seconds`
    } else if (seconds < 3600) {
        return `${Math.floor(seconds / 60)} minutes`
    } else if (seconds < 86400) {
        return `${Math.floor(seconds / 3600)} hours`
    } else {
        return `${Math.floor(seconds / 86400)} days`
    }
}
</script>

<template>
    <div v-if="persistenceStore.isProcessingOfflineTicks"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 class="text-xl font-bold text-green-800 mb-4">Welcome Back!</h2>

            <p class="mb-4 text-gray-700">
                You were away for {{ formatTime(persistenceStore.offlineTimeAway) }}.
                Processing {{ persistenceStore.offlineTicksToProcess }} ticks...
            </p>

            <div class="mb-4">
                <div class="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress:</span>
                    <span>{{ persistenceStore.offlineTicksProcessed }} / {{ persistenceStore.offlineTicksToProcess }}
                        ticks</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div class="bg-green-600 h-2.5 rounded-full transition-all duration-100"
                        :style="{ width: `${progressPercentage}%` }"></div>
                </div>
            </div>

            <div class="flex justify-between">
                <button @click="persistenceStore.cancelOfflineProgress"
                    class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
                    Cancel
                </button>
                <button @click="persistenceStore.skipOfflineProgress"
                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                    Skip Animation
                </button>
            </div>
        </div>
    </div>
</template>
