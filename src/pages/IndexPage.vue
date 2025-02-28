<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import GameHeader from '@/components/GameHeader.vue'
import FarmsList from '@/components/FarmsList.vue'
import BottomNavbar from '@/components/BottomNavbar.vue'
import OfflineProgressModal from '@/components/OfflineProgressModal.vue'
import { usePersistenceStore } from '@/stores/persistenceStore'
import { formatDecimal } from '@/utils/formatting'

const persistenceStore = usePersistenceStore()
const offlineProgressMessage = ref('')

// Load saved game on mount
onMounted(() => {
  // Load the game
  const loadResult = persistenceStore.loadGame()

  // Show offline progress message if applicable
  if (loadResult && persistenceStore.offlineProgressEnabled && !persistenceStore.isProcessingOfflineTicks) {
    const offlineTime = Math.floor(persistenceStore.offlineTimeAway)
    if (offlineTime > 60) {
      offlineProgressMessage.value = `Welcome back! You were away for ${formatTime(offlineTime)}.`
      setTimeout(() => {
        offlineProgressMessage.value = ''
      }, 5000)
    }
  }
})

// Clean up on unmount
onUnmounted(() => {
  persistenceStore.cleanup()
})

// Format time in seconds to a readable string
const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} seconds`
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
  <div class="min-h-screen bg-green-50">
    <GameHeader />

    <main class="pb-20">
      <div v-if="offlineProgressMessage" class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4 mx-4">
        <p>{{ offlineProgressMessage }}</p>
      </div>

      <FarmsList />
    </main>

    <!-- Bottom Navigation Bar -->
    <BottomNavbar />

    <!-- Offline Progress Modal -->
    <OfflineProgressModal />
  </div>
</template>
