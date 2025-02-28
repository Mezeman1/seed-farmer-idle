import { defineStore } from 'pinia'
import { useCoreStore } from './coreStore'
import { useFarmStore } from './farmStore'
import { useMachineStore } from './machineStore'
import { useTickStore } from './tickStore'
import type { Farm } from './farmStore'
import type { Machine, MachineUpgrade } from './machineStore'
import Decimal from 'break_infinity.js'

// Re-export types for backward compatibility
export type { Farm, Machine, MachineUpgrade }

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

  return {
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
    get machineMultiplier() {
      return machineStore.machineMultiplier
    },
    get farm2Multiplier() {
      return machineStore.farm2Multiplier
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
  }
})
