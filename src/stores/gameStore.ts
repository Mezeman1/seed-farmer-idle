import { defineStore } from 'pinia'
import { useCoreStore } from './coreStore'
import { useFarmStore } from './farmStore'
import { useMachineStore } from './machineStore'
import { useTickStore } from './tickStore'
import { useSeasonStore } from './seasonStore'
import type { Farm } from './farmStore'
import type { Machine, MachineUpgrade } from './machineStore'
import type { Harvest } from './seasonStore'
import Decimal from 'break_infinity.js'
import { ref, watch } from 'vue'

// Re-export types for backward compatibility
export type { Farm, Machine, MachineUpgrade, Harvest }

/**
 * Main game store that serves as a facade for the other stores.
 * This store doesn't contain any state of its own, but provides
 * a unified interface to access the state and functions from the
 * other stores.
 */
export const useGameStore = defineStore('game', () => {
  // References to other stores
  const coreStore = useCoreStore()
  const farmStore = useFarmStore()
  const machineStore = useMachineStore()
  const tickStore = useTickStore()
  const seasonStore = useSeasonStore()

  // Theme management
  const isDarkMode = ref(false)

  // Initialize theme based on system preference or localStorage
  const initializeTheme = () => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme')

    if (savedTheme === 'dark') {
      isDarkMode.value = true
      document.documentElement.classList.add('dark')
    } else if (savedTheme === 'light') {
      isDarkMode.value = false
      document.documentElement.classList.remove('dark')
    } else {
      // If no saved preference, check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      isDarkMode.value = prefersDark

      if (prefersDark) {
        document.documentElement.classList.add('dark')
      }
    }
  }

  // Watch for changes and update DOM and localStorage
  watch(isDarkMode, newValue => {
    if (newValue) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  })

  // Toggle theme function
  const toggleTheme = () => {
    isDarkMode.value = !isDarkMode.value
  }

  return {
    // Theme management
    isDarkMode,
    toggleTheme,
    initializeTheme,

    // Core store
    get seeds() {
      return coreStore.seeds
    },
    set seeds(value: Decimal) {
      coreStore.seeds = value
    },
    get tickCounter() {
      return coreStore.tickCounter
    },
    set tickCounter(value: number) {
      coreStore.tickCounter = value
    },
    get isDebugMode() {
      return coreStore.isDebugMode
    },
    get formattedSeeds() {
      return coreStore.formattedSeeds
    },
    toggleDebugMode: coreStore.toggleDebugMode,
    resetTickCounter: coreStore.resetTickCounter,

    // Farm store
    get farms() {
      return farmStore.farms
    },
    calculateProduction: farmStore.calculateProduction,
    calculateFarmCost: farmStore.calculateFarmCost,
    buyFarm: farmStore.buyFarm,
    calculateTotalSeedsPerTick: farmStore.calculateTotalSeedsPerTick,

    // Machine store
    get machines() {
      return machineStore.machines
    },
    levelUpMachine: machineStore.levelUpMachine,
    purchaseMachineUpgrade: machineStore.purchaseMachineUpgrade,

    // Tick store
    get tickDuration() {
      return tickStore.tickDuration
    },
    set tickDuration(value: number) {
      tickStore.setTickDuration(value)
    },
    get timeUntilNextTick() {
      return tickStore.timeUntilNextTick
    },
    get tickProgress() {
      return tickStore.tickProgress
    },
    get secondsUntilNextTick() {
      return tickStore.secondsUntilNextTick
    },
    processTick: tickStore.processTick,
    updateTickTimer: tickStore.updateTickTimer,
    setTickDuration: tickStore.setTickDuration,

    // Season store
    get currentSeason() {
      return seasonStore.currentSeason
    },
    get prestigePoints() {
      return seasonStore.prestigePoints
    },
    get totalPrestigePoints() {
      return seasonStore.totalPrestigePoints
    },
    get harvests() {
      return seasonStore.harvests
    },
    get harvestsCompleted() {
      return seasonStore.harvestsCompletedThisSeason
    },
    get totalHarvestsCompleted() {
      return seasonStore.totalHarvestsCompleted
    },
    get harvestsRequired() {
      return seasonStore.harvestsRequired
    },
    get canPrestige() {
      return seasonStore.canPrestige
    },
    get nextHarvestRequirement() {
      return seasonStore.nextHarvestRequirement
    },
    get harvestProgress() {
      return seasonStore.harvestProgress
    },
    checkHarvests: seasonStore.checkHarvests,
    prestige: seasonStore.prestige,
  }
})
