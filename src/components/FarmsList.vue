<script setup lang="ts">
import { useFarmStore } from '@/stores/farmStore'
import { useTickStore } from '@/stores/tickStore'
import { useCoreStore } from '@/stores/coreStore'
import FarmItem from './FarmItem.vue'
import HoldButton from './HoldButton.vue'

const farmStore = useFarmStore()
const tickStore = useTickStore()
const coreStore = useCoreStore()

// Force a tick (debug feature)
const forceTick = () => {
  tickStore.processTick()
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 pb-24">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-amber-900 flex items-center">
        <span class="mr-2">🌾</span> Your Farms
      </h2>

      <!-- Debug button to force a tick -->
      <HoldButton v-if="coreStore.isDebugMode" @click="forceTick" variant="warning" size="sm"
        class="bg-amber-200 hover:bg-amber-300 text-amber-900 transition-colors">
        <span class="flex items-center">
          <span class="mr-1">⏱️</span> Force Tick
        </span>
      </HoldButton>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <FarmItem v-for="(farm, index) in farmStore.farms" :key="farm.id" :farm-id="index" />

      <!-- Empty state when no farms are available -->
      <div v-if="farmStore.farms.length === 0"
        class="bg-amber-50 rounded-lg shadow-sm p-8 border border-amber-200 text-center col-span-full">
        <p class="text-amber-800 text-lg">No farms available yet. Check back soon!</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add some subtle animation for when farms are added */
.grid>* {
  animation: fade-in 0.5s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
