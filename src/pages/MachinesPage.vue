<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import GameHeader from '@/components/GameHeader.vue'
import MachinesList from '@/components/MachinesList.vue'
import BottomNavbar from '@/components/BottomNavbar.vue'
import { usePersistenceStore } from '@/stores/persistenceStore'
import { useCoreStore } from '@/stores/coreStore'

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
    <div class="min-h-screen bg-green-50">
        <GameHeader />

        <main class="pb-20">
            <MachinesList />
        </main>

        <!-- Bottom Navigation Bar -->
        <BottomNavbar />
    </div>
</template>
