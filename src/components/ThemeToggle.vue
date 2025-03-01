<script setup lang="ts">
import { useGameStore } from '@/stores/gameStore'

// Use the game store for theme management
const gameStore = useGameStore()
</script>

<template>
  <div class="flex items-center justify-between">
    <span class="text-amber-900 dark:text-amber-100">Dark Mode:</span>
    <button @click="gameStore.toggleTheme"
      class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none"
      :class="gameStore.isDarkMode ? 'bg-green-600' : 'bg-amber-300'">
      <span class="sr-only">Toggle dark mode</span>
      <span class="inline-block w-4 h-4 transform bg-white rounded-full transition-transform"
        :class="gameStore.isDarkMode ? 'translate-x-6' : 'translate-x-1'">
      </span>
      <span v-if="gameStore.isDarkMode" class="absolute left-1 text-xs">🌙</span>
      <span v-else class="absolute right-1 text-xs">☀️</span>
    </button>
  </div>
</template>
