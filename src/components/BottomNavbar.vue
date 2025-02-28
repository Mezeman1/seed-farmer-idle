<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePersistenceStore } from '@/stores/persistenceStore'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const persistenceStore = usePersistenceStore()
const showSettingsDialog = ref(false)
const showSaveNotification = ref(false)
const activeTab = ref('home')

// Initialize active tab based on current route
onMounted(() => {
    if (route.path === '/machines') {
        activeTab.value = 'machines'
    } else {
        activeTab.value = 'home'
    }
})

// Navigate to a tab
const navigateTo = (tab: string) => {
    // If already on this tab, do nothing
    if (activeTab.value === tab) return

    activeTab.value = tab

    if (tab === 'home') {
        router.replace('/') // Use replace instead of push to avoid history stacking
    } else if (tab === 'machines') {
        router.replace('/machines') // Use replace instead of push to avoid history stacking
    }
}

// Save game function
const saveGame = () => {
    if (persistenceStore.saveGame()) {
        showSaveNotification.value = true
        setTimeout(() => {
            showSaveNotification.value = false
        }, 2000)
    }
}

// Reset save data with confirmation
const confirmResetSave = () => {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
        persistenceStore.resetSaveData()
        window.location.reload()
    }
}

// Format a timestamp to a readable date/time
const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString()
}
</script>

<template>
    <!-- Bottom Navigation Bar -->
    <nav class="fixed bottom-0 left-0 right-0 bg-green-800 text-white z-20">
        <div class="flex justify-around items-center h-16">
            <!-- Home Button -->
            <button @click="navigateTo('home')" :class="['flex flex-col items-center justify-center w-1/3 h-full',
                activeTab === 'home' ? 'bg-green-700' : 'hover:bg-green-700']">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span class="text-xs mt-1">Farms</span>
            </button>

            <!-- Machines Button -->
            <button @click="navigateTo('machines')" :class="['flex flex-col items-center justify-center w-1/3 h-full',
                activeTab === 'machines' ? 'bg-green-700' : 'hover:bg-green-700']">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span class="text-xs mt-1">Machines</span>
            </button>

            <!-- Settings Button -->
            <button @click="showSettingsDialog = true"
                class="flex flex-col items-center justify-center w-1/3 h-full hover:bg-green-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span class="text-xs mt-1">Settings</span>
            </button>
        </div>
    </nav>

    <!-- Settings Dialog (slides up from bottom) -->
    <div v-if="showSettingsDialog" class="fixed inset-0 bg-black bg-opacity-50 z-30"
        @click="showSettingsDialog = false">
        <div class="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4 transform transition-transform duration-300"
            @click.stop>
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-green-800">Settings</h2>
                <button @click="showSettingsDialog = false" class="text-gray-500 hover:text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Game Settings -->
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-green-700 mb-2">Game Settings</h3>
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <span>Auto-Save:</span>
                        <button @click="persistenceStore.toggleAutoSave"
                            :class="persistenceStore.autoSaveEnabled ? 'bg-green-600' : 'bg-gray-400'"
                            class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none">
                            <span :class="persistenceStore.autoSaveEnabled ? 'translate-x-6' : 'translate-x-1'"
                                class="inline-block w-4 h-4 transform bg-white rounded-full transition-transform"></span>
                        </button>
                    </div>
                    <div class="flex items-center justify-between">
                        <span>Offline Progress:</span>
                        <button @click="persistenceStore.toggleOfflineProgress"
                            :class="persistenceStore.offlineProgressEnabled ? 'bg-green-600' : 'bg-gray-400'"
                            class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none">
                            <span :class="persistenceStore.offlineProgressEnabled ? 'translate-x-6' : 'translate-x-1'"
                                class="inline-block w-4 h-4 transform bg-white rounded-full transition-transform"></span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Save/Load Section -->
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-green-700 mb-2">Save & Load</h3>
                <div class="space-y-2">
                    <div class="text-sm text-gray-600">
                        <div>Last Save: {{ formatTimestamp(persistenceStore.lastSaveTime) }}</div>
                        <div>Last Load: {{ formatTimestamp(persistenceStore.lastLoadTime) }}</div>
                    </div>
                    <div class="flex space-x-2 mt-2">
                        <button @click="saveGame"
                            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center justify-center">
                            <span class="mr-1">💾</span> Save Game
                        </button>
                        <button @click="persistenceStore.loadGame"
                            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
                            Load Game
                        </button>
                    </div>
                </div>
            </div>

            <!-- Danger Zone -->
            <div>
                <h3 class="text-lg font-semibold text-red-600 mb-2">Danger Zone</h3>
                <button @click="confirmResetSave"
                    class="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded">
                    Reset All Progress
                </button>
            </div>
        </div>
    </div>

    <!-- Save notification -->
    <div v-if="showSaveNotification"
        class="fixed bottom-20 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-40">
        Game saved successfully!
    </div>
</template>

<style scoped>
/* Add some padding to the bottom of the page to account for the navbar */
:deep(body) {
    padding-bottom: 4rem;
}
</style>
