import { defineStore } from 'pinia'
import { ref, computed, watch, onMounted } from 'vue'
import Decimal from 'break_infinity.js'
import { useCoreStore } from './coreStore'
import { useFarmStore } from './farmStore'
import { usePersistenceStore } from './persistenceStore'

export interface MachineUpgrade {
  id: number
  name: string
  description: string
  cost: number
  level: number
  maxLevel?: number
  effect: (level: number) => number
}

export type LevelingType = 'ticks' | 'purchases'

export interface Machine {
  id: number
  name: string
  description: string
  points: number
  totalTicksForCurrentLevel: number
  level: number
  unlocked: boolean
  unlockCost?: number // Cost in seeds to unlock the machine
  levelingType: LevelingType // How this machine levels up
  levelingUnit: string // Display name for the leveling unit (e.g., "ticks", "purchases")
  levelingMultiplier: number // Base amount needed for level 1
  levelingScalingFactor: number // How much the requirement increases per level
  targetFarm?: number // Which farm this machine affects, if any
  boostPercentage: number // Base percentage boost per upgrade level
  upgrades: MachineUpgrade[]
}

export const useMachineStore = defineStore('machine', () => {
  // Reference to core store
  const coreStore = useCoreStore()
  const farmStore = useFarmStore()
  const persistenceStore = usePersistenceStore()

  // Machines state
  const machines = ref<Machine[]>([
    {
      id: 0,
      name: 'Seed Processor',
      description: 'Increases Farm 1 production efficiency, boosting seed generation',
      points: 0,
      totalTicksForCurrentLevel: 0,
      level: 1,
      unlocked: true, // First machine is free and unlocked by default
      levelingType: 'ticks',
      levelingUnit: 'ticks',
      levelingMultiplier: 10, // Base 10 ticks for level 1
      levelingScalingFactor: 1.4, // 1.4x more ticks per level
      targetFarm: 0, // Affects Farm 1
      boostPercentage: 10, // 10% boost per upgrade level
      upgrades: [
        {
          id: 0,
          name: 'Seed Boost',
          description: 'Increases Farm 1 production by 10% per level',
          cost: 1, // Always costs 1 point
          level: 0,
          effect: level => 1 + level * 0.1, // 10% increase per level
        },
      ],
    },
    {
      id: 1,
      name: 'Farm 2 Enhancer',
      description: 'Boosts Farm 2 production based on manual purchases',
      points: 0,
      totalTicksForCurrentLevel: 0,
      level: 1,
      unlocked: false, // Second machine is locked by default
      unlockCost: 25000, // Costs 25,000 seeds to unlock
      levelingType: 'purchases',
      levelingUnit: 'purchases',
      levelingMultiplier: 10, // 10 purchases per level
      levelingScalingFactor: 1, // Linear scaling (no multiplier)
      targetFarm: 1, // Affects Farm 2
      boostPercentage: 15, // 15% boost per upgrade level
      upgrades: [
        {
          id: 0,
          name: 'Farm 2 Boost',
          description: 'Increases Farm 2 production by 15% per level',
          cost: 1,
          level: 0,
          effect: level => 1 + level * 0.15, // 15% increase per level
        },
      ],
    },
  ])

  // Track total manual purchases
  const totalManualPurchases = ref<number>(0)

  // Calculate total manual purchases from all farms
  const calculateTotalManualPurchases = () => {
    let total = 0
    farmStore.farms.forEach(farm => {
      total += farm.manuallyPurchased.toNumber()
    })
    return total
  }

  // Initialize total manual purchases
  onMounted(() => {
    totalManualPurchases.value = calculateTotalManualPurchases()
    updateMachineLevels()
    updateMultipliers() // Initialize multipliers
  })

  // Update machine levels based on their leveling type
  const updateMachineLevels = () => {
    machines.value.forEach(machine => {
      if (!machine.unlocked) return

      if (machine.levelingType === 'purchases') {
        // Level up based on purchases
        const newLevel = Math.floor(totalManualPurchases.value / machine.levelingMultiplier) + 1

        if (newLevel > machine.level) {
          const pointsToAdd = newLevel - machine.level
          machine.level = newLevel
          machine.points += pointsToAdd

          // Save the game after level up
          persistenceStore.saveGame()
        }
      }
    })
  }

  // Watch for changes in farm purchases
  watch(
    () => farmStore.farms?.map(farm => farm.manuallyPurchased.toString()),
    (newValues, oldValues) => {
      // Recalculate total manual purchases
      totalManualPurchases.value = calculateTotalManualPurchases()

      // Update machine levels
      updateMachineLevels()

      // Update multipliers in core store
      updateMultipliers()
    }
  )

  // Update multipliers in core store
  const updateMultipliers = () => {
    // Reset all farm multipliers to 1
    const farmMultipliers: { [key: string]: number } = {}

    // Update multipliers based on machine upgrades
    machines.value.forEach(machine => {
      if (!machine.unlocked || machine.targetFarm === undefined) return

      const farmKey = `farm${machine.targetFarm}`
      if (!farmMultipliers[farmKey]) farmMultipliers[farmKey] = 1

      // Apply upgrade effects
      machine.upgrades.forEach(upgrade => {
        farmMultipliers[farmKey] *= upgrade.effect(upgrade.level)
      })
    })

    // Apply all multipliers to core store
    Object.entries(farmMultipliers).forEach(([key, value]) => {
      coreStore.updateMultiplier(key, value)
    })
  }

  // Update machine points based on ticks
  const updateMachinePoints = () => {
    machines.value.forEach(machine => {
      if (!machine.unlocked || machine.levelingType !== 'ticks') return

      machine.totalTicksForCurrentLevel++

      // Auto level up when enough ticks are accumulated
      const ticksNeeded = getRequiredAmountForNextLevel(machine)
      if (machine.totalTicksForCurrentLevel >= ticksNeeded) {
        machine.totalTicksForCurrentLevel = 0 // Reset ticks for current level
        machine.level++
        machine.points++ // Give one point per level up

        // Update multipliers when machine levels up
        updateMultipliers()

        // Save the game after level up
        persistenceStore.saveGame()
      }
    })
  }

  // Calculate amount needed for next level based on machine's leveling type
  const getRequiredAmountForNextLevel = (machine: Machine): number => {
    if (machine.levelingType === 'ticks') {
      return Math.floor(machine.levelingMultiplier * Math.pow(machine.levelingScalingFactor, machine.level - 1))
    } else if (machine.levelingType === 'purchases') {
      return machine.levelingMultiplier * machine.level
    }
    return 0
  }

  // Get amount needed for next level by machine ID
  const getTicksForNextLevel = (machineId: number): number => {
    const machine = machines.value.find(m => m.id === machineId)
    if (!machine) return 0

    if (machine.levelingType === 'purchases') {
      const nextLevel = machine.level + 1
      const purchasesNeeded = machine.levelingMultiplier * nextLevel
      return Math.max(0, purchasesNeeded - totalManualPurchases.value)
    }

    return getRequiredAmountForNextLevel(machine)
  }

  // Level up a machine (kept for compatibility, but machines now auto-level)
  const levelUpMachine = (machineId: number) => {
    const machine = machines.value.find(m => m.id === machineId)
    if (!machine) return false

    // Skip machines that don't level up based on ticks
    if (machine.levelingType !== 'ticks') return false

    // This function is now just a fallback, as machines auto-level
    const requiredAmount = getRequiredAmountForNextLevel(machine)

    if (machine.totalTicksForCurrentLevel >= requiredAmount) {
      machine.totalTicksForCurrentLevel = 0 // Reset ticks for current level
      machine.level++
      machine.points++ // Give one point per level up
      return true
    }

    return false
  }

  // Purchase a machine upgrade
  const purchaseMachineUpgrade = (machineId: number, upgradeId: number) => {
    const machine = machines.value.find(m => m.id === machineId)
    if (!machine) return false

    const upgrade = machine.upgrades.find(u => u.id === upgradeId)
    if (!upgrade) return false

    // Check if at max level
    if (upgrade.maxLevel && upgrade.level >= upgrade.maxLevel) return false

    // Check if enough points (always costs 1 point)
    if (machine.points >= 1) {
      machine.points -= 1
      upgrade.level++

      // Update multipliers when an upgrade is purchased
      updateMultipliers()

      // Save the game after purchase
      persistenceStore.saveGame()

      return true
    }

    return false
  }

  // Unlock a machine with seeds
  const unlockMachine = (machineId: number): boolean => {
    const machine = machines.value.find(m => m.id === machineId)
    if (!machine || machine.unlocked || !machine.unlockCost) return false

    // Check if player has enough seeds
    const unlockCost = new Decimal(machine.unlockCost)
    if (coreStore.removeSeeds(unlockCost)) {
      machine.unlocked = true

      // Check if we should level up based on the machine's leveling type
      if (machine.levelingType === 'purchases') {
        const newLevel = Math.floor(totalManualPurchases.value / machine.levelingMultiplier) + 1
        if (newLevel > machine.level) {
          const pointsToAdd = newLevel - machine.level
          machine.level = newLevel
          machine.points += pointsToAdd
        }
      } else if (machine.levelingType === 'ticks') {
        const requiredAmount = getRequiredAmountForNextLevel(machine)
        if (machine.totalTicksForCurrentLevel >= requiredAmount) {
          const levelsToAdd = Math.floor(machine.totalTicksForCurrentLevel / requiredAmount)
          machine.level += levelsToAdd
          machine.points += levelsToAdd
          machine.totalTicksForCurrentLevel = machine.totalTicksForCurrentLevel % requiredAmount
        }
      }

      // Update multipliers after unlocking
      updateMultipliers()

      // Save the game after unlocking
      persistenceStore.saveGame()

      return true
    }

    return false
  }

  return {
    machines,
    updateMultipliers,
    totalManualPurchases,
    updateMachinePoints,
    levelUpMachine,
    purchaseMachineUpgrade,
    getTicksForNextLevel,
    unlockMachine,
  }
})
