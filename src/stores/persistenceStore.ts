import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useGameStore } from './gameStore'
import Decimal from 'break_infinity.js'

// Constants
const SAVE_KEY = 'seed-farmer-save'
const AUTO_SAVE_INTERVAL = 60000 // Auto-save every minute
const OFFLINE_BATCH_SIZE = 100 // Process this many ticks at once before updating UI

export const usePersistenceStore = defineStore('persistence', () => {
  // State
  const lastSaveTime = ref<number>(Date.now())
  const lastLoadTime = ref<number>(Date.now())
  const autoSaveEnabled = ref<boolean>(true)
  const offlineProgressEnabled = ref<boolean>(true)

  // Offline progress tracking
  const isProcessingOfflineTicks = ref<boolean>(false)
  const offlineTicksToProcess = ref<number>(0)
  const offlineTicksProcessed = ref<number>(0)
  const offlineTimeAway = ref<number>(0)

  // References to other stores
  const gameStore = useGameStore()

  // Auto-save interval
  let autoSaveIntervalId: number | null = null

  // Initialize auto-save on store creation
  const initAutoSave = () => {
    if (autoSaveIntervalId !== null) {
      clearInterval(autoSaveIntervalId)
    }

    if (autoSaveEnabled.value) {
      autoSaveIntervalId = window.setInterval(() => {
        saveGame()
      }, AUTO_SAVE_INTERVAL)
    }
  }

  // Convert game state to a serializable object
  const gameStateToObject = () => {
    return {
      seeds: gameStore.seeds.toString(),
      tickCounter: gameStore.tickCounter,
      lastSaveTime: Date.now(),
      farms: gameStore.farms.map(farm => ({
        id: farm.id,
        manuallyPurchased: farm.manuallyPurchased.toString(),
        totalOwned: farm.totalOwned.toString(),
        owned: farm.owned,
      })),
      tickDuration: gameStore.tickDuration,
    }
  }

  // Save the game state to localStorage
  const saveGame = () => {
    try {
      const saveData = gameStateToObject()
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData))
      lastSaveTime.value = Date.now()
      console.log('Game saved successfully')
      return true
    } catch (error) {
      console.error('Failed to save game:', error)
      return false
    }
  }

  // Load the game state from localStorage
  const loadGame = () => {
    try {
      const saveData = localStorage.getItem(SAVE_KEY)

      if (!saveData) {
        console.log('No save data found')
        return false
      }

      const parsedData = JSON.parse(saveData)

      // Record the load time before processing offline progress
      const currentTime = Date.now()
      lastLoadTime.value = currentTime

      // Calculate offline time
      offlineTimeAway.value = (currentTime - parsedData.lastSaveTime) / 1000

      // Process offline progress if enabled
      if (offlineProgressEnabled.value && offlineTimeAway.value > 0) {
        // Calculate ticks to process
        const ticksToProcess = Math.floor(offlineTimeAway.value / gameStore.tickDuration)

        if (ticksToProcess > 0) {
          // Set up offline progress tracking
          offlineTicksToProcess.value = ticksToProcess
          offlineTicksProcessed.value = 0
          isProcessingOfflineTicks.value = true

          // Start processing in batches
          setTimeout(() => processOfflineProgressInBatches(), 100)

          // Return early - the actual game state will be loaded after offline progress is processed
          return true
        }
      }

      // If no offline progress to process, load the game state immediately
      loadGameState(parsedData)
      return true
    } catch (error) {
      console.error('Failed to load game:', error)
      return false
    }
  }

  // Load game state from parsed data
  const loadGameState = (parsedData: any) => {
    // Load game state
    gameStore.seeds = new Decimal(parsedData.seeds)
    gameStore.tickCounter = parsedData.tickCounter

    // Load farm data
    parsedData.farms.forEach((farmData: any) => {
      const farm = gameStore.farms.find(f => f.id === farmData.id)
      if (farm) {
        farm.manuallyPurchased = new Decimal(farmData.manuallyPurchased)
        farm.totalOwned = new Decimal(farmData.totalOwned)
        farm.owned = farmData.owned
      }
    })

    // Load tick duration if present
    if (parsedData.tickDuration) {
      gameStore.setTickDuration(parsedData.tickDuration)
    }

    console.log('Game loaded successfully')
  }

  // Process offline progress in batches to avoid UI freezing
  const processOfflineProgressInBatches = () => {
    if (!isProcessingOfflineTicks.value) return

    const batchSize = Math.min(OFFLINE_BATCH_SIZE, offlineTicksToProcess.value - offlineTicksProcessed.value)

    if (batchSize <= 0) {
      // All ticks processed, finish up
      isProcessingOfflineTicks.value = false

      // Load the save data again to ensure everything is in sync
      const saveData = localStorage.getItem(SAVE_KEY)
      if (saveData) {
        loadGameState(JSON.parse(saveData))
      }

      // Save the game with the new state after offline progress
      saveGame()
      return
    }

    // Process a batch of ticks
    for (let i = 0; i < batchSize; i++) {
      gameStore.processTick()
      offlineTicksProcessed.value++
    }

    // Schedule the next batch
    setTimeout(() => processOfflineProgressInBatches(), 0)
  }

  // Cancel offline progress processing
  const cancelOfflineProgress = () => {
    isProcessingOfflineTicks.value = false

    // Load the save data again to ensure everything is in sync
    const saveData = localStorage.getItem(SAVE_KEY)
    if (saveData) {
      loadGameState(JSON.parse(saveData))
    }
  }

  // Skip offline progress processing and apply all at once
  const skipOfflineProgress = () => {
    if (!isProcessingOfflineTicks.value) return

    // Process all remaining ticks at once
    const remainingTicks = offlineTicksToProcess.value - offlineTicksProcessed.value

    for (let i = 0; i < remainingTicks; i++) {
      gameStore.processTick()
    }

    offlineTicksProcessed.value = offlineTicksToProcess.value
    isProcessingOfflineTicks.value = false

    // Save the game with the new state
    saveGame()
  }

  // Reset save data (for debugging or prestige)
  const resetSaveData = () => {
    try {
      localStorage.removeItem(SAVE_KEY)
      console.log('Save data reset successfully')
      return true
    } catch (error) {
      console.error('Failed to reset save data:', error)
      return false
    }
  }

  // Toggle auto-save
  const toggleAutoSave = () => {
    autoSaveEnabled.value = !autoSaveEnabled.value
    initAutoSave()
  }

  // Toggle offline progress
  const toggleOfflineProgress = () => {
    offlineProgressEnabled.value = !offlineProgressEnabled.value
  }

  // Initialize auto-save when the store is created
  initAutoSave()

  // Clean up interval when the app is unmounted
  const cleanup = () => {
    if (autoSaveIntervalId !== null) {
      clearInterval(autoSaveIntervalId)
      autoSaveIntervalId = null
    }
  }

  return {
    lastSaveTime,
    lastLoadTime,
    autoSaveEnabled,
    offlineProgressEnabled,
    isProcessingOfflineTicks,
    offlineTicksToProcess,
    offlineTicksProcessed,
    offlineTimeAway,
    saveGame,
    loadGame,
    resetSaveData,
    toggleAutoSave,
    toggleOfflineProgress,
    cancelOfflineProgress,
    skipOfflineProgress,
    cleanup
  }
})
