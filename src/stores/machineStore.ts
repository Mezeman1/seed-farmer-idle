import { defineStore } from 'pinia'
import { ref, computed, watch, onMounted } from 'vue'
import Decimal from 'break_infinity.js'
import { useCoreStore } from './coreStore'
import { useFarmStore } from './farmStore'
import { usePersistenceStore } from './persistenceStore'

// Effect interface for all types of effects
export interface UpgradeEffect {
  // Type of the effect (for UI display and filtering)
  type: string
  // Function to apply the effect
  apply: (level: number, context: any) => void
  // Function to get a description of the effect
  getDescription: (level: number, context?: any) => string
}

// Farm multiplier effect
export interface FarmMultiplierEffect extends UpgradeEffect {
  type: 'farm_multiplier'
  farmIndex: number
  getMultiplier: (level: number) => number
}

// Cross-farm boost effect
export interface CrossFarmBoostEffect extends UpgradeEffect {
  type: 'cross_farm_boost'
}

// Tick speed effect (for future use)
export interface TickSpeedEffect extends UpgradeEffect {
  type: 'tick_speed'
  getSpeedMultiplier: (level: number) => number
}

// Unlock condition for upgrades
export interface UpgradeUnlockCondition {
  // Function to check if the upgrade is unlocked
  check: (machine: Machine) => boolean
  // Description of the unlock condition
  description: string
}

