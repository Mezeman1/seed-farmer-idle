import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Decimal from 'break_infinity.js'
import { useCoreStore } from './coreStore'
import { useMachineStore } from './machineStore'
import { useTickStore } from './tickStore'
import { usePersistenceStore } from './persistenceStore'
// Import the farmStore normally but use it carefully to avoid circular dependency issues
import { useFarmStore } from './farmStore'

// Interface for a harvest
export interface Harvest {
  id: number
  seedRequirement: Decimal
  completed: boolean
  pointsAwarded: number
  season: number
}

// Effect interface for all types of prestige effects
export interface PrestigeEffect {
  // Type of the effect (for UI display and filtering)
  type: string
  // Function to apply the effect
  apply: (level: number, context: any) => void
  // Function to get a description of the effect
  getDescription: (level: number, context?: any) => string
}

// Farm multiplier effect
export interface FarmMultiplierEffect extends PrestigeEffect {
  type: 'farm_multiplier'
  farmIndex: number
  getMultiplier: (level: number) => number | Decimal
}

// Harvest requirement effect
export interface HarvestRequirementEffect extends PrestigeEffect {
  type: 'harvest_requirement'
  getReductionMultiplier: (level: number) => number | Decimal
}

// Starting seeds effect
export interface StartingSeedsEffect extends PrestigeEffect {
  type: 'starting_seeds'
  getSeedsAmount: (level: number) => number | Decimal
}

// Harvest points effect
export interface HarvestPointsEffect extends PrestigeEffect {
  type: 'harvest_points'
  getPointsMultiplier: (level: number) => number | Decimal
}

// Auto farm purchase effect
export interface AutoFarmEffect extends PrestigeEffect {
  type: 'auto_farm'
  farmIndex: number
  getPurchaseAmount: (level: number) => number
}

// Interface for prestige upgrades
export interface PrestigeUpgrade {
  id: number
  name: string
  description: string
  baseCost: number
  costScaling: number
  maxLevel: number | null
  effects: PrestigeEffect[]
  getEffectDisplay: (level: number, context: any) => string
}

// Interface for saved prestige upgrades
export interface PrestigeUpgradeSave {
  id: number
  level: number
}

// Farm interface to avoid circular dependency
interface Farm {
  manuallyPurchased: Decimal
  totalOwned: Decimal
  owned: boolean
}

