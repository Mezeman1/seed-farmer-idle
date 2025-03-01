import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Decimal from 'break_infinity.js'
import { useCoreStore } from './coreStore'
import { useMachineStore } from './machineStore'
import { useTickStore } from './tickStore'
import { usePersistenceStore } from './persistenceStore'
// Import the farmStore normally but use it carefully to avoid circular dependency issues
import { useFarmStore } from './farmStore'
// Import farm configuration
import { FARMS, generateAutoBuyerUpgrade } from '@/config/farmConfig'

// Interface for a harvest
export interface Harvest {
  id: number
  seedRequirement: Decimal
  completed: boolean
  pointsAwarded: Decimal
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

// Tick speed effect
export interface TickSpeedEffect extends PrestigeEffect {
  type: 'tick_speed'
  getTickSpeedReduction: (level: number) => number
}

export interface ExtendedUpgrade extends PrestigeUpgrade {
  level: number
  getNextLevelCost: () => number
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
  isVisible?: (context: any) => boolean
  category: 'Production' | 'Season' | 'Harvest' | 'Auto-Buyers' | 'Speed'
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

// Helper function to create initial multipliers object
const createInitialMultipliers = () => {
  const multipliers: { [key: string]: Decimal } = {
    harvestRequirement: new Decimal(1),
    harvestPoints: new Decimal(1),
  }

  // Add farm multipliers
  FARMS.forEach(farm => {
    multipliers[`farm${farm.id}`] = new Decimal(1)
  })

  return multipliers
}

// Helper function to create initial auto-buyers object
const createInitialAutoBuyers = () => {
  const autoBuyers: { [key: string]: number } = {}

  // Add auto-buyers for each farm
  FARMS.forEach(farm => {
    autoBuyers[`farm${farm.id}`] = 0
  })

  return autoBuyers
}

// Helper function to create initial auto-buyers enabled object
const createInitialAutoBuyersEnabled = () => {
  const autoBuyersEnabled: { [key: string]: boolean } = {}

  // Add auto-buyers enabled state for each farm
  FARMS.forEach(farm => {
    autoBuyersEnabled[`farm${farm.id}`] = true // Enabled by default
  })

  return autoBuyersEnabled
}

export const useSeasonStore = defineStore('season', () => {
  // References to other stores
  const coreStore = useCoreStore()
  const machineStore = useMachineStore()
  const tickStore = useTickStore()
  const persistenceStore = usePersistenceStore()
  // We'll get farmStore when needed instead of at initialization

  // Season state
  const currentSeason = ref<Decimal>(new Decimal(1))
  const prestigePoints = ref<Decimal>(new Decimal(0))
  const totalPrestigePoints = ref<Decimal>(new Decimal(0))
  const harvests = ref<Harvest[]>([])
  const baseHarvestRequirement = ref<Decimal>(new Decimal(1000)) // Base requirement for first harvest

  // Important: This is the total harvests ever completed across all seasons
  // It should never be reset during prestige or game resets
  const totalHarvestsCompleted = ref<Decimal>(new Decimal(0))

  const harvestsCompletedThisSeason = ref<Decimal>(new Decimal(0)) // Harvests completed in current season
  const seasonHarvestCounter = ref<Decimal>(new Decimal(0)) // Tracks harvests within the current season for requirement calculation

  // Prestige upgrades state
  const prestigeUpgrades = ref<PrestigeUpgradeSave[]>([])
  const prestigeMultipliers = ref<{ [key: string]: Decimal }>(createInitialMultipliers())

  // Auto-buyers state (separate from multipliers since they're not decimal values)
  const autoBuyers = ref<{ [key: string]: number }>(createInitialAutoBuyers())

  // Auto-buyers enabled state
  const autoBuyersEnabled = ref<{ [key: string]: boolean }>(createInitialAutoBuyersEnabled())

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
      category: 'Production',
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
      category: 'Season',
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
      category: 'Harvest',
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
      category: 'Production',
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
      category: 'Harvest',
    },
    {
      id: 9,
      name: 'Harvest Points Multiplier',
      description: 'Increases prestige points earned from each harvest by 10% per level',
      baseCost: 7,
      costScaling: 1.5,
      maxLevel: null, // No maximum level
      effects: [
        {
          type: 'harvest_points',
          getPointsMultiplier: (level: number) => 1 + level * 0.1, // 10% increase per level
          apply: (level: number, context: any) => {
            if (level <= 0) return
            // Get current multiplier and multiply by the new one
            const currentMultiplier = context.multipliers['harvestPoints'] || new Decimal(1)
            context.multipliers['harvestPoints'] = currentMultiplier.mul(1 + level * 0.1)
          },
          getDescription: (level: number) => `+${(level * 10).toFixed(0)}% harvest points`,
        } as HarvestPointsEffect,
      ],
      getEffectDisplay: (level: number, context: any) => {
        if (level === 0) return 'No effect yet'
        return `+${(level * 10).toFixed(0)}% prestige points per harvest`
      },
      category: 'Harvest',
    },
    {
      id: 10,
      name: 'Faster Ticks I',
      description: 'Reduces the tick duration by 0.1 seconds per level',
      baseCost: 25,
      costScaling: 2,
      maxLevel: 10,
      effects: [
        {
          type: 'tick_speed',
          getTickSpeedReduction: (level: number) => level * 0.1,
          apply: (level: number, context: any) => {
            if (level <= 0) return
            // Get the tickStore
            const tickStore = useTickStore()
            // Calculate new tick duration (base is 10 seconds)
            const baseDuration = 10
            const reduction = level * 0.1
            // Ensure we don't go below 1 second
            const newDuration = Math.max(1, baseDuration - reduction)
            // Set the new tick duration
            tickStore.setTickDuration(newDuration)
          },
          getDescription: (level: number) => `-${(level * 0.1).toFixed(1)} seconds per tick`,
        } as TickSpeedEffect,
      ],
      getEffectDisplay: (level: number, context: any) => {
        if (level === 0) return 'No effect yet'
        return `Tick duration reduced by ${(level * 0.1).toFixed(1)} seconds`
      },
      category: 'Speed',
    },
    {
      id: 11,
      name: 'Faster Ticks II',
      description: 'Further reduces the tick duration by 0.1 seconds per level',
      baseCost: 100,
      costScaling: 3,
      maxLevel: 10,
      // This upgrade is only visible when Faster Ticks I is maxed out
      isVisible: (context: any) => {
        const fasterTicks1Level = context.getUpgradeLevel(10)
        return fasterTicks1Level >= 10
      },
      effects: [
        {
          type: 'tick_speed',
          getTickSpeedReduction: (level: number) => level * 0.1,
          apply: (level: number, context: any) => {
            if (level <= 0) return
            // Get the tickStore
            const tickStore = useTickStore()
            // Calculate new tick duration (base is 10 seconds, minus 1 second from Faster Ticks I)
            const baseDuration = 9
            const reduction = level * 0.1
            // Ensure we don't go below 0.5 seconds
            const newDuration = Math.max(0.5, baseDuration - reduction)
            // Set the new tick duration
            tickStore.setTickDuration(newDuration)
          },
          getDescription: (level: number) => `-${(level * 0.1).toFixed(1)} seconds per tick`,
        } as TickSpeedEffect,
      ],
      getEffectDisplay: (level: number, context: any) => {
        if (level === 0) return 'No effect yet'
        return `Tick duration further reduced by ${(level * 0.1).toFixed(1)} seconds`
      },
      category: 'Speed',
    },
    // Dynamically add auto-buyer upgrades from farm config
    ...FARMS.map(farm => generateAutoBuyerUpgrade(farm)),
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
    prestigeMultipliers.value = createInitialMultipliers()

    // Reset auto-buyers to default values
    autoBuyers.value = createInitialAutoBuyers()

    // Context for applying effects
    const context = {
      multipliers: prestigeMultipliers.value,
      autoBuyers: autoBuyers.value,
      season: currentSeason.value.toNumber(),
      getUpgradeLevel: getUpgradeLevel,
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
    const season = currentSeason.value.toNumber() - 1 // Adjust to 0-indexed for calculation

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

    return required.ceil()
  })

