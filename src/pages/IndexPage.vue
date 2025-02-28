<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import GameHeader from '@/components/GameHeader.vue'
import FarmsList from '@/components/FarmsList.vue'
import BottomNavbar from '@/components/BottomNavbar.vue'
import OfflineProgressModal from '@/components/OfflineProgressModal.vue'
import OfflineProgressNotification from '@/components/OfflineProgressNotification.vue'
import DebugPanel from '@/components/DebugPanel.vue'
import { usePersistenceStore } from '@/stores/persistenceStore'
import { useCoreStore } from '@/stores/coreStore'
import { useFarmStore } from '@/stores/farmStore'
import { useTickStore } from '@/stores/tickStore'
import { formatDecimal } from '@/utils/formatting'
import { formatTime } from '@/utils/time-formatting'

const persistenceStore = usePersistenceStore()
const coreStore = useCoreStore()
const farmStore = useFarmStore()
const tickStore = useTickStore()
const offlineProgressMessage = ref('')
const offlineSeedsGained = ref('')
const showOfflineMessage = ref(false)

// Load saved game on mount
onMounted(() => {
  // Only load the game if it hasn't been loaded already
  if (!persistenceStore.isGameLoaded) {
    const loadResult = persistenceStore.loadGame()

    // Show offline progress message if applicable
    if (loadResult && persistenceStore.offlineProgressEnabled && !persistenceStore.isProcessingOfflineTicks) {
      const offlineTime = Math.floor(persistenceStore.offlineTimeAway)
      if (offlineTime > 60) {
        offlineProgressMessage.value = `Welcome back! You were away for ${formatTime(offlineTime)}.`
        // Calculate approximate seeds gained (based on current production rate)
        const seedsPerTick = farmStore.calculateTotalSeedsPerTick()
        const approxTicks = Math.floor(offlineTime / tickStore.tickDuration)
        const approxSeedsGained = seedsPerTick.times(approxTicks)
        offlineSeedsGained.value = formatDecimal(approxSeedsGained)
        showOfflineMessage.value = true
      }
    }
  }
})

// Clean up on unmount
onUnmounted(() => {
  persistenceStore.cleanup()
})

// Dismiss the offline progress message
const dismissOfflineMessage = () => {
  showOfflineMessage.value = false
}
</script>

<template>
  <div class="min-h-screen bg-green-50">
    <GameHeader />

    <main class="pb-20">
      <!-- Offline progress notification component -->
      <OfflineProgressNotification :message="offlineProgressMessage" :seeds-gained="offlineSeedsGained"
        :is-visible="showOfflineMessage" type="success" :auto-close="false" @dismiss="dismissOfflineMessage" />

      <!-- Debug Panel (outside of header, only visible in debug mode) -->
      <div v-if="coreStore.isDebugMode" class="mx-4 mt-4">
        <DebugPanel />
      </div>

      <FarmsList />
    </main>

    <!-- Bottom Navigation Bar -->
    <BottomNavbar />

    <!-- Offline Progress Modal -->
    <OfflineProgressModal />
  </div>
</template>
