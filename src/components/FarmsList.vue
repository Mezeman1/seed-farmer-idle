<script setup lang="ts">
import { useGameStore } from '@/stores/gameStore'
import FarmItem from './FarmItem.vue'

const gameStore = useGameStore()

// Force a tick (debug feature)
const forceTick = () => {
    gameStore.processTick()
}
</script>

<template>
    <div class="container mx-auto px-4 py-6 pb-24">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-center md:text-left">Your Farms</h2>

            <!-- Debug button to force a tick -->
            <button v-if="gameStore.isDebugMode" @click="forceTick"
                class="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm">
                Force Tick
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FarmItem v-for="(farm, index) in gameStore.farms" :key="farm.id" :farm-id="index" />
        </div>
    </div>
</template>