  const canPrestige = computed(() => new Decimal(harvestsCompletedThisSeason.value).gte(harvestsRequired.value))

  const nextHarvestRequirement = computed(() => {
    // Get the next harvest ID (total completed + 1)
    const nextHarvestId = totalHarvestsCompleted.value.toNumber()
    return calculateHarvestRequirement(nextHarvestId)
  })

  const harvestProgress = computed(() => {
    if (coreStore.seeds.eq(0) || nextHarvestRequirement.value.eq(0)) return 0

    // Calculate progress as a percentage of current seeds toward the next harvest requirement
    const progress = coreStore.seeds.div(nextHarvestRequirement.value).toNumber()
    return Math.min(progress, 1) * 100 // Return as percentage, capped at 100%
  })

  // Calculate the seed requirement for a harvest based on its ID
  const calculateHarvestRequirement = (harvestId: number): Decimal => {
    // Get the base requirement for the current season
    // Scale the base requirement with the season number: 1000 * (2^(season-1))
    const seasonBaseRequirement = baseHarvestRequirement.value.mul(
      new Decimal(2).pow(Math.max(0, currentSeason.value.toNumber() - 1))
    )

    // Calculate requirement based on the harvest counter within this season
    // Formula: seasonBaseRequirement * (1.5^seasonHarvestCounter) * harvestRequirementMultiplier
    const baseReq = seasonBaseRequirement.mul(new Decimal(1.5).pow(seasonHarvestCounter.value.toNumber()))

    // Apply harvest efficiency multiplier if it exists
    return baseReq.mul(prestigeMultipliers.value.harvestRequirement)
  }

