<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import GameHeader from '@/components/GameHeader.vue'
import BottomNavbar from '@/components/BottomNavbar.vue'
import { usePersistenceStore } from '@/stores/persistenceStore'
import { useCoreStore } from '@/stores/coreStore'

// Define props
const props = defineProps({
  bgColor: {
    type: String,
    default: 'bg-amber-50 dark:bg-gray-900'
  }
})

const persistenceStore = usePersistenceStore()
const coreStore = useCoreStore()

// Load saved game on mount if not already loaded
onMounted(() => {
  // Check if game is already loaded
  if (!persistenceStore.isGameLoaded) {
    persistenceStore.loadGame()
  }
})

// Clean up on unmount
onUnmounted(() => {
  persistenceStore.cleanup()
})
</script>

<template>
  <div class="min-h-screen relative transition-colors duration-300" :class="bgColor">
    <!-- Background pattern for farm feel -->
    <div class="absolute inset-0 z-0 pattern-bg"></div>

    <div class="relative z-10">
      <GameHeader />

      <main class="pb-20 px-4 md:px-6 max-w-5xl mx-auto">
        <!-- Main content slot -->
        <slot></slot>
      </main>

      <!-- Bottom Navigation Bar -->
      <BottomNavbar />
    </div>
  </div>
</template>

<style scoped>
.pattern-bg {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23a16207' fill-opacity='0.03' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E");
  pointer-events: none;
}

:global(.dark) .pattern-bg {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23fbbf24' fill-opacity='0.03' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E");
}
</style>
