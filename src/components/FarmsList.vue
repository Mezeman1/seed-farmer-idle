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
            <h2 class="text-2xl font-bold text-center md:text-left">Your Farms</h2>

            <!-- Debug button to force a tick -->
            <HoldButton v-if="coreStore.isDebugMode" @click="forceTick" variant="warning" size="sm">
                Force Tick
            </HoldButton>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FarmItem v-for="(farm, index) in farmStore.farms" :key="farm.id" :farm-id="index" />
        </div>
    </div>
</template>
