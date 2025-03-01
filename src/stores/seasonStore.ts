import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Decimal from 'break_infinity.js'
import { useCoreStore } from './coreStore'
import { useFarmStore } from './farmStore'
import { useMachineStore } from './machineStore'
import { useTickStore } from './tickStore'
import { usePersistenceStore } from './persistenceStore'

// Interface for a harvest
export interface Harvest {
  id: number
  seedRequirement: Decimal
  completed: boolean
  pointsAwarded: number
  season: number
}

// Interface for prestige upgrades
export interface PrestigeUpgradeSave {
  id: number
  level: number
}

export const useSeasonStore = defineStore('season', () => {
  // References to other stores
  const coreStore = useCoreStore()
  const farmStore = useFarmStore()
  const machineStore = useMachineStore()
  const tickStore = useTickStore()
  const persistenceStore = usePersistenceStore()

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
    harvestRequirement: new Decimal(1), // Harvest requirement multiplier from prestige
  })

  // Update a prestige multiplier
  const updatePrestigeMultiplier = (key: string, value: number | Decimal) => {
    // Convert value to Decimal if it's a number
    const decimalValue = typeof value === 'number' ? new Decimal(value) : value
    prestigeMultipliers.value[key] = decimalValue

    // Apply the multiplier to the appropriate game element
    if (key.startsWith('farm')) {
      const farmIndex = parseInt(key.substring(4))
      farmStore.updateFarmMultipliers()
    }
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
    return 1
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
        season: currentSeason.value
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
      startingSeeds = new Decimal(10).pow(startingSeedsUpgrade.level)
    }

    // Reset seeds (with potential starting bonus)
    coreStore.seeds = startingSeeds

    // Reset tick counter
    coreStore.resetTickCounter()

    // Reset farms (keep the first farm)
    farmStore.farms.forEach((farm, index) => {
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
    farmStore.updateFarmMultipliers()
  }

  // Initialize the store
  const initialize = () => {
    // Nothing to initialize here since harvests are generated dynamically
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
    prestigeMultipliers,
    updatePrestigeMultiplier,
  }
})
