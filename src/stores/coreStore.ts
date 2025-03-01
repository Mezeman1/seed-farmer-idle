import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Decimal from 'break_infinity.js'

// Get debug mode from environment variables
const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true'

export const useCoreStore = defineStore('core', () => {
  // Core game state
  const seeds = ref<Decimal>(new Decimal(0))
  const tickCounter = ref<number>(0) // Counter for total ticks in current run
  const isDebugMode = ref<boolean>(DEBUG_MODE)

  // Multipliers
  const multipliers = ref<{ [key: string]: number }>({
    machine: 1, // Machine multiplier from upgrades
    // Add more multiplier sources here as needed
  })

  // Computed properties
  const formattedSeeds = computed(() => {
    return seeds.value.toString()
  })

  // Add seeds (used by other stores)
  const addSeeds = (amount: Decimal) => {
    seeds.value = seeds.value.add(amount)
  }

  // Remove seeds (used by other stores)
  const removeSeeds = (amount: Decimal): boolean => {
    if (seeds.value.gte(amount)) {
      seeds.value = seeds.value.sub(amount)
      return true
    }
    return false
  }

  // Update a specific multiplier
  const updateMultiplier = (key: string, value: number) => {
    multipliers.value[key] = value
  }

  // Increment tick counter
  const incrementTickCounter = () => {
    tickCounter.value++
  }

  // Reset tick counter (will be useful for prestige)
  const resetTickCounter = () => {
    tickCounter.value = 0
  }

  // Toggle debug mode
  const toggleDebugMode = () => {
    isDebugMode.value = !isDebugMode.value
  }

  return {
    seeds,
    tickCounter,
    isDebugMode,
    multipliers,
    formattedSeeds,
    addSeeds,
    removeSeeds,
    updateMultiplier,
    incrementTickCounter,
    resetTickCounter,
    toggleDebugMode,
  }
})
