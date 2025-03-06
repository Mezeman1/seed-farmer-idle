import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import Decimal from 'break_infinity.js'
import { useCoreStore } from './coreStore'
import { useMachineStore } from './machineStore'
import { usePersistenceStore } from './persistenceStore'
import { useSeasonStore } from './seasonStore'
import { FARMS } from '@/config/farmConfig'
import type { FarmConfig } from '@/config/farmConfig'

export interface Farm {
  id: number
  name: string
  manuallyPurchased: Decimal
  totalOwned: Decimal
  baseCost: Decimal
  baseProduction: Decimal
  owned: boolean
  multiplier: Decimal
  // Cost formula parameters
  costMultiplier: number
  costBase: number
  costLinear: number
  costThreshold1: number
  costThreshold2?: number
  costScalingFactor1: number
  costScalingFactor2?: number
  // What this farm produces
  producesResource: 'seeds' | 'farm' // 'seeds' for the first farm, 'farm' for others
  producesFarmId?: number // The ID of the farm this farm produces (if producesResource is 'farm')
}

export const useFarmStore = defineStore('farm', () => {
  // References to other stores
  const coreStore = useCoreStore()
  const persistenceStore = usePersistenceStore()
  const seasonStore = useSeasonStore()

  // Convert farm config to Farm interface
  const createFarmFromConfig = (config: FarmConfig): Farm => {
    return {
      id: config.id,
      name: config.name,
      manuallyPurchased: new Decimal(config.id === 0 ? 1 : 0), // First farm starts with 1
      totalOwned: new Decimal(config.id === 0 ? 1 : 0), // First farm starts with 1
      baseCost: new Decimal(config.baseCost),
      baseProduction: new Decimal(config.baseProduction),
      owned: config.id === 0, // First farm is already owned
      multiplier: new Decimal(1), // Default multiplier is 1
      costMultiplier: config.costMultiplier,
      costBase: config.costBase,
      costLinear: config.costLinear,
      costThreshold1: config.costThreshold1,
      costThreshold2: config.costThreshold2,
      costScalingFactor1: config.costScalingFactor1,
      costScalingFactor2: config.costScalingFactor2,
      producesResource: config.producesResource,
      producesFarmId: config.producesFarmId,
    }
  }

  // Farm state - dynamically created from config
  const farms = ref<Farm[]>(FARMS.map(createFarmFromConfig))

  // Calculate production for each farm
  const calculateProduction = (farmId: number): Decimal => {
    const farm = farms.value[farmId]
    // Apply the farm's multiplier to its production
    return farm.baseProduction.mul(farm.totalOwned).mul(farm.multiplier)
  }

  // Get the name of what a farm produces
  const getProductionResourceName = (farmId: number): string => {
    const farm = farms.value[farmId]

    if (farm.producesResource === 'seeds') {
      return 'seeds'
    } else if (farm.producesResource === 'farm' && farm.producesFarmId !== undefined) {
      return farms.value[farm.producesFarmId].name
    }

    return 'unknown'
  }

  // Update farm multipliers based on machine upgrades and prestige upgrades
  const updateFarmMultipliers = () => {
    farms.value.forEach((farm, index) => {
      // Base multiplier is 1
      let multiplier = new Decimal(1)

      // Apply machine multipliers from core store
      const farmKey = `farm${index}`
      if (coreStore.multipliers[farmKey]) {
        multiplier = multiplier.mul(coreStore.multipliers[farmKey])
      }

      // Apply prestige multipliers for all farms
      if (seasonStore.prestigeMultipliers[farmKey]) {
        multiplier = multiplier.mul(seasonStore.prestigeMultipliers[farmKey])
      }

      // Update the farm's multiplier
      farm.multiplier = multiplier
    })
  }

  // Watch for changes in multipliers
  watch(
    () => ({ ...coreStore.multipliers }),
    () => {
      updateFarmMultipliers()
    },
    { deep: true }
  )

  // Calculate cost to buy a farm using the CIFI formulas
  const calculateFarmCost = (farmId: number): Decimal => {
    const farm = farms.value[farmId]

    let cost: Decimal

    // If this is the first purchase, use the base cost
    if (farm.manuallyPurchased.eq(0)) {
      cost = new Decimal(farm.costMultiplier)
    } else {
      // Calculate the scaling factor based on thresholds
      let scalingFactor = new Decimal(1)
      if (farm.manuallyPurchased.gt(farm.costThreshold1)) {
        scalingFactor = new Decimal(1).add(
          farm.manuallyPurchased.sub(farm.costThreshold1).max(0).div(farm.costScalingFactor1)
        )
      }

      // Calculate the exponent: x * (1 + scaling_factor)
      const exponent = farm.manuallyPurchased.mul(scalingFactor)

      // Calculate the base: (costBase + costLinear * x)
      const base = new Decimal(farm.costBase).add(new Decimal(farm.costLinear).mul(farm.manuallyPurchased))

      // Calculate the final cost: costMultiplier * base^exponent
      cost = new Decimal(farm.costMultiplier).mul(base.pow(exponent))
    }

    // Apply cost reduction if available from prestige upgrades
    // Always check for cost reduction, even for the first purchase
    const costReductionKey = `farm${farmId}CostReduction`
    if (seasonStore.prestigeMultipliers[costReductionKey] && seasonStore.prestigeMultipliers[costReductionKey].gt(1)) {
      // Divide the cost by the reduction multiplier
      return cost.div(seasonStore.prestigeMultipliers[costReductionKey])
    }

    return cost
  }

  // Buy a farm
  const buyFarm = (farmId: number): boolean => {
    const farm = farms.value[farmId]
    const cost = calculateFarmCost(farmId)

    if (coreStore.removeSeeds(cost)) {
      farm.manuallyPurchased = farm.manuallyPurchased.add(1)
      farm.totalOwned = farm.totalOwned.add(1)
      farm.owned = true

      // Force an immediate update of the production display
      const _ = calculateProduction(farmId)

      // Save the game after purchase
      persistenceStore.saveGame()

      return true
    }

    return false
  }

  // Process farm production during a tick
  const processFarmProduction = () => {
    // Process farms in reverse order (higher tiers first)
    // This ensures that production from higher tier farms is added to lower tier farms
    // before calculating seed production
    for (let i = farms.value.length - 1; i >= 0; i--) {
      const farm = farms.value[i]

      if (farm.owned && farm.totalOwned.gt(0)) {
        const production = calculateProduction(i)

        if (farm.producesResource === 'seeds') {
          // Farm produces seeds
          coreStore.addSeeds(production)
        } else if (farm.producesResource === 'farm' && farm.producesFarmId !== undefined) {
          // Farm produces another farm
          const targetFarm = farms.value[farm.producesFarmId]
          targetFarm.totalOwned = targetFarm.totalOwned.add(production)
        }
      }
    }
  }

  // Calculate total seeds produced per tick
  const calculateTotalSeedsPerTick = (): Decimal => {
    let totalSeedsPerTick = new Decimal(0)

    // Find all farms that produce seeds directly
    farms.value.forEach(farm => {
      if (farm.owned && farm.totalOwned.gt(0) && farm.producesResource === 'seeds') {
        totalSeedsPerTick = totalSeedsPerTick.add(calculateProduction(farm.id))
      }
    })

    return totalSeedsPerTick
  }

  return {
    farms,
    calculateProduction,
    calculateFarmCost,
    buyFarm,
    processFarmProduction,
    calculateTotalSeedsPerTick,
    updateFarmMultipliers,
    getProductionResourceName,
  }
})
