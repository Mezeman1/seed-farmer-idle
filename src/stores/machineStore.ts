import { defineStore } from 'pinia'
import { ref, computed, watch, onMounted } from 'vue'
import Decimal from 'break_infinity.js'
import { useCoreStore } from './coreStore'
import { useFarmStore } from './farmStore'
import { usePersistenceStore } from './persistenceStore'
import { useSeasonStore } from './seasonStore'
import { formatDecimal } from '@/utils/formatting'
import type { Store } from 'pinia'

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

export type LevelingType = 'ticks' | 'purchases' | 'seeds'

export interface Machine {
  id: number
  name: string
  description: string
  points: number
  totalTicksForCurrentLevel: Decimal
  level: number
  unlocked: boolean
  unlockCost?: number // Cost in seeds to unlock the machine
  levelingType: LevelingType // How this machine levels up
  levelingUnit: string // Display name for the leveling unit (e.g., "ticks", "purchases")
  levelingMultiplier: number // Base amount needed for level 1
  levelingScalingFactor: number // How much the requirement increases per level
  upgrades: MachineUpgrade[]
}

// Add interface for machine progress
export interface MachineProgress {
  current: Decimal
  target: Decimal
  remaining: Decimal
  unit: string
  percentage: number
}

// Add interface for store return type
export interface MachineStore
  extends Store<
    'machine',
    {
      machines: Machine[]
      totalManualPurchases: number
    }
  > {
  updateMultipliers: () => void
  updateMachinePoints: () => void
  levelUpMachine: (machineId: number) => boolean
  purchaseMachineUpgrade: (machineId: number, upgradeId: number) => boolean
  getTicksForNextLevel: (machineId: number) => Decimal
  unlockMachine: (machineId: number) => boolean
  tick: () => void
  isUpgradeUnlocked: (machine: Machine, upgradeId: number) => boolean
  setMachineLevelingMultiplier: (machineId: number, reductionLevel: number) => void
  getMachineProgress: (machine: Machine) => MachineProgress
}

