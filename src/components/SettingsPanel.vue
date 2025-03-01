<script setup lang="ts">
import { ref } from 'vue'
import { usePersistenceStore } from '@/stores/persistenceStore'
import ThemeToggle from './ThemeToggle.vue'

const props = defineProps<{
    onClose: () => void
}>()

const persistenceStore = usePersistenceStore()
const showSaveNotification = ref(false)
const showExportNotification = ref(false)
const showImportSuccessNotification = ref(false)
const showImportErrorNotification = ref(false)
const importInput = ref<HTMLInputElement | null>(null)

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
    }
}

// Export game data to clipboard
const exportGameData = () => {
    const exportData = persistenceStore.exportGameData()
    if (exportData) {
        // Copy to clipboard
        navigator.clipboard.writeText(exportData).then(() => {
            showExportNotification.value = true
            setTimeout(() => {
                showExportNotification.value = false
            }, 2000)
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err)
            // Fallback: create a textarea element to copy from
            const textarea = document.createElement('textarea')
            textarea.value = exportData
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)

            showExportNotification.value = true
            setTimeout(() => {
                showExportNotification.value = false
            }, 2000)
        })
    }
}

// Trigger file input for import
const triggerImportInput = () => {
    if (importInput.value) {
        importInput.value.click()
    }
}

// Handle import from text input
const importGameData = () => {
    const importData = prompt('Paste your exported game data here:')
    if (importData) {
        try {
            const success = persistenceStore.importGameData(importData)
            if (success) {
                showImportSuccessNotification.value = true
                setTimeout(() => {
                    showImportSuccessNotification.value = false
                }, 2000)
            } else {
                showImportErrorNotification.value = true
                setTimeout(() => {
                    showImportErrorNotification.value = false
                }, 2000)
            }
        } catch (error) {
            console.error('Import error:', error)
            showImportErrorNotification.value = true
            setTimeout(() => {
                showImportErrorNotification.value = false
            }, 2000)
        }
    }
}

// Format a timestamp to a readable date/time
const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString()
}
</script>

<template>
    <div class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-30" @click="onClose">
        <div class="absolute top-0 left-0 right-0 bg-amber-50 dark:bg-gray-800 rounded-b-xl p-4 transform transition-transform duration-300 max-h-[90vh] overflow-y-auto"
            @click.stop>
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-amber-900 dark:text-amber-100">Settings</h2>
                <button @click="onClose"
                    class="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Game Settings -->
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-green-700 dark:text-green-500 mb-2">Game Settings</h3>
                <div class="space-y-3 bg-amber-100/50 dark:bg-gray-700/50 p-3 rounded-md">
                    <div class="flex items-center justify-between">
                        <span class="text-amber-900 dark:text-amber-100">Auto-Save:</span>
                        <button @click="persistenceStore.toggleAutoSave"
                            :class="persistenceStore.autoSaveEnabled ? 'bg-green-600' : 'bg-amber-300 dark:bg-amber-700'"
                            class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none">
                            <span :class="persistenceStore.autoSaveEnabled ? 'translate-x-6' : 'translate-x-1'"
                                class="inline-block w-4 h-4 transform bg-white rounded-full transition-transform"></span>
                        </button>
                    </div>

                    <div class="flex items-center justify-between">
                        <span class="text-amber-900 dark:text-amber-100">Offline Progress:</span>
                        <button @click="persistenceStore.toggleOfflineProgress"
                            :class="persistenceStore.offlineProgressEnabled ? 'bg-green-600' : 'bg-amber-300 dark:bg-amber-700'"
                            class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none">
                            <span :class="persistenceStore.offlineProgressEnabled ? 'translate-x-6' : 'translate-x-1'"
                                class="inline-block w-4 h-4 transform bg-white rounded-full transition-transform"></span>
                        </button>
                    </div>

                    <ThemeToggle />
                </div>
            </div>

            <!-- Save/Load Section -->
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-green-700 dark:text-green-500 mb-2">Save & Load</h3>
                <div class="space-y-2 bg-amber-100/50 dark:bg-gray-700/50 p-3 rounded-md">
                    <div class="text-sm text-amber-800 dark:text-amber-200">
                        <div>Last Save: {{ formatTimestamp(persistenceStore.lastSaveTime) }}</div>
                        <div>Last Load: {{ formatTimestamp(persistenceStore.lastLoadTime) }}</div>
                    </div>
                    <div class="flex space-x-2 mt-2">
                        <button @click="saveGame"
                            class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center justify-center transition-colors">
                            <span class="mr-1">💾</span> Save Game
                        </button>
                        <button @click="persistenceStore.loadGame"
                            class="flex-1 bg-amber-400 hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-700 text-amber-900 dark:text-white py-2 px-4 rounded-md transition-colors">
                            Load Game
                        </button>
                    </div>
                </div>
            </div>

            <!-- Data Management Section -->
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-blue-700 dark:text-blue-500 mb-2">Data Management</h3>
                <div class="space-y-2 bg-amber-100/50 dark:bg-gray-700/50 p-3 rounded-md">
                    <p class="text-sm text-amber-800 dark:text-amber-200 mb-2">
                        Export your save data to back it up or transfer it to another device.
                    </p>
                    <div class="flex space-x-2">
                        <button @click="exportGameData"
                            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center justify-center transition-colors">
                            <span class="mr-1">📤</span> Export Save
                        </button>
                        <button @click="importGameData"
                            class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md flex items-center justify-center transition-colors">
                            <span class="mr-1">📥</span> Import Save
                        </button>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Note: Importing will overwrite your current save data.
                    </p>
                </div>
            </div>

            <!-- Danger Zone -->
            <div>
                <h3 class="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
                <div class="bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
                    <p class="text-sm text-red-700 dark:text-red-300 mb-3">
                        Resetting your progress will permanently delete all your game data. This action cannot be
                        undone.
                    </p>
                    <button @click="confirmResetSave"
                        class="w-full bg-red-100 hover:bg-red-200 dark:bg-red-800/30 dark:hover:bg-red-800/50 text-red-600 dark:text-red-300 border border-red-300 dark:border-red-700 py-2 px-4 rounded-md transition-colors">
                        Reset All Progress
                    </button>
                </div>
            </div>
        </div>

        <!-- Notifications -->
        <!-- Save notification -->
        <div v-if="showSaveNotification"
            class="fixed top-20 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-md z-40 flex items-center">
            <span class="mr-2">✓</span> Game saved successfully!
        </div>

        <!-- Export notification -->
        <div v-if="showExportNotification"
            class="fixed top-20 right-4 bg-blue-600 text-white px-4 py-2 rounded-md shadow-md z-40 flex items-center">
            <span class="mr-2">✓</span> Save data copied to clipboard!
        </div>

        <!-- Import success notification -->
        <div v-if="showImportSuccessNotification"
            class="fixed top-20 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-md z-40 flex items-center">
            <span class="mr-2">✓</span> Save data imported successfully!
        </div>

        <!-- Import error notification -->
        <div v-if="showImportErrorNotification"
            class="fixed top-20 right-4 bg-red-600 text-white px-4 py-2 rounded-md shadow-md z-40 flex items-center">
            <span class="mr-2">✗</span> Failed to import save data!
        </div>
    </div>
</template>