export const useSeasonStore = defineStore('season', () => {
  // References to other stores
  const coreStore = useCoreStore()
  const machineStore = useMachineStore()
  const tickStore = useTickStore()
  const persistenceStore = usePersistenceStore()
  // We'll get farmStore when needed instead of at initialization

  // Season state
  const currentSeason = ref<number>(1)
  const prestigePoints = ref<number>(0)
  const totalPrestigePoints = ref<number>(0)
  const harvests = ref<Harvest[]>([])
  const baseHarvestRequirement = ref<Decimal>(new Decimal(1000)) // Base requirement for first harvest
  const totalHarvestsCompleted = ref<number>(0) // Total harvests ever completed
  const harvestsCompletedThisSeason = ref<number>(0) // Harvests completed in current season
  const seasonHarvestCounter = ref<number>(0) // Tracks harvests within the current season for requirement calculation

  // Prestige upgrades state
  const prestigeUpgrades = ref<PrestigeUpgradeSave[]>([])
  const prestigeMultipliers = ref<{ [key: string]: Decimal }>({
    farm0: new Decimal(1), // Farm 1 multiplier from prestige
    farm1: new Decimal(1), // Farm 2 multiplier from prestige
    farm2: new Decimal(1), // Farm 3 multiplier from prestige
    farm3: new Decimal(1), // Farm 4 multiplier from prestige
    harvestRequirement: new Decimal(1), // Harvest requirement multiplier from prestige
    harvestPoints: new Decimal(1), // Harvest points multiplier from prestige
  })

  // Auto-buyers state (separate from multipliers since they're not decimal values)
  const autoBuyers = ref<{ [key: string]: number }>({
    farm0: 0, // Farm 1 auto-buyer level
    farm1: 0, // Farm 2 auto-buyer level
    farm2: 0, // Farm 3 auto-buyer level
    farm3: 0, // Farm 4 auto-buyer level
  })

  // Define available prestige upgrades
  const availablePrestigeUpgrades = ref<PrestigeUpgrade[]>([
    {
      id: 0,
      name: 'Farm 1 Boost',
      description: 'Increases Farm 1 production by 10% per level',
      baseCost: 1,
      costScaling: 1.5,
      maxLevel: null, // No maximum level
      effects: [
        {
          type: 'farm_multiplier',
          farmIndex: 0,
          getMultiplier: (level: number) => 1 + level * 0.1, // 10% increase per level
          apply: (level: number, context: any) => {
            if (level <= 0) return
            context.multipliers['farm0'] = new Decimal(1 + level * 0.1)
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
      name: 'Starting Seeds',
      description: 'Start each new season with more seeds',
      baseCost: 3,
      costScaling: 2,
      maxLevel: 5,
      effects: [
        {
          type: 'starting_seeds',
          getSeedsAmount: (level: number) => new Decimal(10).pow(level),
          apply: (level: number, context: any) => {
            // This effect is applied during season reset
            // No need to do anything here
          },
          getDescription: (level: number) => `Start with 10^${level} seeds`,
        } as StartingSeedsEffect,
      ],
      getEffectDisplay: (level: number, context: any) => {
        if (level === 0) return 'No effect yet'
        return `Start with ${new Decimal(10).pow(level).toString()} seeds`
      },
    },
    {
      id: 2,
      name: 'Harvest Efficiency',
      description: 'Reduces seed requirements for harvests',
      baseCost: 5,
      costScaling: 2.5,
      maxLevel: 10, // Maximum 50% reduction
      effects: [
        {
          type: 'harvest_requirement',
          getReductionMultiplier: (level: number) => {
            // 5% reduction per level, min 50%
            const reduction = 1 - level * 0.05
            return Math.max(0.5, reduction)
          },
          apply: (level: number, context: any) => {
            if (level <= 0) return
            // 5% reduction per level, min 50%
            const reduction = new Decimal(1).sub(new Decimal(level).mul(0.05))
            const finalReduction = Decimal.max(new Decimal(0.5), reduction)
            context.multipliers['harvestRequirement'] = finalReduction
          },
          getDescription: (level: number) => `-${Math.min(50, level * 5).toFixed(0)}% harvest requirements`,
        } as HarvestRequirementEffect,
      ],
      getEffectDisplay: (level: number, context: any) => {
        if (level === 0) return 'No effect yet'
        const reduction = Math.min(50, level * 5)
        return `Harvest requirements reduced by ${reduction.toFixed(0)}%`
      },
    },
    {
      id: 3,
      name: 'Dual Farm Boost',
      description: 'Increases both Farm 1 and Farm 2 production',
      baseCost: 8,
      costScaling: 2,
      maxLevel: null,
      effects: [
        {
          type: 'farm_multiplier',
          farmIndex: 0,
          getMultiplier: (level: number) => 1 + level * 0.05, // 5% increase per level for Farm 1
          apply: (level: number, context: any) => {
            if (level <= 0) return
            // Get current multiplier and multiply by the new one
            const currentMultiplier = context.multipliers['farm0'] || new Decimal(1)
            context.multipliers['farm0'] = currentMultiplier.mul(1 + level * 0.05)
          },
          getDescription: (level: number) => `+${(level * 5).toFixed(0)}% to Farm 1`,
        } as FarmMultiplierEffect,
        {
          type: 'farm_multiplier',
          farmIndex: 1,
          getMultiplier: (level: number) => 1 + level * 0.08, // 8% increase per level for Farm 2
          apply: (level: number, context: any) => {
            if (level <= 0) return
            // Get current multiplier and multiply by the new one
            const currentMultiplier = context.multipliers['farm1'] || new Decimal(1)
            context.multipliers['farm1'] = currentMultiplier.mul(1 + level * 0.08)
          },
          getDescription: (level: number) => `+${(level * 8).toFixed(0)}% to Farm 2`,
        } as FarmMultiplierEffect,
      ],
      getEffectDisplay: (level: number, context: any) => {
        if (level === 0) return 'No effect yet'
        return `+${(level * 5).toFixed(0)}% to Farm 1 and +${(level * 8).toFixed(0)}% to Farm 2 production`
      },
    },
    {
      id: 4,
      name: 'Harvest Points Boost',
      description: 'Increases prestige points earned from each harvest',
      baseCost: 10,
      costScaling: 3,
      maxLevel: 5,
      effects: [
        {
          type: 'harvest_points',
          getPointsMultiplier: (level: number) => 1 + level, // +1 point per level
          apply: (level: number, context: any) => {
            if (level <= 0) return
            context.multipliers['harvestPoints'] = new Decimal(1 + level)
          },
          getDescription: (level: number) => `+${level} points per harvest`,
        } as HarvestPointsEffect,
      ],
      getEffectDisplay: (level: number, context: any) => {
        if (level === 0) return 'No effect yet'
        return `+${level} prestige points per harvest`
      },
    },
    {
      id: 5,
      name: 'Farm 1 Auto-Buyer',
      description: 'Automatically purchases Farm 1 every tick based on level',
      baseCost: 5,
      costScaling: 2,
      maxLevel: null, // No maximum level
      effects: [
        {
          type: 'auto_farm',
          farmIndex: 0,
          getPurchaseAmount: (level: number) => level, // Buy level amount per tick
          apply: (level: number, context: any) => {
            if (level <= 0) return
            context.autoBuyers['farm0'] = level
          },
          getDescription: (level: number) => `Auto-buys ${level} Farm 1 per tick`,
        } as AutoFarmEffect,
      ],
      getEffectDisplay: (level: number, context: any) => {
        if (level === 0) return 'No effect yet'
        return `Automatically purchases ${level} Farm 1 per tick`
      },
    },
    {
      id: 6,
      name: 'Farm 2 Auto-Buyer',
      description: 'Automatically purchases Farm 2 every tick based on level',
      baseCost: 10,
      costScaling: 2.5,
      maxLevel: null,
      effects: [
        {
          type: 'auto_farm',
          farmIndex: 1,
          getPurchaseAmount: (level: number) => level, // Buy level amount per tick
          apply: (level: number, context: any) => {
            if (level <= 0) return
            context.autoBuyers['farm1'] = level
          },
          getDescription: (level: number) => `Auto-buys ${level} Farm 2 per tick`,
        } as AutoFarmEffect,
      ],
      getEffectDisplay: (level: number, context: any) => {
        if (level === 0) return 'No effect yet'
        return `Automatically purchases ${level} Farm 2 per tick`
      },
    },
    {
      id: 7,
      name: 'Farm 3 Auto-Buyer',
      description: 'Automatically purchases Farm 3 every tick based on level',
      baseCost: 20,
      costScaling: 3,
      maxLevel: null,
      effects: [
        {
          type: 'auto_farm',
          farmIndex: 2,
          getPurchaseAmount: (level: number) => level, // Buy level amount per tick
          apply: (level: number, context: any) => {
            if (level <= 0) return
            context.autoBuyers['farm2'] = level
          },
          getDescription: (level: number) => `Auto-buys ${level} Farm 3 per tick`,
        } as AutoFarmEffect,
      ],
      getEffectDisplay: (level: number, context: any) => {
        if (level === 0) return 'No effect yet'
        return `Automatically purchases ${level} Farm 3 per tick`
      },
    },
    {
      id: 8,
      name: 'Farm 4 Auto-Buyer',
      description: 'Automatically purchases Farm 4 every tick based on level',
      baseCost: 40,
      costScaling: 4,
      maxLevel: null,
      effects: [
        {
          type: 'auto_farm',
          farmIndex: 3,
          getPurchaseAmount: (level: number) => level, // Buy level amount per tick
          apply: (level: number, context: any) => {
            if (level <= 0) return
            context.autoBuyers['farm3'] = level
          },
          getDescription: (level: number) => `Auto-buys ${level} Farm 4 per tick`,
        } as AutoFarmEffect,
      ],
      getEffectDisplay: (level: number, context: any) => {
        if (level === 0) return 'No effect yet'
        return `Automatically purchases ${level} Farm 4 per tick`
      },
    },
  ])

  // Helper function to get farmStore when needed
  const getFarmStore = () => {
    // Get the farmStore safely
    try {
      return useFarmStore()
    } catch (e) {
      console.warn('Failed to get farmStore:', e)
      return null
    }
  }

  // Update a prestige multiplier
  const updatePrestigeMultiplier = (key: string, value: number | Decimal) => {
    // Convert value to Decimal if it's a number
    const decimalValue = typeof value === 'number' ? new Decimal(value) : value
    prestigeMultipliers.value[key] = decimalValue

    // Apply the multiplier to the appropriate game element
    if (key.startsWith('farm')) {
      // Get farmStore only when needed
      const farmStore = getFarmStore()
      if (farmStore && typeof farmStore.updateFarmMultipliers === 'function') {
        farmStore.updateFarmMultipliers()
      }
    }
  }

  // Apply all prestige upgrade effects
  const applyAllPrestigeEffects = () => {
    // Reset multipliers to default values
    prestigeMultipliers.value = {
      farm0: new Decimal(1),
      farm1: new Decimal(1),
      farm2: new Decimal(1),
      farm3: new Decimal(1),
      harvestRequirement: new Decimal(1),
      harvestPoints: new Decimal(1),
    }

    // Reset auto-buyers to default values
    autoBuyers.value = {
      farm0: 0,
      farm1: 0,
      farm2: 0,
      farm3: 0,
    }

    // Context for applying effects
    const context = {
      multipliers: prestigeMultipliers.value,
      autoBuyers: autoBuyers.value,
      season: currentSeason.value,
    }

    // Apply effects from all upgrades
    prestigeUpgrades.value.forEach(savedUpgrade => {
      const upgrade = availablePrestigeUpgrades.value.find(u => u.id === savedUpgrade.id)
      if (upgrade && savedUpgrade.level > 0) {
        upgrade.effects.forEach(effect => {
          effect.apply(savedUpgrade.level, context)
        })
      }
    })

    // Update farm multipliers after applying effects
    const farmStore = getFarmStore()
    if (farmStore && typeof farmStore.updateFarmMultipliers === 'function') {
      farmStore.updateFarmMultipliers()
    }
  }

  // Get upgrade level by ID
  const getUpgradeLevel = (upgradeId: number): number => {
    const upgrade = prestigeUpgrades.value.find(u => u.id === upgradeId)
    return upgrade ? upgrade.level : 0
  }

  // Update upgrade level
  const updateUpgradeLevel = (upgradeId: number, level: number) => {
    const upgrade = prestigeUpgrades.value.find(u => u.id === upgradeId)
    if (upgrade) {
      upgrade.level = level
    } else {
      prestigeUpgrades.value.push({
        id: upgradeId,
        level: level,
      })
    }

    // Apply all effects after updating
    applyAllPrestigeEffects()
  }

  // Computed properties
  const harvestsRequired = computed(() => {
    // Base requirement is 3 harvests (like CIFI)
    let required = new Decimal(3)

    // Apply scaling based on season number (similar to CIFI's formula)
    const season = currentSeason.value - 1 // Adjust to 0-indexed for calculation

    if (season <= 100) {
      required = required.add(new Decimal(season).mul(0.95))
    } else if (season <= 150) {
      required = required.add(new Decimal(100).mul(0.95)).add(new Decimal(season - 100).mul(1.35))
    } else if (season <= 200) {
      required = required
        .add(new Decimal(100).mul(0.95))
        .add(new Decimal(50).mul(1.35))
        .add(new Decimal(season - 150).mul(1.95))
    } else if (season <= 250) {
      required = required
        .add(new Decimal(100).mul(0.95))
        .add(new Decimal(50).mul(1.35))
        .add(new Decimal(50).mul(1.95))
        .add(new Decimal(season - 200).mul(2.55))
    } else if (season <= 300) {
      required = required
        .add(new Decimal(100).mul(0.95))
        .add(new Decimal(50).mul(1.35))
        .add(new Decimal(50).mul(1.95))
        .add(new Decimal(50).mul(2.55))
        .add(new Decimal(season - 250).mul(3.25))
    } else {
      required = required
        .add(new Decimal(100).mul(0.95))
        .add(new Decimal(50).mul(1.35))
        .add(new Decimal(50).mul(1.95))
        .add(new Decimal(50).mul(2.55))
        .add(new Decimal(50).mul(3.25))
        .add(new Decimal(season - 300).mul(4.05))
    }

    return required.ceil().toNumber()
  })

  const canPrestige = computed(() => new Decimal(harvestsCompletedThisSeason.value).gte(harvestsRequired.value))

  const nextHarvestRequirement = computed(() => {
    // Get the next harvest ID (total completed + 1)
    const nextHarvestId = totalHarvestsCompleted.value
    return calculateHarvestRequirement(nextHarvestId)
  })

  const harvestProgress = computed(() => {
    if (coreStore.seeds.eq(0) || nextHarvestRequirement.value.eq(0)) return 0

    const progress = coreStore.seeds.div(nextHarvestRequirement.value).toNumber()
    return Math.min(progress, 1) * 100 // Return as percentage, capped at 100%
  })

  // Calculate the seed requirement for a harvest based on its ID
  const calculateHarvestRequirement = (harvestId: number): Decimal => {
    // Get the base requirement for the current season
    // Scale the base requirement with the season number: 1000 * (2^(season-1))
    const seasonBaseRequirement = baseHarvestRequirement.value.mul(
      new Decimal(2).pow(Math.max(0, currentSeason.value - 1))
    )

    // Calculate requirement based on the harvest counter within this season
    // Formula: seasonBaseRequirement * (1.5^seasonHarvestCounter) * harvestRequirementMultiplier
    const baseReq = seasonBaseRequirement.mul(new Decimal(1.5).pow(seasonHarvestCounter.value))

    // Apply harvest efficiency multiplier if it exists
    return baseReq.mul(prestigeMultipliers.value.harvestRequirement)
  }

  // Calculate points awarded for a harvest
  const calculateHarvestPoints = (harvestId: number): number => {
    // Base points is 1, but can scale with harvest ID or other factors
    const basePoints = 1

    // Apply harvest points multiplier if it exists
    const pointsMultiplier = prestigeMultipliers.value.harvestPoints || new Decimal(1)

    return Math.floor(basePoints * pointsMultiplier.toNumber())
  }

  // Process auto-buyers during a tick
  const processAutoBuyers = () => {
    // Get farmStore only when needed
    const farmStore = getFarmStore()
    if (!farmStore) return

    // Process all auto-buyers
    Object.entries(autoBuyers.value).forEach(([farmKey, level]) => {
      if (level <= 0) return

      const farmIndex = parseInt(farmKey.replace('farm', ''))

      // Try to buy the farm 'level' times
      for (let i = 0; i < level; i++) {
        farmStore.buyFarm(farmIndex)
      }
    })
  }

  // Check for harvest completion during a tick
  const checkHarvests = () => {
    // Check if we can complete a harvest
    if (coreStore.seeds.gte(nextHarvestRequirement.value)) {
      // Complete the harvest
      const harvestId = totalHarvestsCompleted.value
      const pointsAwarded = calculateHarvestPoints(harvestId)

      // Add the harvest to history
      harvests.value.push({
        id: harvestId,
        seedRequirement: nextHarvestRequirement.value,
        completed: true,
        pointsAwarded: pointsAwarded,
        season: currentSeason.value,
      })

      // Update counters
      totalHarvestsCompleted.value++
      harvestsCompletedThisSeason.value++
      seasonHarvestCounter.value++

      // Save the game after completing a harvest
      persistenceStore.saveGame()

      return 1 // Return 1 harvest completed
    }

    return 0 // No harvests completed
  }

  // Perform prestige (start a new season)
  const prestige = () => {
    if (!canPrestige.value) return false

    // Calculate total prestige points to award based on harvests completed this season
    let pointsToAward = 0
    for (let i = 0; i < harvestsCompletedThisSeason.value; i++) {
      pointsToAward += calculateHarvestPoints(totalHarvestsCompleted.value - harvestsCompletedThisSeason.value + i)
    }

    // Award prestige points
    prestigePoints.value += pointsToAward
    totalPrestigePoints.value += pointsToAward

    // Increment season
    currentSeason.value++

    // Reset harvests completed this season
    harvestsCompletedThisSeason.value = 0

    // Reset game state
    resetGameState()

    // Save the game after prestige
    persistenceStore.forceSave()

    return true
  }

  // Reset game state for a new season
  const resetGameState = () => {
    // Reset the season harvest counter
    seasonHarvestCounter.value = 0

    // Check for starting seeds upgrade
    let startingSeeds = new Decimal(0)
    const startingSeedsUpgrade = prestigeUpgrades.value.find(u => u.id === 1)
    if (startingSeedsUpgrade && startingSeedsUpgrade.level > 0) {
      // Find the upgrade definition
      const upgrade = availablePrestigeUpgrades.value.find(u => u.id === 1)
      if (upgrade) {
        // Find the starting seeds effect
        const effect = upgrade.effects.find(e => e.type === 'starting_seeds') as StartingSeedsEffect
        if (effect) {
          startingSeeds = new Decimal(effect.getSeedsAmount(startingSeedsUpgrade.level))
        }
      }
    }

    // Reset seeds (with potential starting bonus)
    coreStore.seeds = startingSeeds

    // Reset tick counter
    coreStore.resetTickCounter()

    // Get farmStore only when needed
    const farmStore = getFarmStore()

    // Reset farms (keep the first farm)
    if (farmStore && farmStore.farms) {
      farmStore.farms.forEach((farm: Farm, index: number) => {
        if (index === 0) {
          // Keep first farm but reset to 1
          farm.manuallyPurchased = new Decimal(1)
          farm.totalOwned = new Decimal(1)
          farm.owned = true
        } else {
          // Reset other farms
          farm.manuallyPurchased = new Decimal(0)
          farm.totalOwned = new Decimal(0)
          farm.owned = false
        }
      })
    }

    // Reset machines
    machineStore.machines.forEach((machine, index) => {
      if (index === 0) {
        // Keep first machine but reset level
        machine.level = 1
        machine.points = 0
        machine.totalTicksForCurrentLevel = 0
        machine.unlocked = true

        // Reset upgrades
        machine.upgrades.forEach(upgrade => {
          upgrade.level = 0
        })
      } else {
        // Reset other machines
        machine.level = 1
        machine.points = 0
        machine.totalTicksForCurrentLevel = 0
        machine.unlocked = false

        // Reset upgrades
        machine.upgrades.forEach(upgrade => {
          upgrade.level = 0
        })
      }
    })

    // Update multipliers
    machineStore.updateMultipliers()
    if (farmStore && typeof farmStore.updateFarmMultipliers === 'function') {
      farmStore.updateFarmMultipliers()
    }
    applyAllPrestigeEffects()
  }

  // Initialize the store
  const initialize = () => {
    // Apply all prestige effects
    applyAllPrestigeEffects()
  }

  // Call initialize when the store is created
  initialize()

  return {
    currentSeason,
    prestigePoints,
    totalPrestigePoints,
    harvests,
    harvestsCompletedThisSeason,
    totalHarvestsCompleted,
    seasonHarvestCounter,
    harvestsRequired,
    canPrestige,
    nextHarvestRequirement,
    harvestProgress,
    checkHarvests,
    prestige,
    initialize,
    prestigeUpgrades,
    availablePrestigeUpgrades,
    prestigeMultipliers,
    updatePrestigeMultiplier,
    getUpgradeLevel,
    updateUpgradeLevel,
    applyAllPrestigeEffects,
    autoBuyers,
    processAutoBuyers,
  }
})
