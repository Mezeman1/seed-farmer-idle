import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useGameStore } from './gameStore'
import { useCoreStore } from './coreStore'
import { useFarmStore } from './farmStore'
import { useMachineStore } from './machineStore'
import { useTickStore } from './tickStore'
import { useSeasonStore } from './seasonStore'
import Decimal from 'break_infinity.js'

// Constants
const SAVE_KEY_PREFIX = 'seed-farmer'
const SAVE_KEY_CORE = `${SAVE_KEY_PREFIX}-core`
const SAVE_KEY_FARMS = `${SAVE_KEY_PREFIX}-farms`
const SAVE_KEY_MACHINES = `${SAVE_KEY_PREFIX}-machines`
const SAVE_KEY_SEASONS = `${SAVE_KEY_PREFIX}-seasons` // New key for seasons data
const SAVE_KEY_META = `${SAVE_KEY_PREFIX}-meta` // For metadata like last save time
const SAVE_KEY_SETTINGS = `${SAVE_KEY_PREFIX}-settings` // For user settings like dark mode
export const AUTO_SAVE_INTERVAL = 60000 // Auto-save every minute
const OFFLINE_BATCH_SIZE = 100 // Process this many ticks at once before updating UI
const SAVE_DEBOUNCE_DELAY = 2000 // Debounce delay for saving (2 seconds)
const SAVE_VERSION = '1.0.0' // Current save version

