import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useGameStore } from './gameStore'
import { useCoreStore } from './coreStore'
import { useFarmStore } from './farmStore'
import { useMachineStore } from './machineStore'
import { useTickStore } from './tickStore'
import Decimal from 'break_infinity.js'

// Constants
const SAVE_KEY_PREFIX = 'seed-farmer'
const SAVE_KEY_CORE = `${SAVE_KEY_PREFIX}-core`
const SAVE_KEY_FARMS = `${SAVE_KEY_PREFIX}-farms`
const SAVE_KEY_MACHINES = `${SAVE_KEY_PREFIX}-machines`
const SAVE_KEY_META = `${SAVE_KEY_PREFIX}-meta` // For metadata like last save time
const AUTO_SAVE_INTERVAL = 60000 // Auto-save every minute
const OFFLINE_BATCH_SIZE = 100 // Process this many ticks at once before updating UI
const SAVE_DEBOUNCE_DELAY = 2000 // Debounce delay for saving (2 seconds)

export const usePersistenceStore = defineStore('persistence', () => {
  // State
  const lastSaveTime = ref<number>(Date.now())
  const lastLoadTime = ref<number>(Date.now())
  const autoSaveEnabled = ref<boolean>(true)
  const offlineProgressEnabled = ref<boolean>(true)
  const isGameLoaded = ref<boolean>(false) // Track if game has been loaded
  const isSaving = ref<boolean>(false) // Track if a save is in progress

  // Offline progress tracking
  const isProcessingOfflineTicks = ref<boolean>(false)
  const offlineTicksToProcess = ref<number>(0)
  const offlineTicksProcessed = ref<number>(0)
  const offlineTimeAway = ref<number>(0)
  const offlineSeedsGained = ref<Decimal>(new Decimal(0))

  // References to other stores
  const gameStore = useGameStore()
  const coreStore = useCoreStore()
  const farmStore = useFarmStore()
  const machineStore = useMachineStore()
  const tickStore = useTickStore()

  // Auto-save interval
  let autoSaveIntervalId: number | null = null

  // ===== CORE DATA PERSISTENCE =====

  // Convert core game state to a serializable object
  const coreStateToObject = () => {
    return {
      seeds: coreStore.seeds.toString(),
      tickCounter: coreStore.tickCounter,
      multipliers: coreStore.multipliers,
    }
  }

  // Save core game state
  const saveCoreState = () => {
    try {
      const coreData = coreStateToObject()
      localStorage.setItem(SAVE_KEY_CORE, JSON.stringify(coreData))
      return true
    } catch (error) {
      console.error('Failed to save core game state:', error)
      return false
    }
  }

  // Load core game state
  const loadCoreState = () => {
    try {
      const coreData = localStorage.getItem(SAVE_KEY_CORE)
      if (!coreData) return false

      const parsedData = JSON.parse(coreData)

      // Load seeds
      if (parsedData.seeds) {
        coreStore.seeds = new Decimal(parsedData.seeds)
      }

      // Load tick counter
      if (typeof parsedData.tickCounter === 'number') {
        coreStore.tickCounter = parsedData.tickCounter
      }

      // Load multipliers
      if (parsedData.multipliers && typeof parsedData.multipliers === 'object') {
        Object.keys(parsedData.multipliers).forEach(key => {
          coreStore.updateMultiplier(key, parsedData.multipliers[key])
        })
      }

      return true
    } catch (error) {
      console.error('Failed to load core game state:', error)
      return false
    }
  }

  // ===== FARMS PERSISTENCE =====

  // Convert farms state to a serializable object
  const farmsStateToObject = () => {
    return {
      farms: farmStore.farms.map(farm => ({
        id: farm.id,
        manuallyPurchased: farm.manuallyPurchased.toString(),
        totalOwned: farm.totalOwned.toString(),
        owned: farm.owned,
        multiplier: farm.multiplier,
      })),
    }
  }

  // Save farms state
  const saveFarmsState = () => {
    try {
      const farmsData = farmsStateToObject()
      localStorage.setItem(SAVE_KEY_FARMS, JSON.stringify(farmsData))
      return true
    } catch (error) {
      console.error('Failed to save farms state:', error)
      return false
    }
  }

  // Load farms state
  const loadFarmsState = () => {
    try {
      const farmsData = localStorage.getItem(SAVE_KEY_FARMS)
      if (!farmsData) return false

      const parsedData = JSON.parse(farmsData)

      // Load farms
      if (Array.isArray(parsedData.farms)) {
        parsedData.farms.forEach((savedFarm: any) => {
          const farmIndex = farmStore.farms.findIndex(f => f.id === savedFarm.id)
          if (farmIndex !== -1) {
            const farm = farmStore.farms[farmIndex]
            if (savedFarm.manuallyPurchased) {
              farm.manuallyPurchased = new Decimal(savedFarm.manuallyPurchased)
            }
            if (savedFarm.totalOwned) {
              farm.totalOwned = new Decimal(savedFarm.totalOwned)
            }
            if (typeof savedFarm.owned === 'boolean') {
              farm.owned = savedFarm.owned
            }
            if (typeof savedFarm.multiplier === 'number') {
              farm.multiplier = savedFarm.multiplier
            }
          }
        })
      }

      return true
    } catch (error) {
      console.error('Failed to load farms state:', error)
      return false
    }
  }

  // ===== MACHINES PERSISTENCE =====

  // Convert machines state to a serializable object
  const machinesStateToObject = () => {
    return {
      machines: machineStore.machines.map(machine => ({
        id: machine.id,
        points: machine.points,
        totalTicksForCurrentLevel: machine.totalTicksForCurrentLevel,
        level: machine.level,
        unlocked: machine.unlocked,
        upgrades: machine.upgrades.map(upgrade => ({
          id: upgrade.id,
          level: upgrade.level,
        })),
      })),
    }
  }

  // Save machines state
  const saveMachinesState = () => {
    try {
      const machinesData = machinesStateToObject()
      localStorage.setItem(SAVE_KEY_MACHINES, JSON.stringify(machinesData))
      return true
    } catch (error) {
      console.error('Failed to save machines state:', error)
      return false
    }
  }

  // Load machines state
  const loadMachinesState = () => {
    try {
      const machinesData = localStorage.getItem(SAVE_KEY_MACHINES)
      if (!machinesData) return false

      const parsedData = JSON.parse(machinesData)

      // Load machines
      if (Array.isArray(parsedData.machines)) {
        parsedData.machines.forEach((savedMachine: any) => {
          const machineIndex = machineStore.machines.findIndex(m => m.id === savedMachine.id)
          if (machineIndex !== -1) {
            const machine = machineStore.machines[machineIndex]

            if (typeof savedMachine.points === 'number') {
              machine.points = savedMachine.points
            }

            if (typeof savedMachine.totalTicksForCurrentLevel === 'number') {
              machine.totalTicksForCurrentLevel = savedMachine.totalTicksForCurrentLevel
            }

            if (typeof savedMachine.level === 'number') {
              machine.level = savedMachine.level
            }

            if (typeof savedMachine.unlocked === 'boolean') {
              machine.unlocked = savedMachine.unlocked
            }

            // Load upgrades
            if (Array.isArray(savedMachine.upgrades)) {
              savedMachine.upgrades.forEach((savedUpgrade: any) => {
                const upgradeIndex = machine.upgrades.findIndex(u => u.id === savedUpgrade.id)
                if (upgradeIndex !== -1) {
                  const upgrade = machine.upgrades[upgradeIndex]
                  if (typeof savedUpgrade.level === 'number') {
                    upgrade.level = savedUpgrade.level
                  }
                }
              })
            }
          }
        })
      }

      return true
    } catch (error) {
      console.error('Failed to load machines state:', error)
      return false
    }
  }

  // ===== METADATA PERSISTENCE =====

  // Save metadata
  const saveMetadata = () => {
    try {
      const metaData = {
        lastSaveTime: Date.now(),
        autoSaveEnabled: autoSaveEnabled.value,
        offlineProgressEnabled: offlineProgressEnabled.value,
      }
      localStorage.setItem(SAVE_KEY_META, JSON.stringify(metaData))
      return true
    } catch (error) {
      console.error('Failed to save metadata:', error)
      return false
    }
  }

  // Load metadata
  const loadMetadata = () => {
    try {
      const metaData = localStorage.getItem(SAVE_KEY_META)
      if (!metaData) return false

      const parsedData = JSON.parse(metaData)

      // Load last save time
      if (parsedData.lastSaveTime) {
        lastSaveTime.value = parsedData.lastSaveTime
      }

      // Load auto-save setting
      if (typeof parsedData.autoSaveEnabled === 'boolean') {
        autoSaveEnabled.value = parsedData.autoSaveEnabled
      }

      // Load offline progress setting
      if (typeof parsedData.offlineProgressEnabled === 'boolean') {
        offlineProgressEnabled.value = parsedData.offlineProgressEnabled
      }

      return true
    } catch (error) {
      console.error('Failed to load metadata:', error)
      return false
    }
  }

  // ===== MAIN SAVE/LOAD FUNCTIONS =====

  // Save the entire game state (actual implementation)
  const performSave = () => {
    try {
      // Set saving flag
      isSaving.value = true

      // Save each module
      saveCoreState()
      saveFarmsState()
      saveMachinesState()
      saveMetadata()

      lastSaveTime.value = Date.now()
      console.log('Game saved successfully')

      // Clear saving flag
      isSaving.value = false
      return true
    } catch (error) {
      console.error('Failed to save game:', error)
      isSaving.value = false
      return false
    }
  }

  // Create a debounced version of performSave using VueUse
  const debouncedSave = useDebounceFn(performSave, SAVE_DEBOUNCE_DELAY)

  // Debounced save function
  const saveGame = () => {
    // If a save is already in progress, don't schedule another one
    if (isSaving.value) return false

    // Use the VueUse debounced function
    debouncedSave()
    return true
  }

  // Force an immediate save (bypasses debounce)
  const forceSave = () => {
    // Perform the save immediately without canceling
    return performSave()
  }

  // Load the entire game state
  const loadGame = () => {
    try {
      // Load metadata first to get the last save time
      loadMetadata()

      // Record the load time before processing offline progress
      const currentTime = Date.now()
      lastLoadTime.value = currentTime

      // Calculate offline time
      offlineTimeAway.value = (currentTime - lastSaveTime.value) / 1000

      // Process offline progress if enabled
      if (offlineProgressEnabled.value && offlineTimeAway.value > 0) {
        // Calculate ticks to process
        const ticksToProcess = Math.floor(offlineTimeAway.value / tickStore.tickDuration)

        if (ticksToProcess > 0) {
          // Load the game state first
          loadCoreState()
          loadFarmsState()
          loadMachinesState()

          // Update multipliers after loading
          machineStore.updateMultipliers()
          farmStore.updateFarmMultipliers()

          // Set up offline progress tracking
          offlineTicksToProcess.value = ticksToProcess
          offlineTicksProcessed.value = 0
          offlineSeedsGained.value = new Decimal(0) // Reset seeds gained counter
          isProcessingOfflineTicks.value = true

          // Start processing in batches
          setTimeout(() => processOfflineProgressInBatches(), 100)

          // Mark as loaded
          isGameLoaded.value = true
          return true
        }
      }

      // If no offline progress to process, load the game state immediately
      loadCoreState()
      loadFarmsState()
      loadMachinesState()

      // Update multipliers after loading
      machineStore.updateMultipliers()
      farmStore.updateFarmMultipliers()

      isGameLoaded.value = true
      return true
    } catch (error) {
      console.error('Failed to load game:', error)
      isGameLoaded.value = true // Mark as loaded even if there was an error
      return false
    }
  }

  // Process offline progress in batches to avoid UI freezing
  const processOfflineProgressInBatches = () => {
    if (!isProcessingOfflineTicks.value) return

    const batchSize = Math.min(OFFLINE_BATCH_SIZE, offlineTicksToProcess.value - offlineTicksProcessed.value)

    if (batchSize <= 0) {
      // All ticks processed, finish up
      isProcessingOfflineTicks.value = false

      // Save the game with the new state after offline progress
      forceSave()
      return
    }

    // Store seeds before processing
    const seedsBefore = new Decimal(coreStore.seeds)

    // Process a batch of ticks
    for (let i = 0; i < batchSize; i++) {
      tickStore.processTick()
      offlineTicksProcessed.value++
    }

    // Calculate seeds gained in this batch
    const seedsAfter = new Decimal(coreStore.seeds)
    const seedsGainedInBatch = seedsAfter.minus(seedsBefore)
    offlineSeedsGained.value = offlineSeedsGained.value.plus(seedsGainedInBatch)

    // Schedule the next batch
    setTimeout(() => processOfflineProgressInBatches(), 0)
  }

  // Cancel offline progress processing
  const cancelOfflineProgress = () => {
    isProcessingOfflineTicks.value = false

    // Reload the game state
    loadCoreState()
    loadFarmsState()
    loadMachinesState()
  }

  // Skip offline progress processing and apply all at once
  const skipOfflineProgress = () => {
    if (!isProcessingOfflineTicks.value) return

    // Store seeds before processing
    const seedsBefore = new Decimal(coreStore.seeds)

    // Process all remaining ticks at once
    const remainingTicks = offlineTicksToProcess.value - offlineTicksProcessed.value

    for (let i = 0; i < remainingTicks; i++) {
      tickStore.processTick()
    }

    // Calculate seeds gained
    const seedsAfter = new Decimal(coreStore.seeds)
    const seedsGained = seedsAfter.minus(seedsBefore)
    offlineSeedsGained.value = offlineSeedsGained.value.plus(seedsGained)

    offlineTicksProcessed.value = offlineTicksToProcess.value
    isProcessingOfflineTicks.value = false

    // Save the game with the new state
    forceSave()
  }

  // Reset save data (for debugging or prestige)
  const resetSaveData = () => {
    try {
      localStorage.removeItem(SAVE_KEY_CORE)
      localStorage.removeItem(SAVE_KEY_FARMS)
      localStorage.removeItem(SAVE_KEY_MACHINES)
      localStorage.removeItem(SAVE_KEY_META)
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

  // Initialize auto-save when the store is created
  initAutoSave()

  // Clean up interval when the app is unmounted
  const cleanup = () => {
    if (autoSaveIntervalId !== null) {
      clearInterval(autoSaveIntervalId)
      autoSaveIntervalId = null
    }

    // No need to cancel debounced save
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
    offlineSeedsGained,
    isGameLoaded,
    isSaving,
    saveGame,
    forceSave,
    loadGame,
    resetSaveData,
    toggleAutoSave,
    toggleOfflineProgress,
    cancelOfflineProgress,
    skipOfflineProgress,
    cleanup,
  }
})
