<script setup lang="ts">
import { useGameStore } from '@/stores/game'
import { onMounted, onUnmounted } from 'vue'

const store = useGameStore()

// Update progress every 100ms
let intervalId: number | null = null

onMounted(() => {
    intervalId = window.setInterval(() => {
        store.updateTickProgress()
    }, 100)
})

onUnmounted(() => {
    if (intervalId !== null) {
        clearInterval(intervalId)
    }
})
</script>

<template>
    <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-2">
        <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-100 ease-linear"
            :style="{ width: `${store.tickProgress}%` }"></div>
    </div>
    <div class="text-xs text-center text-gray-500">
        Next tick in {{ Math.ceil((100 - store.tickProgress) / 100 * store.tickInterval / 1000) }}s
    </div>
</template>