export interface MachineUpgrade {
  id: number
  name: string
  description: string
  cost: number
  level: number
  maxLevel?: number
  // Array of effects this upgrade has
  effects: UpgradeEffect[]
  // Display text for the combined effect
  getEffectDisplay: (level: number, context: any) => string
  // Condition that must be met for this upgrade to be unlocked
  unlockCondition?: UpgradeUnlockCondition
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
      upgrades: [
        {
          id: 0,
          name: 'Seed Boost',
          description: 'Increases Farm 1 production by 10% per level',
          cost: 1, // Always costs 1 point
          level: 0,
          effects: [
            {
              type: 'farm_multiplier',
              farmIndex: 0,
              getMultiplier: (level: number) => 1 + level * 0.1, // 10% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${0}`
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.1
                }
              },
              getDescription: (level: number) => `+${(level * 10).toFixed(0)}% to Farm 1`,
            } as FarmMultiplierEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            return `+${(level * 10).toFixed(0)}% to Farm 1 production`
          },
        },
        {
          id: 1,
          name: 'Cross-Farm Synergy',
          description: "Increases Farm 2 production based on this machine's level and upgrade level",
          cost: 1,
          level: 0,
          unlockCondition: {
            check: (machine: Machine) => {
              // Requires Seed Boost to be at least level 5
              const seedBoost = machine.upgrades.find(u => u.id === 0)
              return seedBoost ? seedBoost.level >= 5 : false
            },
            description: 'Requires Seed Boost level 5',
          },
          effects: [
            {
              type: 'cross_farm_boost',
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const machineLevel = context.machine.level
                const boost = 1 + level * machineLevel * 0.01 // 1% per level * machine level
                // Farm 2 has index 1 in the new system
                context.multipliers['farm1'] *= boost
              },
              getDescription: (level: number, context: any) => {
                if (level === 0) return 'No effect yet'
                const machineLevel = context.machine.level
                const boost = level * machineLevel * 0.01
                return `+${(boost * 100).toFixed(1)}% to Farm 2 (based on machine level ${machineLevel})`
              },
            } as CrossFarmBoostEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            const machineLevel = context.machine.level
            const boost = level * machineLevel * 0.01
            return `+${(boost * 100).toFixed(1)}% to Farm 2 production (based on machine level ${machineLevel})`
          },
        },
        {
          id: 2,
          name: 'Differential Boost',
          description: 'Increases Farm 1 production by 10% and Farm 2 by 5% per level',
          cost: 1,
          level: 0,
          unlockCondition: {
            check: (machine: Machine) => {
              // Requires Cross-Farm Synergy to be at least level 3
              const crossFarmSynergy = machine.upgrades.find(u => u.id === 1)
              return crossFarmSynergy ? crossFarmSynergy.level >= 3 : false
            },
            description: 'Requires Cross-Farm Synergy level 3',
          },
          effects: [
            {
              type: 'farm_multiplier',
              farmIndex: 0,
              getMultiplier: (level: number) => 1 + level * 0.1, // 10% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${0}`
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.1
                }
              },
              getDescription: (level: number) => `+${(level * 10).toFixed(0)}% to Farm 1`,
            } as FarmMultiplierEffect,
            {
              type: 'farm_multiplier',
              farmIndex: 1,
              getMultiplier: (level: number) => 1 + level * 0.05, // 5% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${1}`
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.05
                }
              },
              getDescription: (level: number) => `+${(level * 5).toFixed(0)}% to Farm 2`,
            } as FarmMultiplierEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            return `+${(level * 10).toFixed(0)}% to Farm 1 and +${(level * 5).toFixed(0)}% to Farm 2`
          },
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
      upgrades: [
        {
          id: 0,
          name: 'Farm 2 Boost',
          description: 'Increases Farm 2 production by 15% per level',
          cost: 1,
          level: 0,
          effects: [
            {
              type: 'farm_multiplier',
              farmIndex: 1,
              getMultiplier: (level: number) => 1 + level * 0.15, // 15% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${1}`
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.15
                }
              },
              getDescription: (level: number) => `+${(level * 15).toFixed(0)}% to Farm 2`,
            } as FarmMultiplierEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            return `+${(level * 15).toFixed(0)}% to Farm 2 production`
          },
        },
        {
          id: 1,
          name: 'Dual Farm Enhancer',
          description: 'Increases both Farm 1 and Farm 2 production by 5% per level',
          cost: 1,
          level: 0,
          unlockCondition: {
            check: (machine: Machine) => {
              // Requires Farm 2 Boost to be at least level 4
              const farm2Boost = machine.upgrades.find(u => u.id === 0)
              return farm2Boost ? farm2Boost.level >= 4 : false
            },
            description: 'Requires Farm 2 Boost level 4',
          },
          effects: [
            {
              type: 'farm_multiplier',
              farmIndex: 0,
              getMultiplier: (level: number) => 1 + level * 0.05, // 5% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${0}`
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.05
                }
              },
              getDescription: (level: number) => `+${(level * 5).toFixed(0)}% to Farm 1`,
            } as FarmMultiplierEffect,
            {
              type: 'farm_multiplier',
              farmIndex: 1,
              getMultiplier: (level: number) => 1 + level * 0.05, // 5% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${1}`
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.05
                }
              },
              getDescription: (level: number) => `+${(level * 5).toFixed(0)}% to Farm 2`,
            } as FarmMultiplierEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            return `+${(level * 5).toFixed(0)}% to both Farm 1 and Farm 2 production`
          },
        },
        {
          id: 2,
          name: 'Advanced Farm Synergy',
          description: 'Increases Farm 1 by 7% and Farm 2 by 12% per level',
          cost: 1,
          level: 0,
          unlockCondition: {
            check: (machine: Machine) => {
              // Requires Dual Farm Enhancer to be at least level 3
              const dualFarmEnhancer = machine.upgrades.find(u => u.id === 1)
              return dualFarmEnhancer ? dualFarmEnhancer.level >= 3 : false
            },
            description: 'Requires Dual Farm Enhancer level 3',
          },
          effects: [
            {
              type: 'farm_multiplier',
              farmIndex: 0,
              getMultiplier: (level: number) => 1 + level * 0.07, // 7% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${0}`
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.07
                }
              },
              getDescription: (level: number) => `+${(level * 7).toFixed(0)}% to Farm 1`,
            } as FarmMultiplierEffect,
            {
              type: 'farm_multiplier',
              farmIndex: 1,
              getMultiplier: (level: number) => 1 + level * 0.12, // 12% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${1}`
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.12
                }
              },
              getDescription: (level: number) => `+${(level * 12).toFixed(0)}% to Farm 2`,
            } as FarmMultiplierEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            return `+${(level * 7).toFixed(0)}% to Farm 1 and +${(level * 12).toFixed(0)}% to Farm 2`
          },
        },
        {
          id: 3,
          name: 'Tick Accelerator',
          description: 'Decreases the time between ticks by 5% per level',
          cost: 1,
          level: 0,
          unlockCondition: {
            check: (machine: Machine) => {
              // Requires Advanced Farm Synergy to be at least level 2
              const advancedFarmSynergy = machine.upgrades.find(u => u.id === 2)
              return advancedFarmSynergy ? advancedFarmSynergy.level >= 2 : false
            },
            description: 'Requires Advanced Farm Synergy level 2',
          },
          effects: [
            {
              type: 'tick_speed',
              getSpeedMultiplier: (level: number) => 1 - Math.min(0.5, level * 0.05), // 5% faster per level, max 50%
              apply: (level: number, context: any) => {
                // This would be applied in the core game loop
                // We'll just store the multiplier for now
                if (level <= 0) return
                context.tickSpeedMultiplier = Math.min(0.5, 1 - level * 0.05)
              },
              getDescription: (level: number) => `${(level * 5).toFixed(0)}% faster ticks (max 50%)`,
            } as TickSpeedEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            const reduction = Math.min(50, level * 5)
            return `${reduction.toFixed(0)}% faster ticks (${(100 - reduction).toFixed(0)}% of normal time)`
          },
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

  const tick = () => {
    // Recalculate total manual purchases
    totalManualPurchases.value = calculateTotalManualPurchases()
    updateMachinePoints()
    updateMachineLevels()
    updateMultipliers()
  }

  // Update multipliers in core store
  const updateMultipliers = () => {
    // Initialize all farm multipliers to 1
    const farmMultipliers: { [key: string]: number } = {}

    // Initialize other game state variables
    const gameState = {
      multipliers: farmMultipliers,
      tickSpeedMultiplier: 1.0,
    }

    // Make sure all farms have a base multiplier of 1
    farmStore.farms.forEach((farm, index) => {
      farmMultipliers[`farm${index}`] = 1
    })

    // Apply all machine upgrade effects
    machines.value.forEach(machine => {
      if (!machine.unlocked) return

      // Process each upgrade
      machine.upgrades.forEach(upgrade => {
        if (upgrade.level <= 0) return

        // Apply all effects for this upgrade
        upgrade.effects.forEach(effect => {
          effect.apply(upgrade.level, {
            ...gameState,
            machine,
            machines: machines.value,
            totalManualPurchases: totalManualPurchases.value,
          })
        })
      })
    })

    // Apply all multipliers to core store
    Object.entries(farmMultipliers).forEach(([key, value]) => {
      coreStore.updateMultiplier(key, value)
    })

    // Apply tick speed multiplier (would be used in the game loop)
    if (gameState.tickSpeedMultiplier !== 1.0) {
      // TODO: Implement updateTickSpeedMultiplier in coreStore
      // coreStore.updateTickSpeedMultiplier(gameState.tickSpeedMultiplier)
      console.log(`Tick speed multiplier: ${gameState.tickSpeedMultiplier}`)
    }
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

  // Check if an upgrade is unlocked
  const isUpgradeUnlocked = (machine: Machine, upgradeId: number): boolean => {
    const upgrade = machine.upgrades.find(u => u.id === upgradeId)
    if (!upgrade) return false

    // If there's no unlock condition, it's always unlocked
    if (!upgrade.unlockCondition) return true

    // Check the unlock condition
    return upgrade.unlockCondition.check(machine)
  }

  // Purchase a machine upgrade
  const purchaseMachineUpgrade = (machineId: number, upgradeId: number) => {
    const machine = machines.value.find(m => m.id === machineId)
    if (!machine) return false

    const upgrade = machine.upgrades.find(u => u.id === upgradeId)
    if (!upgrade) return false

    // Check if at max level
    if (upgrade.maxLevel && upgrade.level >= upgrade.maxLevel) return false

    // Check if the upgrade is unlocked
    if (!isUpgradeUnlocked(machine, upgradeId)) return false

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
    tick,
    isUpgradeUnlocked,
  }
})