  // Calculate points awarded for a harvest
  const calculateHarvestPoints = (harvestId: number): Decimal => {
    // Base points is 1, but can scale with harvest ID or other factors
    const basePoints = new Decimal(1)

    // Apply harvest points multiplier if it exists
    const pointsMultiplier = prestigeMultipliers.value.harvestPoints || new Decimal(1)

    return basePoints.mul(pointsMultiplier).floor()
  }

  // Process auto-buyers during a tick
  const processAutoBuyers = () => {
    // Get farmStore only when needed
    const farmStore = getFarmStore()
    if (!farmStore) return

    // Process all auto-buyers
    Object.entries(autoBuyers.value).forEach(([farmKey, level]) => {
      if (level <= 0) return

      // Skip if auto-buyer is disabled
      if (!autoBuyersEnabled.value[farmKey]) return

      const farmIndex = parseInt(farmKey.replace('farm', ''))

      // Try to buy the farm 'level' times
      for (let i = 0; i < level; i++) {
        farmStore.buyFarm(farmIndex)
      }
    })
  }

  // Check if auto-buyer is enabled for a farm
  const isAutoBuyerEnabled = (farmIndex: number): boolean => {
    const farmKey = `farm${farmIndex}`
    return !!autoBuyersEnabled.value[farmKey]
  }

  // Set auto-buyer enabled state for a farm
  const setAutoBuyerEnabled = (farmIndex: number, enabled: boolean): void => {
    const farmKey = `farm${farmIndex}`
    autoBuyersEnabled.value[farmKey] = enabled
  }

  // Check for harvest completion during a tick
  const checkHarvests = () => {
    // Check if we can complete a harvest
    if (coreStore.seeds.gte(nextHarvestRequirement.value)) {
      // Complete the harvest
      const harvestId = totalHarvestsCompleted.value.toNumber()
      const pointsAwarded = calculateHarvestPoints(harvestId)

      // Add the harvest to history
      harvests.value.push({
        id: harvestId,
        seedRequirement: nextHarvestRequirement.value,
        completed: true,
        pointsAwarded: pointsAwarded,
        season: currentSeason.value.toNumber(),
      })

      // Update counters
      totalHarvestsCompleted.value = totalHarvestsCompleted.value.add(new Decimal(1))
      harvestsCompletedThisSeason.value = harvestsCompletedThisSeason.value.add(new Decimal(1))
      seasonHarvestCounter.value = seasonHarvestCounter.value.add(new Decimal(1))

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
    let pointsToAward = new Decimal(0)
    for (let i = 0; i < harvestsCompletedThisSeason.value.toNumber(); i++) {
      pointsToAward = pointsToAward.add(
        calculateHarvestPoints(
          totalHarvestsCompleted.value.toNumber() - harvestsCompletedThisSeason.value.toNumber() + i
        )
      )
    }

    // Award prestige points
    prestigePoints.value = prestigePoints.value.add(pointsToAward)
    totalPrestigePoints.value = totalPrestigePoints.value.add(pointsToAward)

    // Increment season
    currentSeason.value = currentSeason.value.add(new Decimal(1))

    // Reset harvests completed this season
    harvestsCompletedThisSeason.value = new Decimal(0)

    // Reset game state
    resetGameState()

    // Save the game after prestige
    persistenceStore.forceSave()

    return true
  }

  // Reset the game state for a new season
  const resetGameState = () => {
    // Reset the season harvest counter
    seasonHarvestCounter.value = new Decimal(0)

    // Reset the harvests array to clear the history
    harvests.value = []

    // Reset harvests completed this season
    harvestsCompletedThisSeason.value = new Decimal(0)

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

    // Apply all prestige effects (including tick speed)
    applyAllPrestigeEffects()
  }

  // Initialize the store
  const initialize = () => {
    // Store the current values to restore them after applying effects
    const currentTotalHarvests = totalHarvestsCompleted.value.toString()
    const currentPrestigePoints = prestigePoints.value.toString()
    const currentTotalPrestigePoints = totalPrestigePoints.value.toString()

    // Apply all prestige effects
    applyAllPrestigeEffects()

    // Check if the values were reset and restore them if needed
    if (currentTotalHarvests !== '0' && totalHarvestsCompleted.value.toString() === '0') {
      totalHarvestsCompleted.value = new Decimal(currentTotalHarvests)
    }

    if (currentPrestigePoints !== '0' && prestigePoints.value.toString() === '0') {
      prestigePoints.value = new Decimal(currentPrestigePoints)
    }

    if (currentTotalPrestigePoints !== '0' && totalPrestigePoints.value.toString() === '0') {
      totalPrestigePoints.value = new Decimal(currentTotalPrestigePoints)
    }
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
    autoBuyersEnabled,
    processAutoBuyers,
    isAutoBuyerEnabled,
    setAutoBuyerEnabled,
  }
})