export const usePersistenceStore = defineStore('persistence', () => {
  // State
  const lastSaveTime = ref<number>(Date.now())
  const lastLoadTime = ref<number>(Date.now())
  const autoSaveEnabled = ref<boolean>(true)
  const offlineProgressEnabled = ref<boolean>(true)
  const darkModeEnabled = ref<boolean>(false) // Track dark mode preference
  const isGameLoaded = ref<boolean>(false) // Track if game has been loaded
  const isSaving = ref<boolean>(false) // Track if a save is in progress

  // Offline progress tracking
  const isProcessingOfflineTicks = ref<boolean>(false)
  const offlineTicksToProcess = ref<number>(0)
  const offlineTicksProcessed = ref<number>(0)
  const offlineTimeAway = ref<number>(0)
  const offlineSeedsGained = ref<Decimal>(new Decimal(0))
  const showOfflineModal = ref<boolean>(false) // Control visibility of the offline modal
  // Track farms created during offline progress
  const offlineFarmsCreated = ref<{ [key: string]: Decimal }>({})

  // References to other stores
  const gameStore = useGameStore()
  const coreStore = useCoreStore()
  const farmStore = useFarmStore()
  const machineStore = useMachineStore()
  const tickStore = useTickStore()
  const seasonStore = useSeasonStore()

  // Auto-save interval
  let autoSaveIntervalId: number | null = null

  // ===== SETTINGS PERSISTENCE =====

  // Convert settings to a serializable object
  const settingsToObject = () => {
    return {
      autoSaveEnabled: autoSaveEnabled.value,
      offlineProgressEnabled: offlineProgressEnabled.value,
      darkModeEnabled: darkModeEnabled.value,
    }
  }

  // Save settings
  const saveSettings = () => {
    try {
      const settingsData = settingsToObject()
      localStorage.setItem(SAVE_KEY_SETTINGS, JSON.stringify(settingsData))
      return true
    } catch (error) {
      console.error('Failed to save settings:', error)
      return false
    }
  }

  // Load settings
  const loadSettings = () => {
    try {
      const settingsData = localStorage.getItem(SAVE_KEY_SETTINGS)
      if (!settingsData) return false

      const parsedData = JSON.parse(settingsData)

      // Load settings
      if (typeof parsedData.autoSaveEnabled === 'boolean') {
        autoSaveEnabled.value = parsedData.autoSaveEnabled
      }

      if (typeof parsedData.offlineProgressEnabled === 'boolean') {
        offlineProgressEnabled.value = parsedData.offlineProgressEnabled
      }

      if (typeof parsedData.darkModeEnabled === 'boolean') {
        darkModeEnabled.value = parsedData.darkModeEnabled
        // Apply dark mode to document
        if (darkModeEnabled.value) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }

      return true
    } catch (error) {
      console.error('Failed to load settings:', error)
      return false
    }
  }

  // Toggle dark mode
  const toggleDarkMode = () => {
    darkModeEnabled.value = !darkModeEnabled.value

    // Apply dark mode to document
    if (darkModeEnabled.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Save the setting
    saveSettings()
  }

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
          coreStore.updateMultiplier(key, new Decimal(parsedData.multipliers[key]))
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

            if (typeof savedMachine.totalTicksForCurrentLevel === 'string') {
              machine.totalTicksForCurrentLevel = new Decimal(savedMachine.totalTicksForCurrentLevel)
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

  // ===== SEASONS PERSISTENCE =====

  // Convert seasons state to a serializable object
  const seasonsStateToObject = () => {
    const seasonStore = useSeasonStore()

    // Convert Decimal multipliers to strings
    const serializedMultipliers: { [key: string]: string } = {}
    for (const key in seasonStore.prestigeMultipliers) {
      serializedMultipliers[key] = seasonStore.prestigeMultipliers[key].toString()
    }

    // This implementation is already dynamic and will handle any number of farms
    // because it serializes the entire objects without hardcoding keys
    const result = {
      currentSeason: seasonStore.currentSeason.toString(),
      prestigePoints: seasonStore.prestigePoints.toString(),
      totalPrestigePoints: seasonStore.totalPrestigePoints.toString(),
      totalHarvestsCompleted: seasonStore.totalHarvestsCompleted.toString(),
      harvestsCompletedThisSeason: seasonStore.harvestsCompletedThisSeason.toString(),
      seasonHarvestCounter: seasonStore.seasonHarvestCounter.toString(),
      harvests: seasonStore.harvests.map((harvest: any) => ({
        id: harvest.id,
        seedRequirement: harvest.seedRequirement.toString(),
        completed: harvest.completed,
        pointsAwarded: harvest.pointsAwarded.toString(),
        season: harvest.season || 1, // Default to season 1 if not present
      })),
      prestigeUpgrades: seasonStore.prestigeUpgrades,
      prestigeMultipliers: serializedMultipliers,
      autoBuyers: seasonStore.autoBuyers,
      autoBuyersEnabled: seasonStore.autoBuyersEnabled,
    }

    return result
  }

  // Convert parsed JSON data back to seasons state
  const objectToSeasonsState = (parsedData: any) => {
    const seasonStore = useSeasonStore()

    // Store the original values to check if they're being reset
    const originalTotalHarvests = seasonStore.totalHarvestsCompleted.toString()
    const originalPrestigePoints = seasonStore.prestigePoints.toString()
    const originalTotalPrestigePoints = seasonStore.totalPrestigePoints.toString()

    // Load current season
    if (typeof parsedData.currentSeason === 'number') {
      seasonStore.currentSeason = new Decimal(parsedData.currentSeason)
    } else if (parsedData.currentSeason && typeof parsedData.currentSeason === 'object') {
      // Handle case where it's already a Decimal object in the save
      seasonStore.currentSeason = new Decimal(parsedData.currentSeason.mantissa || 0).times(
        Decimal.pow(10, parsedData.currentSeason.exponent || 0)
      )
    } else if (typeof parsedData.currentSeason === 'string') {
      // Handle case where it's saved as a string
      seasonStore.currentSeason = new Decimal(parsedData.currentSeason)
    }

    // Load prestige points
    if (typeof parsedData.prestigePoints === 'number') {
      seasonStore.prestigePoints = new Decimal(parsedData.prestigePoints)
    } else if (parsedData.prestigePoints && typeof parsedData.prestigePoints === 'object') {
      // Handle case where it's already a Decimal object in the save
      seasonStore.prestigePoints = new Decimal(parsedData.prestigePoints.mantissa || 0).times(
        Decimal.pow(10, parsedData.prestigePoints.exponent || 0)
      )
    } else if (typeof parsedData.prestigePoints === 'string') {
      // Handle case where it's saved as a string
      seasonStore.prestigePoints = new Decimal(parsedData.prestigePoints)
    }

    // Load total prestige points
    if (typeof parsedData.totalPrestigePoints === 'number') {
      seasonStore.totalPrestigePoints = new Decimal(parsedData.totalPrestigePoints)
    } else if (parsedData.totalPrestigePoints && typeof parsedData.totalPrestigePoints === 'object') {
      // Handle case where it's already a Decimal object in the save
      seasonStore.totalPrestigePoints = new Decimal(parsedData.totalPrestigePoints.mantissa || 0).times(
        Decimal.pow(10, parsedData.totalPrestigePoints.exponent || 0)
      )
    } else if (typeof parsedData.totalPrestigePoints === 'string') {
      // Handle case where it's saved as a string
      seasonStore.totalPrestigePoints = new Decimal(parsedData.totalPrestigePoints)
    }

    // Load total harvests completed
    if (typeof parsedData.totalHarvestsCompleted === 'number') {
      seasonStore.totalHarvestsCompleted = new Decimal(parsedData.totalHarvestsCompleted)
    } else if (parsedData.totalHarvestsCompleted && typeof parsedData.totalHarvestsCompleted === 'object') {
      // Handle case where it's already a Decimal object in the save
      seasonStore.totalHarvestsCompleted = new Decimal(parsedData.totalHarvestsCompleted.mantissa || 0).times(
        Decimal.pow(10, parsedData.totalHarvestsCompleted.exponent || 0)
      )
    } else if (typeof parsedData.totalHarvestsCompleted === 'string') {
      // Handle case where it's saved as a string
      seasonStore.totalHarvestsCompleted = new Decimal(parsedData.totalHarvestsCompleted)
    }

    // Load harvests completed this season
    if (typeof parsedData.harvestsCompletedThisSeason === 'number') {
      seasonStore.harvestsCompletedThisSeason = new Decimal(parsedData.harvestsCompletedThisSeason)
    } else if (parsedData.harvestsCompletedThisSeason && typeof parsedData.harvestsCompletedThisSeason === 'object') {
      // Handle case where it's already a Decimal object in the save
      seasonStore.harvestsCompletedThisSeason = new Decimal(parsedData.harvestsCompletedThisSeason.mantissa || 0).times(
        Decimal.pow(10, parsedData.harvestsCompletedThisSeason.exponent || 0)
      )
    } else if (typeof parsedData.harvestsCompletedThisSeason === 'string') {
      // Handle case where it's saved as a string
      seasonStore.harvestsCompletedThisSeason = new Decimal(parsedData.harvestsCompletedThisSeason)
    }

    // Load season harvest counter
    if (typeof parsedData.seasonHarvestCounter === 'number') {
      seasonStore.seasonHarvestCounter = new Decimal(parsedData.seasonHarvestCounter)
    } else if (parsedData.seasonHarvestCounter && typeof parsedData.seasonHarvestCounter === 'object') {
      // Handle case where it's already a Decimal object in the save
      seasonStore.seasonHarvestCounter = new Decimal(parsedData.seasonHarvestCounter.mantissa || 0).times(
        Decimal.pow(10, parsedData.seasonHarvestCounter.exponent || 0)
      )
    } else if (typeof parsedData.seasonHarvestCounter === 'string') {
      // Handle case where it's saved as a string
      seasonStore.seasonHarvestCounter = new Decimal(parsedData.seasonHarvestCounter)
    }

    // Load harvests
    if (Array.isArray(parsedData.harvests)) {
      // Clear existing harvests
      seasonStore.harvests = []

      // Add saved harvests
      parsedData.harvests.forEach((savedHarvest: any) => {
        seasonStore.harvests.push({
          id: savedHarvest.id,
          seedRequirement: new Decimal(savedHarvest.seedRequirement),
          completed: savedHarvest.completed,
          pointsAwarded: new Decimal(savedHarvest.pointsAwarded || 1), // Default to 1 if not present in older saves
          season: savedHarvest.season || 1, // Default to season 1 if not present in older saves
        })
      })
    }

    // Load prestige upgrades
    if (Array.isArray(parsedData.prestigeUpgrades)) {
      seasonStore.prestigeUpgrades.splice(0, seasonStore.prestigeUpgrades.length, ...parsedData.prestigeUpgrades)
    }

    // Load prestige multipliers
    if (parsedData.prestigeMultipliers) {
      // Convert string values back to Decimal
      // This is dynamic and will handle any farm multipliers that were saved
      // even if new farms have been added since the save was created
      for (const key in parsedData.prestigeMultipliers) {
        seasonStore.prestigeMultipliers[key] = new Decimal(parsedData.prestigeMultipliers[key])
      }
    }

    // Load auto-buyers
    if (parsedData.autoBuyers) {
      // This is dynamic and will handle any auto-buyers that were saved
      // If new farms have been added, they will start with level 0 auto-buyers
      Object.assign(seasonStore.autoBuyers, parsedData.autoBuyers)
    }

    // Load auto-buyers enabled state
    if (parsedData.autoBuyersEnabled) {
      // This is dynamic and will handle any auto-buyers enabled states that were saved
      // If new farms have been added, they will start with enabled auto-buyers (default)
      Object.assign(seasonStore.autoBuyersEnabled, parsedData.autoBuyersEnabled)
    }

    // Store the values before initialize
    const beforeInitTotalHarvests = seasonStore.totalHarvestsCompleted.toString()
    const beforeInitPrestigePoints = seasonStore.prestigePoints.toString()
    const beforeInitTotalPrestigePoints = seasonStore.totalPrestigePoints.toString()

    // Re-initialize if needed
    seasonStore.initialize()

    // Check if initialize reset the values
    const afterInitTotalHarvests = seasonStore.totalHarvestsCompleted.toString()
    const afterInitPrestigePoints = seasonStore.prestigePoints.toString()
    const afterInitTotalPrestigePoints = seasonStore.totalPrestigePoints.toString()

    // If initialize reset the values, restore them
    if (beforeInitTotalHarvests !== '0' && afterInitTotalHarvests === '0') {
      seasonStore.totalHarvestsCompleted = new Decimal(beforeInitTotalHarvests)
    }

    if (beforeInitPrestigePoints !== '0' && afterInitPrestigePoints === '0') {
      seasonStore.prestigePoints = new Decimal(beforeInitPrestigePoints)
    }

    if (beforeInitTotalPrestigePoints !== '0' && afterInitTotalPrestigePoints === '0') {
      seasonStore.totalPrestigePoints = new Decimal(beforeInitTotalPrestigePoints)
    }
  }

  // Save seasons state
  const saveSeasonsState = () => {
    try {
      const seasonStore = useSeasonStore()
      const seasonsData = seasonsStateToObject()
      localStorage.setItem(SAVE_KEY_SEASONS, JSON.stringify(seasonsData))
      return true
    } catch (error) {
      console.error('Failed to save seasons state:', error)
      return false
    }
  }

  // Load seasons state
  const loadSeasonsState = () => {
    try {
      const seasonsData = localStorage.getItem(SAVE_KEY_SEASONS)
      if (!seasonsData) return false

      const parsedData = JSON.parse(seasonsData)
      objectToSeasonsState(parsedData)
      return true
    } catch (error) {
      console.error('Failed to load seasons state:', error)
      return false
    }
  }

  // ===== METADATA PERSISTENCE =====

  // Load metadata
  const loadMetadata = () => {
    try {
      const metaData = localStorage.getItem(SAVE_KEY_META)
      if (!metaData) return false

      const parsedData = JSON.parse(metaData)

      // Load last save time
      if (typeof parsedData.lastSaveTime === 'number') {
        lastSaveTime.value = parsedData.lastSaveTime
      }

      // Load last load time
      if (typeof parsedData.lastLoadTime === 'number') {
        lastLoadTime.value = parsedData.lastLoadTime
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

  // Save metadata
  const saveMetadata = () => {
    try {
      const metaData = {
        lastSaveTime: lastSaveTime.value,
        lastLoadTime: lastLoadTime.value,
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

  // ===== MAIN SAVE/LOAD FUNCTIONS =====

  // Perform a full save of the game state
  const performSave = () => {
    if (isSaving.value) return false

    isSaving.value = true
    let success = true

    try {
      // Save all game state
      success = saveCoreState() && success
      success = saveFarmsState() && success
      success = saveMachinesState() && success
      success = saveSeasonsState() && success
      success = saveSettings() && success // Save settings

      // Update last save time
      lastSaveTime.value = Date.now()
      success = saveMetadata() && success

      return success
    } catch (error) {
      console.error('Error during save:', error)
      return false
    } finally {
      isSaving.value = false
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

  // Export game data as base64-encoded JSON string
  const exportGameData = (): string => {
    try {
      // Collect all game data
      const gameData = {
        core: coreStateToObject(),
        farms: farmsStateToObject(),
        machines: machinesStateToObject(),
        seasons: seasonsStateToObject(),
        settings: {
          autoSaveEnabled: autoSaveEnabled.value,
          offlineProgressEnabled: offlineProgressEnabled.value,
          darkMode: gameStore.isDarkMode,
        },
        metadata: {
          lastSaveTime: Date.now(),
          version: SAVE_VERSION,
        },
      }

      // Convert to JSON and then to base64
      const jsonString = JSON.stringify(gameData)
      const base64String = btoa(jsonString)

      return base64String
    } catch (error) {
      console.error('Error exporting game data:', error)
      return ''
    }
  }

  // Import game data from base64-encoded JSON string
  const importGameData = (base64String: string): boolean => {
    try {
      // Decode base64 string to JSON
      const jsonString = atob(base64String)
      const gameData = JSON.parse(jsonString)

      // Validate the data structure
      if (!gameData || !gameData.core || !gameData.farms || !gameData.machines || !gameData.seasons) {
        console.error('Invalid game data format')
        return false
      }

      // Store the data in localStorage
      localStorage.setItem(SAVE_KEY_CORE, JSON.stringify(gameData.core))
      localStorage.setItem(SAVE_KEY_FARMS, JSON.stringify(gameData.farms))
      localStorage.setItem(SAVE_KEY_MACHINES, JSON.stringify(gameData.machines))
      localStorage.setItem(SAVE_KEY_SEASONS, JSON.stringify(gameData.seasons))

      // Save settings if available
      if (gameData.settings) {
        autoSaveEnabled.value = gameData.settings.autoSaveEnabled ?? true
        offlineProgressEnabled.value = gameData.settings.offlineProgressEnabled ?? true
        if (gameData.settings.darkMode !== undefined) {
          gameStore.isDarkMode = gameData.settings.darkMode
          gameStore.initializeTheme() // Update theme based on the new setting
        }
        saveSettings()
      }

      // Save metadata
      if (gameData.metadata) {
        lastSaveTime.value = gameData.metadata.lastSaveTime || Date.now()
        saveMetadata()
      }

      // Load the game with the imported data
      loadGame()

      return true
    } catch (error) {
      console.error('Error importing game data:', error)
      return false
    }
  }

  // Dismiss the offline modal
  const dismissOfflineModal = () => {
    showOfflineModal.value = false
    // Reset farms created tracking when dismissing the modal
    offlineFarmsCreated.value = {}
  }

  // Load the game state
  const loadGame = () => {
    try {
      // Load settings first
      loadSettings()

      // Load metadata
      loadMetadata()

      // Update last load time
      lastLoadTime.value = Date.now()
      saveMetadata()

      // Load game state
      const coreLoaded = loadCoreState()
      const farmsLoaded = loadFarmsState()
      const machinesLoaded = loadMachinesState()
      const seasonsLoaded = loadSeasonsState()
      gameStore.initializeTheme()

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
          loadSeasonsState() // Add seasons load

          // Update multipliers after loading
          machineStore.updateMultipliers()
          farmStore.updateFarmMultipliers()

          // Set up offline progress tracking
          offlineTicksToProcess.value = ticksToProcess
          offlineTicksProcessed.value = 0
          offlineSeedsGained.value = new Decimal(0) // Reset seeds gained counter
          isProcessingOfflineTicks.value = true
          showOfflineModal.value = true // Show the modal

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
      loadSeasonsState() // Add seasons load

      // Update multipliers after loading
      machineStore.updateMultipliers()
      farmStore.updateFarmMultipliers()

      isGameLoaded.value = true
      return true
    } catch (error) {
      console.error('Error during load:', error)
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
      // We no longer hide the modal here, it will stay visible until dismissed

      // Save the game with the new state after offline progress
      forceSave()
      return
    }

    // Store seeds before processing
    const seedsBefore = new Decimal(coreStore.seeds)

    // Store farm counts before processing
    const farmCountsBefore = farmStore.farms.map(farm => farm.totalOwned.toNumber())

    // Process a batch of ticks
    for (let i = 0; i < batchSize; i++) {
      tickStore.processTick()
      offlineTicksProcessed.value++
    }

    // Calculate seeds gained in this batch
    const seedsAfter = new Decimal(coreStore.seeds)
    const seedsGainedInBatch = seedsAfter.minus(seedsBefore)
    offlineSeedsGained.value = offlineSeedsGained.value.plus(seedsGainedInBatch)

    // Calculate farms created in this batch
    farmStore.farms.forEach((farm, index) => {
      const farmsBefore = farmCountsBefore[index] || 0
      const farmsAfter = farm.totalOwned.toNumber()
      const farmsCreated = farmsAfter - farmsBefore

      if (farmsCreated > 0) {
        const farmKey = `farm${index}`
        if (!offlineFarmsCreated.value[farmKey]) {
          offlineFarmsCreated.value[farmKey] = new Decimal(farmsCreated)
        } else {
          offlineFarmsCreated.value[farmKey] = offlineFarmsCreated.value[farmKey].plus(farmsCreated)
        }
      }
    })

    // Schedule the next batch
    setTimeout(() => processOfflineProgressInBatches(), 0)
  }

  // Cancel offline progress processing
  const cancelOfflineProgress = () => {
    isProcessingOfflineTicks.value = false
    showOfflineModal.value = false // Hide the modal when canceling

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
    // We no longer hide the modal here, it will stay visible until dismissed

    // Save the game with the new state
    forceSave()
  }

  // Reset save data (for debugging or prestige)
  const resetSaveData = () => {
    try {
      localStorage.removeItem(SAVE_KEY_CORE)
      localStorage.removeItem(SAVE_KEY_FARMS)
      localStorage.removeItem(SAVE_KEY_MACHINES)
      localStorage.removeItem(SAVE_KEY_SEASONS)
      localStorage.removeItem(SAVE_KEY_META)
      localStorage.removeItem(SAVE_KEY_SETTINGS)
      console.log('Save data reset successfully')
      window.location.reload()

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

  // Initialize the game
  const init = () => {
    // Load settings first to apply dark mode immediately
    loadSettings()

    // Then load the game
    loadGame()

    // Initialize auto-save
    initAutoSave()
  }

  // Check for offline progress when app becomes visible again
  const checkOfflineProgress = () => {
    // Skip if offline progress is disabled
    if (!offlineProgressEnabled.value) return

    // Get the current time
    const currentTime = Date.now()

    // Calculate time since last save
    const timeSinceLastSave = (currentTime - lastSaveTime.value) / 1000

    // Only process if significant time has passed (at least 60 seconds)
    // This prevents the modal from showing too frequently during normal gameplay
    if (timeSinceLastSave > 60) {
      console.log(`Processing offline progress: ${timeSinceLastSave.toFixed(2)} seconds since last save`)

      // Store current seeds for comparison
      const seedsBefore = new Decimal(coreStore.seeds)

      // Calculate ticks to process
      const ticksToProcess = Math.floor(timeSinceLastSave / tickStore.tickDuration)

      if (ticksToProcess > 0) {
        // Set up offline progress tracking
        offlineTicksToProcess.value = ticksToProcess
        offlineTicksProcessed.value = 0
        offlineSeedsGained.value = new Decimal(0)
        isProcessingOfflineTicks.value = true
        showOfflineModal.value = true

        // Start processing in batches
        setTimeout(() => processOfflineProgressInBatches(), 100)

        // Update last save time to current time
        lastSaveTime.value = currentTime
        saveMetadata()
      }
    } else {
      // For shorter periods, just save the game without showing the modal
      if (timeSinceLastSave > 5) {
        console.log(`Short absence detected (${timeSinceLastSave.toFixed(2)}s). Saving game without showing modal.`)
        forceSave()
      }
    }
  }

  // Clean up interval when the app is unmounted
  const cleanup = () => {
    if (autoSaveIntervalId !== null) {
      clearInterval(autoSaveIntervalId)
      autoSaveIntervalId = null
    }

    // No need to cancel debounced save
  }

  // Watch for changes to dark mode
  watch(darkModeEnabled, newValue => {
    if (newValue) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  })

  // Reset offline progress tracking
  const resetOfflineProgress = () => {
    offlineTicksToProcess.value = 0
    offlineTicksProcessed.value = 0
    offlineTimeAway.value = 0
    offlineSeedsGained.value = new Decimal(0)
    offlineFarmsCreated.value = {}
    isProcessingOfflineTicks.value = false
  }

  // Initialize offline progress tracking for a new session
  const initOfflineProgress = () => {
    offlineTicksToProcess.value = 0
    offlineTicksProcessed.value = 0
    offlineSeedsGained.value = new Decimal(0)
    offlineFarmsCreated.value = {}
    isProcessingOfflineTicks.value = false
    showOfflineModal.value = false
  }

  // Return the store
  return {
    // State
    lastSaveTime,
    lastLoadTime,
    autoSaveEnabled,
    offlineProgressEnabled,
    darkModeEnabled,
    isGameLoaded,
    isProcessingOfflineTicks,
    offlineTicksToProcess,
    offlineTicksProcessed,
    offlineTimeAway,
    offlineSeedsGained,
    showOfflineModal,
    offlineFarmsCreated,

    // Actions
    saveGame,
    forceSave,
    loadGame,
    resetSaveData,
    toggleAutoSave,
    toggleOfflineProgress,
    toggleDarkMode,
    dismissOfflineModal,
    cancelOfflineProgress,
    skipOfflineProgress,
    checkOfflineProgress,
    init,
    cleanup,
    exportGameData,
    importGameData,
  }
})