export const useMachineStore = defineStore('machine', () => {
  // Reference to core store
  const coreStore = useCoreStore()
  const farmStore = useFarmStore()
  const persistenceStore = usePersistenceStore()
  const seasonStore = useSeasonStore()

  // Machines state
  const machines = ref<Machine[]>([
    {
      id: 0,
      name: 'Seed Processor',
      description: 'Increases Farm 1 production efficiency, boosting seed generation',
      points: 0,
      totalTicksForCurrentLevel: new Decimal(0),
      level: 1,
      unlocked: true, // First machine is free and unlocked by default
      levelingType: 'ticks',
      levelingUnit: 'ticks',
      levelingMultiplier: 3, // Base 10 ticks for level 1
      levelingScalingFactor: 1.4, // 1.4x more ticks per level
      upgrades: [
        {
          id: 0,
          name: 'Seed Boost',
          description: 'Increases Farm 1 production by 10% per level per machine level',
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
                const machineLevel = context.machine.level
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.1 * machineLevel
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                return `+${formatDecimal(new Decimal(level * 10 * machineLevel))}% to Farm 1`
              },
            } as FarmMultiplierEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            const machineLevel = context.machine.level
            return `+${formatDecimal(new Decimal(level * 10 * machineLevel))}% to Farm 1 production`
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
                return `+${formatDecimal(new Decimal(boost * 100))}% to Farm 2 (based on machine level ${machineLevel})`
              },
            } as CrossFarmBoostEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            const machineLevel = context.machine.level
            const boost = level * machineLevel * 0.01
            return `+${formatDecimal(new Decimal(boost * 100))}% to Farm 2 production (based on machine level ${machineLevel})`
          },
        },
        {
          id: 2,
          name: 'Differential Boost',
          description: 'Increases Farm 1 production by 10% and Farm 2 by 5% per level per machine level',
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
                const machineLevel = context.machine.level
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.1 * machineLevel
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                return `+${formatDecimal(new Decimal(level * 10 * machineLevel))}% to Farm 1`
              },
            } as FarmMultiplierEffect,
            {
              type: 'farm_multiplier',
              farmIndex: 1,
              getMultiplier: (level: number) => 1 + level * 0.05, // 5% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${1}`
                const machineLevel = context.machine.level
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.05 * machineLevel
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                return `+${formatDecimal(new Decimal(level * 5 * machineLevel))}% to Farm 2`
              },
            } as FarmMultiplierEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            const machineLevel = context.machine.level
            return `+${formatDecimal(new Decimal(level * 10 * machineLevel))}% to Farm 1 and +${formatDecimal(new Decimal(level * 5 * machineLevel))}% to Farm 2`
          },
        },
      ],
    },
    {
      id: 1,
      name: 'Farm 2 Enhancer',
      description: 'Boosts Farm 2 production based on manual purchases',
      points: 0,
      totalTicksForCurrentLevel: new Decimal(0),
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
          description: 'Increases Farm 2 production by 15% per level per machine level',
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
                const machineLevel = context.machine.level
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.15 * machineLevel
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                return `+${formatDecimal(new Decimal(level * 15 * machineLevel))}% to Farm 2`
              },
            } as FarmMultiplierEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            const machineLevel = context.machine.level
            return `+${formatDecimal(new Decimal(level * 15 * machineLevel))}% to Farm 2 production`
          },
        },
        {
          id: 1,
          name: 'Dual Farm Enhancer',
          description: 'Increases both Farm 1 and Farm 2 production by 5% per level per machine level',
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
                const machineLevel = context.machine.level
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.05 * machineLevel
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                return `+${formatDecimal(new Decimal(level * 5 * machineLevel))}% to Farm 1`
              },
            } as FarmMultiplierEffect,
            {
              type: 'farm_multiplier',
              farmIndex: 1,
              getMultiplier: (level: number) => 1 + level * 0.05, // 5% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${1}`
                const machineLevel = context.machine.level
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.05 * machineLevel
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                return `+${formatDecimal(new Decimal(level * 5 * machineLevel))}% to Farm 2`
              },
            } as FarmMultiplierEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            const machineLevel = context.machine.level
            return `+${formatDecimal(new Decimal(level * 5 * machineLevel))}% to both Farm 1 and Farm 2 production`
          },
        },
        {
          id: 2,
          name: 'Advanced Farm Synergy',
          description: 'Increases Farm 1 by 7% and Farm 2 by 12% per level per machine level',
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
                const machineLevel = context.machine.level
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.07 * machineLevel
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                return `+${formatDecimal(new Decimal(level * 7 * machineLevel))}% to Farm 1`
              },
            } as FarmMultiplierEffect,
            {
              type: 'farm_multiplier',
              farmIndex: 1,
              getMultiplier: (level: number) => 1 + level * 0.12, // 12% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${1}`
                const machineLevel = context.machine.level
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.12 * machineLevel
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                return `+${formatDecimal(new Decimal(level * 12 * machineLevel))}% to Farm 2`
              },
            } as FarmMultiplierEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            const machineLevel = context.machine.level
            return `+${formatDecimal(new Decimal(level * 7 * machineLevel))}% to Farm 1 and +${formatDecimal(new Decimal(level * 12 * machineLevel))}% to Farm 2`
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
              getDescription: (level: number) => `${formatDecimal(new Decimal(level * 5))}% faster ticks (max 50%)`,
            } as TickSpeedEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            const reduction = Math.min(50, level * 5)
            return `${formatDecimal(new Decimal(reduction))}% faster ticks (${formatDecimal(new Decimal(100 - reduction))}% of normal time)`
          },
        },
      ],
    },
    {
      id: 2,
      name: 'Advanced Farm Controller',
      description: 'Enhances higher-tier farms (3-5) based on total seeds accumulated',
      points: 0,
      totalTicksForCurrentLevel: new Decimal(0),
      level: 1,
      unlocked: false,
      unlockCost: 5000000, // Costs 5,000,000 seeds to unlock
      levelingType: 'seeds',
      levelingUnit: 'seeds',
      levelingMultiplier: 1000000, // 1,000,000 seeds per level
      levelingScalingFactor: 3.5, // 3.5x more seeds needed per level (very steep scaling)
      upgrades: [
        {
          id: 0,
          name: 'Basic Farm Boost',
          description: 'Increases Farm 1 and 2 production by 2.5% per level per machine level',
          cost: 1,
          level: 0,
          effects: [
            {
              type: 'farm_multiplier',
              farmIndex: 0, // Farm 1 has index 0
              getMultiplier: (level: number) => 1 + level * 0.025, // 2.5% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${0}`
                const machineLevel = context.machine.level
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.025 * machineLevel
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                return `+${formatDecimal(new Decimal(level * 2.5 * machineLevel))}% to Farm 1`
              },
            } as FarmMultiplierEffect,
            {
              type: 'farm_multiplier',
              farmIndex: 1, // Farm 2 has index 1
              getMultiplier: (level: number) => 1 + level * 0.05, // 5% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${1}`
                const machineLevel = context.machine.level
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.05 * machineLevel
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                return `+${formatDecimal(new Decimal(level * 5 * machineLevel))}% to Farm 2`
              },
            } as FarmMultiplierEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            const machineLevel = context.machine.level
            return `+${formatDecimal(new Decimal(level * 2.5 * machineLevel))}% to Farm 1 and +${formatDecimal(new Decimal(level * 5 * machineLevel))}% to Farm 2`
          },
        },
        {
          id: 1,
          name: 'Farm 3 Optimizer',
          description: 'Increases Farm 3 production by 20% per level per machine level',
          cost: 1,
          level: 0,
          unlockCondition: {
            check: (machine: Machine) => {
              // Requires Basic Farm Boost to be at least level 3
              const basicFarmBoost = machine.upgrades.find(u => u.id === 0)
              return basicFarmBoost ? basicFarmBoost.level >= 3 : false
            },
            description: 'Requires Basic Farm Boost level 3',
          },
          effects: [
            {
              type: 'farm_multiplier',
              farmIndex: 2, // Farm 3 has index 2
              getMultiplier: (level: number) => 1 + level * 0.2, // 20% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${2}`
                const machineLevel = context.machine.level
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.2 * machineLevel
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                return `+${formatDecimal(new Decimal(level * 20 * machineLevel))}% to Farm 3`
              },
            } as FarmMultiplierEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            const machineLevel = context.machine.level
            return `+${formatDecimal(new Decimal(level * 20 * machineLevel))}% to Farm 3 production`
          },
        },
        {
          id: 2,
          name: 'Farm 4 Enhancer',
          description: 'Increases Farm 4 production by 25% per level per machine level',
          cost: 1,
          level: 0,
          unlockCondition: {
            check: (machine: Machine) => {
              // Requires Farm 3 Optimizer to be at least level 3
              const farm3Optimizer = machine.upgrades.find(u => u.id === 1)
              return farm3Optimizer ? farm3Optimizer.level >= 3 : false
            },
            description: 'Requires Farm 3 Optimizer level 3',
          },
          effects: [
            {
              type: 'farm_multiplier',
              farmIndex: 3, // Farm 4 has index 3
              getMultiplier: (level: number) => 1 + level * 0.25, // 25% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${3}`
                const machineLevel = context.machine.level
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.25 * machineLevel
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                return `+${formatDecimal(new Decimal(level * 25 * machineLevel))}% to Farm 4`
              },
            } as FarmMultiplierEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            const machineLevel = context.machine.level
            return `+${formatDecimal(new Decimal(level * 25 * machineLevel))}% to Farm 4 production`
          },
        },
        {
          id: 3,
          name: 'Farm 5 Booster',
          description: 'Increases Farm 5 production by 30% per level per machine level',
          cost: 1,
          level: 0,
          unlockCondition: {
            check: (machine: Machine) => {
              // Requires Farm 4 Enhancer to be at least level 3
              const farm4Enhancer = machine.upgrades.find(u => u.id === 2)
              return farm4Enhancer ? farm4Enhancer.level >= 3 : false
            },
            description: 'Requires Farm 4 Enhancer level 3',
          },
          effects: [
            {
              type: 'farm_multiplier',
              farmIndex: 4, // Farm 5 has index 4
              getMultiplier: (level: number) => 1 + level * 0.3, // 30% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${4}`
                const machineLevel = context.machine.level
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.3 * machineLevel
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                return `+${formatDecimal(new Decimal(level * 30 * machineLevel))}% to Farm 5`
              },
            } as FarmMultiplierEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            const machineLevel = context.machine.level
            return `+${formatDecimal(new Decimal(level * 30 * machineLevel))}% to Farm 5 production`
          },
        },
        {
          id: 4,
          name: 'High-Tier Synergy',
          description: 'Increases Farms 3, 4, and 5 production by 15% per level per machine level',
          cost: 1,
          level: 0,
          unlockCondition: {
            check: (machine: Machine) => {
              // Requires all previous upgrades to be at least level 2
              const farm3Optimizer = machine.upgrades.find(u => u.id === 1)
              const farm4Enhancer = machine.upgrades.find(u => u.id === 2)
              const farm5Booster = machine.upgrades.find(u => u.id === 3)
              return farm3Optimizer && farm4Enhancer && farm5Booster
                ? farm3Optimizer.level >= 2 && farm4Enhancer.level >= 2 && farm5Booster.level >= 2
                : false
            },
            description: 'Requires all previous upgrades at level 2',
          },
          effects: [
            {
              type: 'farm_multiplier',
              farmIndex: 2, // Farm 3
              getMultiplier: (level: number) => 1 + level * 0.15, // 15% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${2}`
                const machineLevel = context.machine.level
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.15 * machineLevel
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                return `+${formatDecimal(new Decimal(level * 15 * machineLevel))}% to Farm 3`
              },
            } as FarmMultiplierEffect,
            {
              type: 'farm_multiplier',
              farmIndex: 3, // Farm 4
              getMultiplier: (level: number) => 1 + level * 0.15, // 15% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${3}`
                const machineLevel = context.machine.level
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.15 * machineLevel
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                return `+${formatDecimal(new Decimal(level * 15 * machineLevel))}% to Farm 4`
              },
            } as FarmMultiplierEffect,
            {
              type: 'farm_multiplier',
              farmIndex: 4, // Farm 5
              getMultiplier: (level: number) => 1 + level * 0.15, // 15% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${4}`
                const machineLevel = context.machine.level
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.15 * machineLevel
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                return `+${formatDecimal(new Decimal(level * 15 * machineLevel))}% to Farm 5`
              },
            } as FarmMultiplierEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            const machineLevel = context.machine.level
            return `+${formatDecimal(new Decimal(level * 15 * machineLevel))}% to Farms 3, 4, and 5 production`
          },
        },
      ],
    },
    {
      id: 3,
      name: 'Elite Farm Controller',
      description: 'Specializes in boosting Farms 6-7 with unique synergy effects',
      points: 0,
      totalTicksForCurrentLevel: new Decimal(0),
      level: 1,
      unlocked: false,
      unlockCost: 1e100, // Very expensive to unlock
      levelingType: 'seeds',
      levelingUnit: 'seeds',
      levelingMultiplier: 1e90, // High base requirement
      levelingScalingFactor: 5, // Steeper scaling than Advanced Farm Controller
      upgrades: [
        {
          id: 0,
          name: 'Elite Synergy',
          description: 'Increases Farm 6 and 7 production by 50% per level per machine level',
          cost: 1,
          level: 0,
          effects: [
            {
              type: 'farm_multiplier',
              farmIndex: 5, // Farm 6
              getMultiplier: (level: number) => 1 + level * 0.5, // 50% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${5}`
                const machineLevel = context.machine.level
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.5 * machineLevel
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                return `+${formatDecimal(new Decimal(level * 50 * machineLevel))}% to Farm 6`
              },
            } as FarmMultiplierEffect,
            {
              type: 'farm_multiplier',
              farmIndex: 6, // Farm 7
              getMultiplier: (level: number) => 1 + level * 0.5, // 50% increase per level
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farmKey = `farm${6}`
                const machineLevel = context.machine.level
                if (context.multipliers[farmKey]) {
                  context.multipliers[farmKey] *= 1 + level * 0.5 * machineLevel
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                return `+${formatDecimal(new Decimal(level * 50 * machineLevel))}% to Farm 7`
              },
            } as FarmMultiplierEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            const machineLevel = context.machine.level
            return `+${formatDecimal(new Decimal(level * 50 * machineLevel))}% to Farms 6 and 7 production`
          },
        },
        {
          id: 1,
          name: 'Cascade Effect',
          description: 'Each Farm 7 owned increases Farm 6 production by 10% per level per machine level',
          cost: 1,
          level: 0,
          unlockCondition: {
            check: (machine: Machine) => {
              const eliteSynergy = machine.upgrades.find(u => u.id === 0)
              return eliteSynergy ? eliteSynergy.level >= 3 : false
            },
            description: 'Requires Elite Synergy level 3',
          },
          effects: [
            {
              type: 'cross_farm_boost',
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const machineLevel = context.machine.level
                const farm7 = context.machines[6]
                if (farm7 && farm7.totalOwned) {
                  const boost = 1 + level * machineLevel * 0.1 * farm7.totalOwned.toNumber()
                  context.multipliers['farm5'] *= boost // Boost Farm 6
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                const farm7 = context.machines[6]
                if (!farm7 || !farm7.totalOwned) return 'No effect yet'
                const boost = level * machineLevel * 0.1 * farm7.totalOwned.toNumber()
                return `+${formatDecimal(new Decimal(boost * 100))}% to Farm 6 (based on ${farm7.totalOwned.toString()} Farm 7s)`
              },
            } as CrossFarmBoostEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            const machineLevel = context.machine.level
            const farm7 = context.machines[6]
            if (!farm7 || !farm7.totalOwned) return 'No Farm 7s owned yet'
            const boost = level * machineLevel * 0.1 * farm7.totalOwned.toNumber()
            return `+${formatDecimal(new Decimal(boost * 100))}% to Farm 6 production (based on Farm 7 count)`
          },
        },
        {
          id: 2,
          name: 'Production Amplifier',
          description: 'Increases base production of Farms 6 and 7 by 1 per level',
          cost: 1,
          level: 0,
          unlockCondition: {
            check: (machine: Machine) => {
              const cascadeEffect = machine.upgrades.find(u => u.id === 1)
              return cascadeEffect ? cascadeEffect.level >= 4 : false
            },
            description: 'Requires Cascade Effect level 4',
          },
          effects: [
            {
              type: 'base_production',
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const farm6 = context.machines[5]
                const farm7 = context.machines[6]
                if (farm6) farm6.baseProduction = farm6.baseProduction.add(level)
                if (farm7) farm7.baseProduction = farm7.baseProduction.add(level)
              },
              getDescription: (level: number) => {
                return `+${level} base production to Farms 6 and 7`
              },
            },
          ],
          getEffectDisplay: (level: number) => {
            if (level === 0) return 'No effect yet'
            return `+${level} base production to Farms 6 and 7`
          },
        },
        {
          id: 3,
          name: 'Quantum Linkage',
          description: 'Each Farm 6 and 7 increases all lower farm production by 1% per level per machine level',
          cost: 1,
          level: 0,
          unlockCondition: {
            check: (machine: Machine) => {
              const productionAmplifier = machine.upgrades.find(u => u.id === 2)
              return productionAmplifier ? productionAmplifier.level >= 3 : false
            },
            description: 'Requires Production Amplifier level 3',
          },
          effects: [
            {
              type: 'cross_farm_boost',
              apply: (level: number, context: any) => {
                if (level <= 0) return
                const machineLevel = context.machine.level
                const farm6 = context.machines[5]
                const farm7 = context.machines[6]
                if (!farm6 || !farm7) return

                const totalHighTierFarms = farm6.totalOwned.add(farm7.totalOwned)
                const boost = 1 + level * machineLevel * 0.01 * totalHighTierFarms.toNumber()

                // Apply boost to all lower farms
                for (let i = 0; i < 5; i++) {
                  context.multipliers[`farm${i}`] *= boost
                }
              },
              getDescription: (level: number, context: any) => {
                const machineLevel = context.machine.level
                const farm6 = context.machines[5]
                const farm7 = context.machines[6]
                if (!farm6 || !farm7) return 'No effect yet'

                const totalHighTierFarms = farm6.totalOwned.add(farm7.totalOwned)
                const boost = level * machineLevel * 0.01 * totalHighTierFarms.toNumber()
                return `+${formatDecimal(new Decimal(boost * 100))}% to Farms 1-5 (based on ${totalHighTierFarms.toString()} high-tier farms)`
              },
            } as CrossFarmBoostEffect,
          ],
          getEffectDisplay: (level: number, context: any) => {
            if (level === 0) return 'No effect yet'
            const machineLevel = context.machine.level
            const farm6 = context.machines[5]
            const farm7 = context.machines[6]
            if (!farm6 || !farm7) return 'No high-tier farms owned yet'

            const totalHighTierFarms = farm6.totalOwned.add(farm7.totalOwned)
            const boost = level * machineLevel * 0.01 * totalHighTierFarms.toNumber()
            return `+${formatDecimal(new Decimal(boost * 100))}% to Farms 1-5 production (based on Farm 6 & 7 count)`
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
      } else if (machine.levelingType === 'seeds') {
        // Level up based on seeds
        const coreStore = useCoreStore()
        const totalSeeds = coreStore.seeds
        const requiredAmount = getRequiredAmountForNextLevel(machine)

        if (totalSeeds.gte(requiredAmount)) {
          machine.level++
          machine.points++

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

  // Update machine points based on ticks
  const updateMachinePoints = () => {
    machines.value.forEach(machine => {
      if (!machine.unlocked || machine.levelingType !== 'ticks') return

      machine.totalTicksForCurrentLevel = machine.totalTicksForCurrentLevel.plus(1)

      // Auto level up when enough ticks are accumulated
      const ticksNeeded = getRequiredAmountForNextLevel(machine)
      if (machine.totalTicksForCurrentLevel.gte(ticksNeeded)) {
        machine.totalTicksForCurrentLevel = new Decimal(0) // Reset ticks for current level
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
  const getRequiredAmountForNextLevel = (machine: Machine): Decimal => {
    // Get the seasonStore to check for machine reduction multipliers
    const seasonStore = useSeasonStore()

    if (machine.levelingType === 'ticks') {
      // Calculate base requirement using Decimal
      const baseMultiplier = new Decimal(machine.levelingMultiplier)
      const scalingFactor = new Decimal(machine.levelingScalingFactor)
      const level = new Decimal(machine.level - 1)

      // Calculate: multiplier * (scalingFactor ^ (level-1))
      const baseRequirement = baseMultiplier.times(scalingFactor.pow(level)).floor()

      // Check if there's a reduction multiplier from prestige upgrades
      const reductionKey = `machine${machine.id}TickReduction`
      if (seasonStore.prestigeMultipliers[reductionKey] && seasonStore.prestigeMultipliers[reductionKey].lt(1)) {
        // Apply the reduction
        return baseRequirement.times(seasonStore.prestigeMultipliers[reductionKey]).floor().max(1)
      }

      return baseRequirement
    } else if (machine.levelingType === 'purchases') {
      // Calculate base requirement using Decimal
      const baseMultiplier = new Decimal(machine.levelingMultiplier)
      const level = new Decimal(machine.level)

      // Calculate: multiplier * level
      const baseRequirement = baseMultiplier.times(level)

      // Check if there's a reduction multiplier from prestige upgrades
      const reductionKey = `machine${machine.id}PurchaseReduction`
      if (seasonStore.prestigeMultipliers[reductionKey] && seasonStore.prestigeMultipliers[reductionKey].lt(1)) {
        // Apply the reduction
        return baseRequirement.times(seasonStore.prestigeMultipliers[reductionKey]).floor().max(1)
      }

      return baseRequirement
    } else if (machine.levelingType === 'seeds') {
      // Calculate base requirement using Decimal
      const baseMultiplier = new Decimal(machine.levelingMultiplier)
      const scalingFactor = new Decimal(machine.levelingScalingFactor)
      const level = new Decimal(machine.level)

      // Calculate: multiplier * (scalingFactor ^ level)
      const baseRequirement = baseMultiplier.times(scalingFactor.pow(level)).floor()

      // Check if there's a reduction multiplier from prestige upgrades
      const reductionKey = `machine${machine.id}SeedReduction`
      if (seasonStore.prestigeMultipliers[reductionKey] && seasonStore.prestigeMultipliers[reductionKey].lt(1)) {
        // Apply the reduction
        return baseRequirement.times(seasonStore.prestigeMultipliers[reductionKey]).floor().max(1)
      }

      return baseRequirement
    }
    return new Decimal(0)
  }

  // Get amount needed for next level by machine ID
  const getTicksForNextLevel = (machineId: number): Decimal => {
    const machine = machines.value.find(m => m.id === machineId)
    if (!machine) return new Decimal(0)

    return getRequiredAmountForNextLevel(machine)
  }

  // Get current progress for a machine
  const getMachineProgress = (machine: Machine) => {
    if (!machine || !machine.unlocked) {
      return {
        current: new Decimal(0),
        target: new Decimal(0),
        remaining: new Decimal(0),
        unit: 'ticks',
        percentage: 0,
      }
    }

    const getLevelingInfo = {
      ticks: () => {
        const ticksNeeded = getRequiredAmountForNextLevel(machine)
        return {
          current: machine.totalTicksForCurrentLevel,
          target: ticksNeeded,
          remaining: ticksNeeded.minus(machine.totalTicksForCurrentLevel).max(0),
          unit: machine.levelingUnit,
          percentage: Math.min(100, machine.totalTicksForCurrentLevel.div(ticksNeeded).times(100).toNumber()),
        }
      },
      purchases: () => {
        const nextLevel = machine.level + 1
        const purchasesNeeded = new Decimal(machine.levelingMultiplier).times(nextLevel)
        const current = new Decimal(totalManualPurchases.value)
        return {
          current,
          target: purchasesNeeded,
          remaining: purchasesNeeded.minus(current).max(0),
          unit: machine.levelingUnit,
          percentage: Math.min(100, current.div(purchasesNeeded).times(100).toNumber()),
        }
      },
      seeds: () => {
        const coreStore = useCoreStore()
        const current = coreStore.seeds
        const target = getRequiredAmountForNextLevel(machine)
        return {
          current,
          target,
          remaining: target.minus(current).max(0),
          unit: machine.levelingUnit,
          percentage: Math.min(100, current.div(target).times(100).toNumber()),
        }
      },
    }

    return getLevelingInfo[machine.levelingType]?.() || getLevelingInfo['ticks']()
  }

  const updateMultipliers = () => {
    // Initialize all farm multipliers to 1
    const farmMultipliers: { [key: string]: Decimal } = {}

    // Initialize other game state variables
    const gameState = {
      multipliers: farmMultipliers,
      tickSpeedMultiplier: new Decimal(1.0),
    }

    // Make sure all farms have a base multiplier of 1
    farmStore.farms.forEach((farm, index) => {
      farmMultipliers[`farm${index}`] = new Decimal(1)
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
    if (gameState.tickSpeedMultiplier.lt(1.0)) {
      // TODO: Implement updateTickSpeedMultiplier in coreStore
      coreStore.updateTickSpeedMultiplier(gameState.tickSpeedMultiplier)
      console.log(`Tick speed multiplier: ${gameState.tickSpeedMultiplier}`)
    }
  }

  const levelUpMachine = (machineId: number) => {
    const machine = machines.value.find(m => m.id === machineId)
    if (!machine) return false

    // Skip machines that don't level up based on ticks
    if (machine.levelingType !== 'ticks') return false

    // This function is now just a fallback, as machines auto-level
    const requiredAmount = getRequiredAmountForNextLevel(machine)

    if (machine.totalTicksForCurrentLevel.gte(requiredAmount)) {
      machine.totalTicksForCurrentLevel = new Decimal(0) // Reset ticks for current level
      machine.level++
      machine.points++ // Give one point per level up
      return true
    }

    return false
  }

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
        if (machine.totalTicksForCurrentLevel.gte(requiredAmount)) {
          const levelsToAdd = machine.totalTicksForCurrentLevel.div(requiredAmount).floor()
          machine.level += levelsToAdd.toNumber()
          machine.points += levelsToAdd.toNumber()
          // Use subtract instead of mod to get the remainder
          machine.totalTicksForCurrentLevel = machine.totalTicksForCurrentLevel.sub(requiredAmount.mul(levelsToAdd))
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

  const isUpgradeUnlocked = (machine: Machine, upgradeId: number): boolean => {
    const upgrade = machine.upgrades.find(u => u.id === upgradeId)
    if (!upgrade) return false

    // If there's no unlock condition, it's always unlocked
    if (!upgrade.unlockCondition) return true

    // Check the unlock condition
    return upgrade.unlockCondition.check(machine)
  }

  const setMachineLevelingMultiplier = (machineId: number, reductionLevel: number) => {
    const machine = machines.value.find(m => m.id === machineId)
    if (!machine) return

    // Apply the reduction to the machine's leveling multiplier
    // The original values are stored in the machine config
    // We'll apply a reduction of 10% per level, with a minimum of 10% of the original value
    const originalMultiplier = machine.id === 0 ? 10 : machine.id === 1 ? 10 : 10 // Default values
    const reductionFactor = Math.max(0.1, 1 - reductionLevel * 0.1) // 10% reduction per level, min 10%

    // Update the machine's leveling multiplier
    machine.levelingMultiplier = originalMultiplier * reductionFactor
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
    setMachineLevelingMultiplier,
    getMachineProgress,
  }
})
