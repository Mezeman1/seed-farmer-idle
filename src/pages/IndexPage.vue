<script setup lang="ts">
import { ref } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import FarmsList from '@/components/FarmsList.vue'
import OfflineProgressModal from '@/components/OfflineProgressModal.vue'
import OfflineProgressNotification from '@/components/OfflineProgressNotification.vue'
import { usePersistenceStore } from '@/stores/persistenceStore'
import { useCoreStore } from '@/stores/coreStore'
import { useFarmStore } from '@/stores/farmStore'
import { useTickStore } from '@/stores/tickStore'
import { formatDecimal } from '@/utils/formatting'
import { formatTime } from '@/utils/time-formatting'
import { useSeoMeta } from '@unhead/vue'

// SEO meta tags
useSeoMeta({
  title: 'Seed Farmer - A Tick-Based Idle Game',
  description: 'Grow your seed farm empire in this addictive idle game. Purchase farms, upgrade your production, and watch your seeds multiply!',
  ogTitle: 'Seed Farmer - A Tick-Based Idle Game',
  ogDescription: 'Grow your seed farm empire in this addictive idle game. Purchase farms, upgrade your production, and watch your seeds multiply!',
  ogType: 'website',
  ogImage: '/pwa-512x512.png',
  twitterTitle: 'Seed Farmer - A Tick-Based Idle Game',
  twitterDescription: 'Grow your seed farm empire in this addictive idle game. Purchase farms, upgrade your production, and watch your seeds multiply!',
  twitterCard: 'summary',
})

const persistenceStore = usePersistenceStore()
const coreStore = useCoreStore()
const farmStore = useFarmStore()
const tickStore = useTickStore()
const offlineProgressMessage = ref('')
const offlineSeedsGained = ref('')
const showOfflineMessage = ref(false)

// Handle offline progress notification
const handleGameLoaded = () => {
  // Show offline progress message if applicable
  if (persistenceStore.offlineProgressEnabled && !persistenceStore.isProcessingOfflineTicks) {
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

// Listen for game loaded event
persistenceStore.$subscribe((mutation, state) => {
  if (state.isGameLoaded && !state.isProcessingOfflineTicks) {
    handleGameLoaded()
  }
})

// Dismiss the offline progress message
const dismissOfflineMessage = () => {
  showOfflineMessage.value = false
}
</script>

<template>
  <MainLayout>
    <!-- Offline progress notification component -->
    <OfflineProgressNotification :message="offlineProgressMessage" :seeds-gained="offlineSeedsGained"
      :is-visible="showOfflineMessage" type="success" :auto-close="false" @dismiss="dismissOfflineMessage" />

    <FarmsList />

    <!-- Offline Progress Modal -->
    <OfflineProgressModal />
  </MainLayout>
</template>
